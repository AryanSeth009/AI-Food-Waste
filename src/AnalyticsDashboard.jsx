import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Route, TrendingUp, AlertTriangle, Truck, MapPin } from 'lucide-react';

export default function AnalyticsDashboard() {
    const [forecastData, setForecastData] = useState([]);
    const [routes, setRoutes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch forecast and routing data on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Forecast
            const forecastResponse = await fetch('http://localhost:8000/api/forecast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    historical_surplus: [], // Sending empty to trigger the backend's synthetic data generation for demo
                    days_to_predict: 7
                })
            });

            if (!forecastResponse.ok) throw new Error("Failed to fetch forecast");
            const forecastJson = await forecastResponse.json();

            // Combine historical and forecast for the chart
            const chartData = [
                ...forecastJson.forecast.historical.map(item => ({
                    date: item.date,
                    historical: item.surplus_kg,
                    predicted: null
                })),
                ...forecastJson.forecast.forecast.map(item => ({
                    date: item.date,
                    historical: null,
                    predicted: item.predicted_kg
                }))
            ];
            setForecastData(chartData);

            // 2. Fetch Routes
            const routeResponse = await fetch('http://localhost:8000/api/optimize-route', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    donors: [], // Empty to trigger backend synthetic data generator
                    food_banks: [],
                    vehicles: 2
                })
            });

            if (!routeResponse.ok) throw new Error("Failed to fetch routes");
            const routeJson = await routeResponse.json();
            setRoutes(routeJson.optimized_routes);

        } catch (err) {
            console.error(err);
            setError("Cannot connect to Python backend. Is FastAPI running on port 8000?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#1c1a16] border border-[#3a3328] rounded-2xl p-6 shadow-2xl backdrop-blur-xl bg-opacity-70 h-full relative z-10 overflow-y-auto">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold font-sans text-[#f5efe6] tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[#c4a882]" />
                        Forecasting & Logistics
                    </h2>
                    <p className="text-[#c4a882]/60 text-sm mt-1">AI-powered surplus forecasting and VRP routing</p>
                </div>

                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="bg-[#c4a882]/10 hover:bg-[#c4a882]/20 border border-[#c4a882]/20 text-[#d4b896] px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? "Syncing API..." : "Refresh Data"}
                </button>
            </div>

            {error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                        <p className="text-red-400 font-medium">Backend Connection Error</p>
                        <p className="text-red-400/70 text-sm mt-1">{error}</p>
                        <p className="text-red-400/50 text-xs mt-2">Make sure you run <code>uvicorn main:app --reload</code> in the backend folder.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">

                    {/* Chart Section */}
                    <div className="bg-[#141210] border border-[#3a3328] rounded-xl p-5">
                        <h3 className="text-[#f5efe6] font-medium mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#c4a882]" />
                            7-Day Surplus Forecast (Time-Series)
                        </h3>

                        {loading && forecastData.length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-[#c4a882]/50 text-sm">Loading ML Model...</div>
                        ) : (
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={forecastData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#3a3328" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#c4a882"
                                            tick={{ fill: "#c4a882", opacity: 0.6, fontSize: 11 }}
                                            tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                        />
                                        <YAxis
                                            stroke="#c4a882"
                                            tick={{ fill: "#c4a882", opacity: 0.6, fontSize: 11 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1c1a16', borderColor: '#3a3328', borderRadius: '8px', color: '#f5efe6' }}
                                            itemStyle={{ color: '#d4b896' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                        <Line type="monotone" dataKey="historical" name="Historical (kg)" stroke="#c4a882" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="predicted" name="Predicted (kg)" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Routing Section */}
                    <div className="bg-[#141210] border border-[#3a3328] rounded-xl p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[#f5efe6] font-medium flex items-center gap-2">
                                <Route className="w-4 h-4 text-[#c4a882]" />
                                Optimal Fleet Routes (VRP Solver)
                            </h3>
                            {routes && (
                                <div className="text-xs bg-[#c4a882]/10 text-[#d4b896] px-2.5 py-1 rounded-md border border-[#c4a882]/20">
                                    Total Distance: {routes.total_distance} km
                                </div>
                            )}
                        </div>

                        {loading && !routes ? (
                            <div className="py-8 flex items-center justify-center text-[#c4a882]/50 text-sm">Solving capabilities matrix...</div>
                        ) : routes ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {routes.routes.map((route, idx) => (
                                    <div key={idx} className="bg-[#1c1a16] border border-[#3a3328] rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <Truck className="w-4 h-4 text-[#c4a882]" />
                                                <span className="text-[#f5efe6] font-medium text-sm">Vehicle {route.vehicle_id}</span>
                                            </div>
                                            <span className="text-xs text-[#c4a882]/60">{route.distance} km trip</span>
                                        </div>

                                        <div className="relative pl-3 border-l-2 border-[#3a3328] space-y-4 my-2">
                                            {route.steps.map((step, sIdx) => (
                                                <div key={sIdx} className="relative">
                                                    {/* Timeline dot */}
                                                    <div className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#1c1a16] ${step.action === 'Pickup' ? 'bg-green-400' :
                                                            step.action === 'Dropoff' ? 'bg-blue-400' :
                                                                'bg-[#c4a882]'
                                                        }`} />

                                                    <p className="text-sm text-[#f5efe6]">{step.location_name}</p>
                                                    <div className="flex gap-2 text-xs mt-0.5">
                                                        <span className={`font-medium ${step.action === 'Pickup' ? 'text-green-400/80' :
                                                                step.action === 'Dropoff' ? 'text-blue-400/80' :
                                                                    'text-[#c4a882]/60'
                                                            }`}>
                                                            {step.action}
                                                        </span>
                                                        {step.load_change_kg !== 0 && (
                                                            <span className="text-[#c4a882]/60">
                                                                {step.load_change_kg > 0 ? "+" : ""}{step.load_change_kg} kg
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-[#c4a882]/50 text-sm">No routing data available</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
