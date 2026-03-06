import pandas as pd
import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import typing

def predict_surplus(historical_surplus: typing.List[float], days_to_predict: int = 7) -> typing.Dict[str, typing.Any]:
    """
    Predict future food surplus using Holt-Winters Exponential Smoothing.
    This model is lightweight and works well for daily data with potential weekly seasonality.
    
    Args:
        historical_surplus: List of float values representing daily food surplus (e.g., last 30 days).
        days_to_predict: Integer number of days into the future to forecast.
        
    Returns:
        Dictionary containing historical dates, historical values, predicted dates, and predicted values.
    """
    # Dummy data generation if not enough history is provided
    if not historical_surplus or len(historical_surplus) < 14:
        print("Not enough historical data provided. Generating synthetic 30-day history for demo...")
        np.random.seed(42)
        base = 50
        # Weekly seasonality + random noise
        historical_surplus = [base + 20 * np.sin(i * (2 * np.pi / 7)) + np.random.normal(0, 5) for i in range(30)]

    # Create a pandas Series with a daily DatetimeIndex ending today
    today = pd.Timestamp.now().normalize()
    dates = pd.date_range(end=today, periods=len(historical_surplus), freq='D')
    ts_data = pd.Series(historical_surplus, index=dates)

    # Fit Holt-Winters model (using additive trend and seasonality, assuming 7-day period)
    # If the length of data is very small, we might disable seasonality
    seasonal_periods = 7 if len(historical_surplus) >= 14 else None
    
    try:
        if seasonal_periods:
            model = ExponentialSmoothing(
                ts_data, 
                trend='add', 
                seasonal='add', 
                seasonal_periods=seasonal_periods,
                initialization_method="estimated"
            ).fit()
        else:
            model = ExponentialSmoothing(
                ts_data, 
                trend='add', 
                initialization_method="estimated"
            ).fit()
            
        # Forecast N days into the future
        forecast = model.forecast(days_to_predict)
        
        # Format output
        history_formatted = [
            {"date": date.strftime("%Y-%m-%d"), "surplus_kg": round(val, 2)}
            for date, val in zip(ts_data.index, ts_data.values)
        ]
        
        forecast_formatted = [
            {"date": date.strftime("%Y-%m-%d"), "predicted_kg": round(val, 2)}
            for date, val in zip(forecast.index, forecast.values)
        ]
        
        return {
            "historical": history_formatted,
            "forecast": forecast_formatted,
            "model_used": "Holt-Winters Exponential Smoothing"
        }
        
    except Exception as e:
        print(f"Forecasting error: {e}")
        # Fallback to simple moving average if model fails to converge
        sma = np.mean(historical_surplus[-7:]) if len(historical_surplus) >= 7 else np.mean(historical_surplus)
        future_dates = pd.date_range(start=today + pd.Timedelta(days=1), periods=days_to_predict, freq='D')
        
        forecast_formatted = [
            {"date": date.strftime("%Y-%m-%d"), "predicted_kg": round(sma, 2)}
            for date in future_dates
        ]
        
        return {
            "historical": [{"date": "N/A", "surplus_kg": h} for h in historical_surplus],
            "forecast": forecast_formatted,
            "model_used": "Simple Moving Average (Fallback)"
        }
