"""
FastAPI backend for Revenue Forecasting Dashboard.
Serves historical data, forecast data, CAGR config, and triggers forecast runs.
Includes data quality & management: upload, validation, audit logs, cleaning, scheduler.
"""

import io
import json
import asyncio
import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------- Config ----------

BASE_DIR = Path(__file__).resolve().parent
HISTORICAL_CSV = BASE_DIR / "Revenue_Sales_with_datetime 1.csv"
CLIMATE_CSV = BASE_DIR / "kuppam_climate_approx 2.csv"
FORECAST_CSV = BASE_DIR / "outputs" / "New_Load_Forecast.csv"
CAGR_CONFIG = BASE_DIR / "outputs" / "cagr_config.json"
AUDIT_LOG_FILE = BASE_DIR / "outputs" / "audit_log.json"
UPLOADS_DIR = BASE_DIR / "uploads"
RA2_SCRIPT = BASE_DIR / "ra2.py"

DEFAULT_CAGR = 0.04
DEFAULT_HORIZON = 60

# Expected schema columns for the historical CSV (required subset)
REQUIRED_COLUMNS = {"FY", "Month", "Month_num", "Total"}
NUMERIC_COLUMNS = ["Total", "kWh"] + [f"L{i}" for i in range(1, 12)]

# Outlier detection: values beyond IQR_FACTOR * IQR are flagged
IQR_FACTOR = 3.0

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------- Category mapping ----------

CATEGORY_MAP = {
    "residential": ["L1"],
    "commercial": ["L2"],
    "industrial": ["L3", "L4"],
    "agriculture": ["L5"],
    "others": ["L6", "L7", "L8", "L9", "L10", "L11"],
}


def apply_category_mapping(row: dict, available_cols: list[str]) -> dict:
    """Sum source columns into category groups."""
    result = {}
    for category, source_cols in CATEGORY_MAP.items():
        vals = [row.get(c, 0) or 0 for c in source_cols if c in available_cols]
        result[category] = sum(vals)
    return result


# ---------- CAGR persistence ----------

def read_cagr_config() -> dict:
    """Read CAGR config from JSON file, or return defaults."""
    if CAGR_CONFIG.exists():
        with open(CAGR_CONFIG, "r") as f:
            return json.load(f)
    return {"cagr": DEFAULT_CAGR, "horizon": DEFAULT_HORIZON}


def write_cagr_config(cagr: float, horizon: int):
    """Write CAGR config to JSON file."""
    CAGR_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    with open(CAGR_CONFIG, "w") as f:
        json.dump({"cagr": cagr, "horizon": horizon}, f, indent=2)


# ---------- Audit log ----------

def _load_audit_log() -> list:
    AUDIT_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    if AUDIT_LOG_FILE.exists():
        with open(AUDIT_LOG_FILE, "r") as f:
            return json.load(f)
    return []


def _save_audit_log(entries: list):
    AUDIT_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(AUDIT_LOG_FILE, "w") as f:
        json.dump(entries, f, indent=2, default=str)


def add_audit_entry(action: str, details: str, user: str = "system", status: str = "success"):
    """Append a timestamped entry to the audit log."""
    entries = _load_audit_log()
    entries.append({
        "id": len(entries) + 1,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "details": details,
        "user": user,
        "status": status,
    })
    _save_audit_log(entries)


# ---------- Data validation ----------

def validate_dataframe(df: pd.DataFrame) -> dict:
    """
    Validate a DataFrame against the expected schema.
    Returns a dict with keys: errors, warnings, info, row_count, missing_counts, outliers.
    """
    errors = []
    warnings = []
    info = []

    # Schema check
    missing_required = REQUIRED_COLUMNS - set(df.columns)
    if missing_required:
        errors.append(f"Missing required columns: {', '.join(sorted(missing_required))}")

    if errors:
        return {"errors": errors, "warnings": warnings, "info": info,
                "row_count": len(df), "missing_counts": {}, "outliers": []}

    # Missing value check
    missing_counts = {}
    for col in df.columns:
        n_missing = int(df[col].isna().sum())
        if n_missing > 0:
            missing_counts[col] = n_missing
            pct = n_missing / len(df) * 100
            if pct > 20:
                warnings.append(f"Column '{col}' has {n_missing} missing values ({pct:.1f}%)")
            else:
                info.append(f"Column '{col}' has {n_missing} missing values ({pct:.1f}%)")

    # Numeric range / outlier check using IQR
    outliers = []
    numeric_cols_present = [c for c in NUMERIC_COLUMNS if c in df.columns]
    for col in numeric_cols_present:
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(series) < 4:
            continue
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            continue
        lower = q1 - IQR_FACTOR * iqr
        upper = q3 + IQR_FACTOR * iqr
        flagged = df[(pd.to_numeric(df[col], errors="coerce") < lower) |
                     (pd.to_numeric(df[col], errors="coerce") > upper)]
        if not flagged.empty:
            outliers.append({
                "column": col,
                "count": int(len(flagged)),
                "lower_bound": float(lower),
                "upper_bound": float(upper),
            })
            warnings.append(
                f"Column '{col}' has {len(flagged)} potential outlier(s) "
                f"(outside [{lower:.2f}, {upper:.2f}])"
            )

    # Negative value check for numeric columns
    for col in numeric_cols_present:
        series = pd.to_numeric(df[col], errors="coerce")
        n_neg = int((series < 0).sum())
        if n_neg > 0:
            warnings.append(f"Column '{col}' has {n_neg} negative value(s)")

    info.append(f"Dataset has {len(df)} rows and {len(df.columns)} columns")

    return {
        "errors": errors,
        "warnings": warnings,
        "info": info,
        "row_count": len(df),
        "missing_counts": missing_counts,
        "outliers": outliers,
    }


# ---------- Data cleaning ----------

def clean_dataframe(df: pd.DataFrame, strategy: str = "median") -> tuple[pd.DataFrame, list[str]]:
    """
    Apply basic cleaning: fill missing values in numeric columns.
    strategy: 'median' | 'mean' | 'zero' | 'drop'
    Returns (cleaned_df, list_of_actions).
    """
    actions = []
    df = df.copy()

    numeric_cols = [c for c in NUMERIC_COLUMNS if c in df.columns]

    if strategy == "drop":
        before = len(df)
        df = df.dropna(subset=numeric_cols)
        dropped = before - len(df)
        if dropped:
            actions.append(f"Dropped {dropped} rows with missing numeric values")
    else:
        for col in numeric_cols:
            n_missing = int(df[col].isna().sum())
            if n_missing == 0:
                continue
            if strategy == "mean":
                fill_val = df[col].mean()
            elif strategy == "zero":
                fill_val = 0
            else:  # median (default)
                fill_val = df[col].median()
            df[col] = df[col].fillna(fill_val)
            actions.append(
                f"Filled {n_missing} missing values in '{col}' with {strategy} ({fill_val:.4f})"
            )

    return df, actions


# ---------- In-memory cache of historical data ----------

_historical_cache: Optional[pd.DataFrame] = None


def load_historical() -> pd.DataFrame:
    """Load historical CSV, refreshing the in-memory cache."""
    global _historical_cache
    if not HISTORICAL_CSV.exists():
        raise FileNotFoundError("Historical CSV not found")
    _historical_cache = pd.read_csv(HISTORICAL_CSV)
    return _historical_cache


def get_cached_historical() -> Optional[pd.DataFrame]:
    """Return cached DataFrame, loading it if necessary."""
    global _historical_cache
    if _historical_cache is None and HISTORICAL_CSV.exists():
        _historical_cache = pd.read_csv(HISTORICAL_CSV)
    return _historical_cache


# ---------- Scheduler ----------

async def scheduled_refresh():
    """Reload historical data from disk on a schedule."""
    try:
        load_historical()
        add_audit_entry("scheduled_refresh", "Periodic data refresh completed", user="scheduler")
        logger.info("Scheduled data refresh completed")
    except Exception as exc:
        add_audit_entry("scheduled_refresh", f"Refresh failed: {exc}", user="scheduler", status="error")
        logger.error("Scheduled refresh failed: %s", exc)


scheduler = AsyncIOScheduler()


# ---------- FastAPI app ----------

app = FastAPI(title="Revenue Forecasting API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    CAGR_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    load_historical()
    # Schedule a refresh every 6 hours
    scheduler.add_job(scheduled_refresh, "interval", hours=6, id="data_refresh")
    scheduler.start()
    logger.info("Scheduler started — data refresh every 6 hours")


@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown(wait=False)


# ---------- Pydantic models ----------

class CAGRUpdate(BaseModel):
    cagr: float = Field(..., gt=0, le=1, description="Cumulative growth rate (e.g. 0.04 for 4%)")
    horizon: int = Field(default=60, gt=0, le=120, description="Forecast horizon in months")


class RunForecastRequest(BaseModel):
    cagr: float | None = Field(default=None, gt=0, le=1)
    horizon: int | None = Field(default=None, gt=0, le=120)


class CleanRequest(BaseModel):
    strategy: str = Field(default="median", description="Cleaning strategy: median, mean, zero, drop")
    apply: bool = Field(default=False, description="If true, apply cleaning and overwrite historical CSV")


# ---------- Helpers ----------

def _df_to_records(df: pd.DataFrame) -> list[dict]:
    """Convert historical DataFrame to API records."""
    L_COLS = [f"L{i}" for i in range(1, 12)]
    available_l_cols = [c for c in L_COLS if c in df.columns]
    records = []
    for _, row in df.iterrows():
        row_dict = row.to_dict()
        mapped = apply_category_mapping(row_dict, available_l_cols)
        ef = float(row_dict.get("EF", 0)) if pd.notna(row_dict.get("EF")) else 0
        record = {
            "fy": row_dict.get("FY"),
            "month": row_dict.get("Month"),
            "month_num": int(row_dict.get("Month_num", 0)),
            "date": row_dict.get("Date"),
            **mapped,
            "total": row_dict.get("Total"),
            "kwh": row_dict.get("kWh"),
            "kvah": row_dict.get("kVAh") if pd.notna(row_dict.get("kVAh")) else None,
            "loss": row_dict.get("Loss") if pd.notna(row_dict.get("Loss")) else None,
            "loss_pct": row_dict.get("Loss %") if pd.notna(row_dict.get("Loss %")) else None,
            "ef": ef,
            "residential_tco2": mapped.get("residential", 0) * ef,
            "commercial_tco2": mapped.get("commercial", 0) * ef,
            "industrial_tco2": mapped.get("industrial", 0) * ef,
            "agriculture_tco2": mapped.get("agriculture", 0) * ef,
            "others_tco2": mapped.get("others", 0) * ef,
            "total_tco2": row_dict.get("Total", 0) * ef,
        }
        records.append(record)
    return records


# ---------- Endpoints ----------

@app.get("/api/historical")
def get_historical_data():
    """Return historical revenue data with category mapping, grouped by FY/month."""
    if not HISTORICAL_CSV.exists():
        raise HTTPException(status_code=404, detail="Historical CSV not found")
    df = get_cached_historical()
    if df is None:
        raise HTTPException(status_code=404, detail="Historical data not loaded")
    return {"data": _df_to_records(df)}


@app.get("/api/forecast")
def get_forecast_data():
    """Return forecast data with category mapping."""
    if not FORECAST_CSV.exists():
        raise HTTPException(
            status_code=404,
            detail="Forecast CSV not found. Run the forecast first via /api/run-forecast",
        )

    df = pd.read_csv(FORECAST_CSV)
    config = read_cagr_config()

    # Get last known EF from historical data
    last_ef = 0.0
    hist_df = get_cached_historical()
    if hist_df is not None and "EF" in hist_df.columns:
        valid_efs = hist_df["EF"].dropna()
        if len(valid_efs) > 0:
            last_ef = float(valid_efs.iloc[-1])

    L_COLS = [f"L{i}" for i in range(1, 12)]
    available_l_cols = [c for c in L_COLS if c in df.columns]

    records = []
    for _, row in df.iterrows():
        row_dict = row.to_dict()
        mapped = apply_category_mapping(row_dict, available_l_cols)
        record = {
            "date": row_dict.get("TestDates"),
            **mapped,
            "total": row_dict.get("Total"),
            "kwh": row_dict.get("kWh"),
            "ef": last_ef,
            "residential_tco2": mapped.get("residential", 0) * last_ef,
            "commercial_tco2": mapped.get("commercial", 0) * last_ef,
            "industrial_tco2": mapped.get("industrial", 0) * last_ef,
            "agriculture_tco2": mapped.get("agriculture", 0) * last_ef,
            "others_tco2": mapped.get("others", 0) * last_ef,
            "total_tco2": row_dict.get("Total", 0) * last_ef,
        }
        records.append(record)

    return {
        "data": records,
        "cagr": config["cagr"],
        "horizon_months": config["horizon"],
        "ef_used": last_ef,
    }


@app.get("/api/cagr")
def get_cagr():
    """Return current CAGR configuration."""
    return read_cagr_config()


@app.post("/api/cagr")
def update_cagr(body: CAGRUpdate):
    """Update CAGR configuration."""
    write_cagr_config(body.cagr, body.horizon)
    return {"message": "CAGR updated", "cagr": body.cagr, "horizon": body.horizon}


# Track whether a forecast is currently running
_forecast_lock = asyncio.Lock()


@app.post("/api/run-forecast")
async def run_forecast(body: RunForecastRequest | None = None):
    """
    Run ra2.py with the specified or stored CAGR value.
    Returns the result once the script completes.
    """
    if _forecast_lock.locked():
        raise HTTPException(status_code=409, detail="A forecast is already running")

    async with _forecast_lock:
        config = read_cagr_config()
        cgr = body.cagr if (body and body.cagr is not None) else config["cagr"]
        horizon = body.horizon if (body and body.horizon is not None) else config["horizon"]
        write_cagr_config(cgr, horizon)

        cmd = ["python3", str(RA2_SCRIPT), "--cgr", str(cgr), "--horizon", str(horizon)]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(BASE_DIR),
            )
            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                add_audit_entry(
                    "run_forecast",
                    f"Forecast failed CAGR={cgr} horizon={horizon}",
                    status="error",
                )
                return {
                    "status": "error",
                    "returncode": process.returncode,
                    "stderr": stderr.decode("utf-8", errors="replace")[-2000:],
                    "stdout": stdout.decode("utf-8", errors="replace")[-2000:],
                }

            add_audit_entry(
                "run_forecast",
                f"Forecast succeeded CAGR={cgr} horizon={horizon}",
            )
            return {
                "status": "success",
                "message": f"Forecast completed with CAGR={cgr}, horizon={horizon} months",
                "cagr": cgr,
                "horizon": horizon,
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to run forecast: {str(e)}")


# ---------- Data Refresh ----------

@app.post("/api/refresh")
def refresh_data():
    """Manually trigger a reload of historical data from disk."""
    try:
        df = load_historical()
        add_audit_entry("manual_refresh", f"Historical data reloaded — {len(df)} rows")
        return {"status": "success", "message": f"Reloaded {len(df)} rows from historical CSV"}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        add_audit_entry("manual_refresh", f"Refresh failed: {exc}", status="error")
        raise HTTPException(status_code=500, detail=str(exc))


# ---------- Upload ----------

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_FILE_SIZE_MB = 50


@app.post("/api/upload")
async def upload_data(
    file: UploadFile = File(...),
    target: str = Query(default="historical", description="Target dataset: 'historical'"),
    user: str = Query(default="anonymous", description="Username performing the upload"),
    apply_cleaning: bool = Query(default=False, description="Auto-clean missing values after upload"),
    cleaning_strategy: str = Query(default="median", description="Cleaning strategy: median, mean, zero, drop"),
):
    """
    Upload a CSV or Excel file to replace / append the historical dataset.
    Validates schema and data quality before saving.
    """
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_FILE_SIZE_MB} MB limit")

    # Parse
    try:
        if suffix == ".csv":
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {exc}")

    # Validate
    validation = validate_dataframe(df)
    if validation["errors"]:
        add_audit_entry(
            "upload",
            f"Upload rejected — validation errors: {'; '.join(validation['errors'])}",
            user=user,
            status="error",
        )
        return {
            "status": "error",
            "validation": validation,
            "message": "Upload rejected due to validation errors",
        }

    # Optionally clean
    cleaning_actions = []
    if apply_cleaning:
        df, cleaning_actions = clean_dataframe(df, strategy=cleaning_strategy)

    # Save uploaded file archive
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    archive_name = f"{timestamp}_{file.filename}"
    archive_path = UPLOADS_DIR / archive_name
    with open(archive_path, "wb") as fh:
        fh.write(content)

    # Replace historical CSV
    if target == "historical":
        df.to_csv(HISTORICAL_CSV, index=False)
        load_historical()  # refresh cache

    file_hash = hashlib.sha256(content).hexdigest()[:16]
    detail = (
        f"Uploaded '{file.filename}' ({len(df)} rows, sha256={file_hash}); "
        f"target={target}; cleaning={cleaning_actions}"
    )
    add_audit_entry("upload", detail, user=user)

    return {
        "status": "success" if not validation["warnings"] else "warning",
        "message": f"File uploaded and applied to '{target}' dataset ({len(df)} rows)",
        "validation": validation,
        "cleaning_actions": cleaning_actions,
        "rows": len(df),
        "columns": list(df.columns),
        "file_hash": file_hash,
    }


# ---------- Data Quality Check ----------

@app.get("/api/data-quality")
def get_data_quality():
    """Run quality checks on the current historical dataset and return a report."""
    df = get_cached_historical()
    if df is None:
        raise HTTPException(status_code=404, detail="Historical data not loaded")
    validation = validate_dataframe(df)
    return {"status": "ok", "report": validation}


# ---------- Data Cleaning ----------

@app.post("/api/clean")
def clean_historical(body: CleanRequest):
    """
    Preview or apply cleaning of the historical dataset.
    If apply=false (default), returns a preview of what would be changed.
    If apply=true, writes the cleaned data back to the CSV.
    """
    df = get_cached_historical()
    if df is None:
        raise HTTPException(status_code=404, detail="Historical data not loaded")

    cleaned_df, actions = clean_dataframe(df, strategy=body.strategy)

    if not actions:
        return {"status": "ok", "message": "No cleaning actions needed", "actions": []}

    if body.apply:
        cleaned_df.to_csv(HISTORICAL_CSV, index=False)
        load_historical()
        add_audit_entry(
            "clean",
            f"Applied cleaning (strategy={body.strategy}): {'; '.join(actions)}",
        )
        return {
            "status": "success",
            "message": f"Cleaned and saved {len(cleaned_df)} rows",
            "actions": actions,
        }

    # Preview mode
    return {
        "status": "preview",
        "message": "Preview only — set apply=true to commit changes",
        "actions": actions,
    }


# ---------- Audit Logs ----------

@app.get("/api/audit-logs")
def get_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    action: Optional[str] = Query(default=None, description="Filter by action type"),
):
    """Return paginated audit log entries, newest first."""
    entries = _load_audit_log()
    entries_sorted = list(reversed(entries))

    if action:
        entries_sorted = [e for e in entries_sorted if e.get("action") == action]

    total = len(entries_sorted)
    start = (page - 1) * page_size
    page_entries = entries_sorted[start: start + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "entries": page_entries,
    }


# ---------- Run ----------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
