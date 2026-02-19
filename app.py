"""
FastAPI backend for Revenue Forecasting Dashboard.
Serves historical data, forecast data, CAGR config, and triggers forecast runs.
"""

import os
import json
import asyncio
import subprocess
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------- Config ----------

BASE_DIR = Path(__file__).resolve().parent
HISTORICAL_CSV = BASE_DIR / "Revenue_Sales_with_datetime 1.csv"
CLIMATE_CSV = BASE_DIR / "kuppam_climate_approx 2.csv"
FORECAST_CSV = BASE_DIR / "outputs" / "New_Load_Forecast.csv"
CAGR_CONFIG = BASE_DIR / "outputs" / "cagr_config.json"
RA2_SCRIPT = BASE_DIR / "ra2.py"

DEFAULT_CAGR = 0.04
DEFAULT_HORIZON = 60

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


# ---------- FastAPI app ----------

app = FastAPI(title="Revenue Forecasting API", version="1.0.0")

origins = [
    "http://localhost:3000",  # local dev
    "https://kuppam-carbon-dashboard-22e7rdxbn-thesuneet7s-projects.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Pydantic models ----------

class CAGRUpdate(BaseModel):
    cagr: float = Field(..., gt=0, le=1, description="Cumulative growth rate (e.g. 0.04 for 4%)")
    horizon: int = Field(default=60, gt=0, le=120, description="Forecast horizon in months")


class RunForecastRequest(BaseModel):
    cagr: float | None = Field(default=None, gt=0, le=1)
    horizon: int | None = Field(default=None, gt=0, le=120)


# ---------- Endpoints ----------

@app.get("/api/historical")
def get_historical_data():
    """Return historical revenue data with category mapping, grouped by FY/month."""
    if not HISTORICAL_CSV.exists():
        raise HTTPException(status_code=404, detail="Historical CSV not found")

    df = pd.read_csv(HISTORICAL_CSV)

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

    return {"data": records}


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
    if HISTORICAL_CSV.exists():
        hist_df = pd.read_csv(HISTORICAL_CSV)
        if "EF" in hist_df.columns:
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
            "kwh": row_dict.get("kWh") if "kWh" in row_dict else row_dict.get("kWh"),
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
    config = read_cagr_config()
    return config


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
        # Determine CAGR and horizon values
        config = read_cagr_config()
        cgr = body.cagr if (body and body.cagr is not None) else config["cagr"]
        horizon = body.horizon if (body and body.horizon is not None) else config["horizon"]

        # Persist whatever we're using
        write_cagr_config(cgr, horizon)

        cmd = [
            "python3", str(RA2_SCRIPT),
            "--cgr", str(cgr),
            "--horizon", str(horizon),
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(BASE_DIR),
            )
            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                return {
                    "status": "error",
                    "returncode": process.returncode,
                    "stderr": stderr.decode("utf-8", errors="replace")[-2000:],
                    "stdout": stdout.decode("utf-8", errors="replace")[-2000:],
                }

            return {
                "status": "success",
                "message": f"Forecast completed with CAGR={cgr}, horizon={horizon} months",
                "cagr": cgr,
                "horizon": horizon,
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to run forecast: {str(e)}")


# ---------- Run ----------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
