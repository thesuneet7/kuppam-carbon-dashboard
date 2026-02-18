# -*- coding: utf-8 -*-
"""
Created on Sun Jan 18 19:56:25 2026

@author: navee
"""


import os
import sys
import argparse
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd

# Use non-interactive backend to avoid display errors on headless systems
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_percentage_error, mean_pinball_loss
from statsmodels.tsa.stattools import pacf 
from sklearn import linear_model

from datetime import datetime, timedelta


from statsmodels.tsa.seasonal import STL
from statsmodels.tsa.holtwinters import ExponentialSmoothing


def stl_holt_trend_forecast(trend: pd.Series, ForecastHorizon, period: int = 12,
                            stl_robust: bool = True):
    # 1) Extract trend via STL
    # If index isn't DateTime, STL still works with period
    stl = STL(trend.astype(float), period=period, robust=stl_robust)
    res = stl.fit()
    stl_trend = pd.Series(res.trend, index=trend.index)

    # 2) Holt linear trend forecast on the extracted trend
    model = ExponentialSmoothing(stl_trend, trend='add', seasonal=None)
    fit = model.fit(optimized=True)
    future = fit.forecast(ForecastHorizon)

    return stl_trend, future





def Forecasting_Func(Target,climate,Train,ForecastHorizon,Traindate,cgr):
    
    
    tr_Ind = int(np.where(climate['DateTime']==Traindate)[0])
   
        
    act_tr_Ind = tr_Ind
    
    Forecasts=np.zeros(ForecastHorizon)
        
    Step_size=12
    
    nSteps = int(ForecastHorizon/Step_size)
    
    ## Training
    
    Inputs = ['Tmax_C', 'Rain_mm', 'Rain_Lag1','Rain_Lag2','Sun_hrs','PCI','rFalg','Month_num']
    
    X= climate[Inputs]
      
    X_tr =X.iloc[0:tr_Ind+1,:]
    Y_tr = Target.iloc[0:tr_Ind+1]
    
      
    corrcoef = pacf(Y_tr,nlags=48)
    ImpLags = sorted(range(len(corrcoef)), key=lambda k: corrcoef[k])
           # select Top 10 lags
    L=len(corrcoef)
    n=5
        
    load=Y_tr
    stl = STL(load, period=12)
    res = stl.fit()
    trend = res.trend
    
    Y_tr = Y_tr-trend

    
    ImpLags=np.array(ImpLags)
    
    ImpLags1=ImpLags[ImpLags>Step_size]
    ImpLags1=ImpLags1[0:n]
    print(ImpLags1)
    Y_tr=np.array(Y_tr)
    Y_tr=Y_tr.reshape(len(Y_tr),1)
    
    
    
          # ZeroPad=np.zeros((24,1))
          # Y_tr =  np.concatenate((Y_tr,ZeroPad),axis=0)
    LGT1=len(Y_tr)
          #ImpLags1=[24,48]
        
    ARData=np.zeros((len(Y_tr),len(ImpLags1)))
    for r in range(0,len(ImpLags1)):
        ARData[ImpLags1[r]:LGT1,r]=Y_tr[0:(LGT1-(ImpLags1[r])),0]
        
    # ar_feat=1
    # if ar_feat==1:
    X_tr=np.concatenate((np.array(X_tr),ARData),axis=1)
       
        
    
    # ML_rgr =linear_model.Lasso(alpha=0.1)
    # 
    ML_rgr =RandomForestRegressor(random_state=42)
    # ML_rgr =GradientBoostingRegressor()

    
    
    Y_tr=np.array(Y_tr)
    Y_tr=Y_tr.reshape(len(Y_tr),1)
    ML_Output=np.array(Y_tr)
    ML_rgr.fit(X_tr,ML_Output.ravel())
    
    
    ### Testing / Forecasting
    Y=Y_tr
    
    for s in range(0,nSteps):
        print(s)
        
        testind = tr_Ind+Step_size
        
        X_test=X.iloc[(tr_Ind+1):(testind+1)]
        
        Test_dates = climate['DateTime'].iloc[(tr_Ind+1):(testind+1)]
        
        Y_test=np.zeros((Step_size,1))
        
        Y = np.concatenate((Y,Y_test))
        
        LGT2=len(Y)
            
            
        ARF = np.zeros((len(Y),len(ImpLags1)))
            
        for r in range(0,len(ImpLags1)):
            ARF[ImpLags1[r]:LGT2,r]=Y[0:(LGT2-(ImpLags1[r])),0]
            
        ARTest = ARF[(tr_Ind+1):(testind+1),:]
         
               
        X_test=np.concatenate((np.array(X_test),ARTest),axis=1)
        
        #### predictions
        ml_predictions=ML_rgr.predict(X_test)
        y_pred=ml_predictions.reshape(len(ml_predictions),1)
        
        ## adding growth - 0.08 based on data
        
        y_pred = y_pred+ y_pred*(Step_size/12*cgr)
        
        
        
        Forecasts[(s*Step_size):((s+1)*Step_size)] = y_pred[:,0]
        
        Y[(tr_Ind+1):(testind+1),0] = y_pred[:,0]
        
        tr_Ind=testind
    
        
    ## last year trend was considered to model the trend
    
    # slope = (trend.iloc[-36] - trend.iloc[-1]) / 36
    # future_trend = trend.iloc[-1] + slope * np.arange(1, ForecastHorizon+1)
    # print(future_trend)
    
    
    smooth_trend = trend.ewm(span=6, adjust=False).mean().ewm(span=12, adjust=False).mean()

 
    stl_trend, future_trend = stl_holt_trend_forecast(smooth_trend, ForecastHorizon, period=12)
 
 
    Forecasts=np.array(Forecasts)+np.array(future_trend)
    
    
    # nInds = np.where(Forecasts<0)[0]
   
    # if nInds.size>0:
    #     Forecasts[nInds] = 0.5*max(Y_tr)
    
    print(Forecasts)

    
    
    if Train==1:
        Y_test=np.array(Target.iloc[(act_tr_Ind+1):(act_tr_Ind+ForecastHorizon+1)])
        
        mapes =100* abs(Y_test-Forecasts)/Y_test
        Mape = np.mean(mapes)
        print(Mape)
        Out=pd.DataFrame()
        Out['Actuals'] = Y_test
        Out['Predictions'] = Forecasts

    else:
        Out=pd.DataFrame()
        Out['Actuals'] = np.zeros(len(Forecasts))
        Out['Predictions'] = Forecasts
        

        
        
    return(Out)
      

import pandas as pd
from pandas.tseries.offsets import DateOffset


## make sure for train =1, forecast horizon does n't exceed date that exist

    
parser = argparse.ArgumentParser(description='Revenue Forecasting')
parser.add_argument('--cgr', type=float, default=0.04, help='Cumulative growth rate (default: 0.04)')
parser.add_argument('--horizon', type=int, default=60, help='Forecast horizon in months (default: 60)')
args = parser.parse_args()

ForecastHorizon = args.horizon  ## Months
Traindate= "01-03-2025"
Train=0 ## 0 for forecasting (no actuals after training date to validate against)

cgr = args.cgr ## cumulative growth rate

Traindate_act=Traindate
outdir='./outputs'
df1 = pd.read_csv('./Revenue_Sales_with_datetime 1.csv')
climate = pd.read_csv('./kuppam_climate_approx 2.csv')

## generate flag to represent high rainfall

Rain_Lag1 = climate['Rain_Lag1']

r_inds = np.where(Rain_Lag1>np.mean(Rain_Lag1))[0]

rFlag=np.zeros(len(climate))

rFlag[r_inds]=1

climate['rFalg'] = rFlag

climate['Rain_Lag1_sq'] = np.square(climate['Rain_Lag1'])


plt.plot(df1['Total'])

Load_withCLimate = pd.concat((df1['Total'], climate.iloc[:,3:]), axis=1)


corr = Load_withCLimate.corr(method='pearson')

correlations = np.where(abs(corr.iloc[0:,])>0.3)[0]

Traindate = pd.to_datetime(Traindate, dayfirst=True)

start = (Traindate + DateOffset(months=1)).replace(day=1)

TestDates = pd.date_range(start=start, periods=ForecastHorizon, freq='MS')   # MS = Month Start

print(TestDates)

Forecast_DF = pd.DataFrame()
Actuals_DF = pd.DataFrame()

Forecast_DF['TestDates'] = TestDates
Actuals_DF['TestDates'] = TestDates


## forecasting
for var in df1.columns[2:15]:
  
    Target = df1[var]
    df_Forecast =  Forecasting_Func(Target,climate,Train,ForecastHorizon,Traindate_act,cgr)
    
    if Train==0:
        Forecast_DF[var] = df_Forecast['Predictions']
    else:
        Forecast_DF[var] = df_Forecast['Predictions']
        Actuals_DF[var] = df_Forecast['Actuals']

        
        

os.makedirs('./outputs', exist_ok=True)
Forecast_DF.to_csv('./outputs/New_Load_Forecast.csv', index=False)
if Train==1:
    Actuals_DF.to_csv('./outputs/new_actuals.csv', index=False)











