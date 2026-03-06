from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
from pydantic import BaseModel
import uvicorn

# Import local ML/Optimization modules
from ml_models.forecasting import predict_surplus
from optimization.vrp import optimize_fleet_routes

app = FastAPI(title="FoodWaste.AI Backend API")

# Setup CORS to allow React frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ForecastRequest(BaseModel):
    historical_surplus: List[float]
    days_to_predict: int = 7

class RouteOptimizationRequest(BaseModel):
    donors: List[Dict[str, Any]]
    food_banks: List[Dict[str, Any]]
    vehicles: int = 2
    vehicle_capacity: float = 300.0

@app.get("/")
def read_root():
    return {"status": "Backend is running", "app": "FoodWaste.AI"}

@app.post("/api/forecast")
def get_forecast(request: ForecastRequest):
    """
    Given an array of historical daily surplus (in kg),
    predict the next N days of surplus.
    """
    forecast = predict_surplus(request.historical_surplus, request.days_to_predict)
    return {"forecast": forecast}

@app.post("/api/optimize-route")
def get_optimized_route(request: RouteOptimizationRequest):
    """
    Given a list of donors (pickup points) and food banks (dropoff points),
    calculate the optimal routes for a given number of fleet vehicles.
    """
    routes = optimize_fleet_routes(
        donors=request.donors,
        food_banks=request.food_banks,
        num_vehicles=request.vehicles,
        vehicle_capacity=request.vehicle_capacity
    )
    return {"optimized_routes": routes}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
