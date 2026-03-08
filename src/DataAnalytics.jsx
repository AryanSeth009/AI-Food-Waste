import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { PieChart as PieChartIcon, BarChart3, Grid, AlertTriangle } from 'lucide-react';

import foodWastageDataUrl from './assets/food_waste_data/food_wastage_data.csv?url';

const COLORS = ['#c4a882', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DataAnalytics() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Aggregated states
    const [byFoodType, setByFoodType] = useState([]);
    const [byEventType, setByEventType] = useState([]);
    const [byStorage, setByStorage] = useState([]);
    const [summary, setSummary] = useState({ totalWaste: 0, totalEvents: 0, avgWaste: 0 });

    function processData(rawData) {
        let totalW = 0;
        const foodTypeMap = {};
        const eventTypeMap = {};
        const storageMap = {};

        rawData.forEach(row => {
            const waste = row['Wastage Food Amount'] || 0;
            totalW += waste;

            const foodType = row['Type of Food'] || 'Unknown';
            foodTypeMap[foodType] = (foodTypeMap[foodType] || 0) + waste;

            const eventType = row['Event Type'] || 'Unknown';
            eventTypeMap[eventType] = (eventTypeMap[eventType] || 0) + waste;

            const storage = row['Storage Conditions'] || 'Unknown';
            storageMap[storage] = (storageMap[storage] || 0) + waste;
        });

        setSummary({
            totalWaste: totalW,
            totalEvents: rawData.length,
            avgWaste: rawData.length > 0 ? (totalW / rawData.length) : 0
        });

        // Convert to arrays and sort descending
        setByFoodType(Object.keys(foodTypeMap).map(k => ({ name: k, value: foodTypeMap[k] })).sort((a, b) => b.value - a.value));
        setByEventType(Object.keys(eventTypeMap).map(k => ({ name: k, value: eventTypeMap[k] })).sort((a, b) => b.value - a.value));
        setByStorage(Object.keys(storageMap).map(k => ({ name: k, value: storageMap[k] })).sort((a, b) => b.value - a.value));
    }

    useEffect(() => {
        const loadCSV = async () => {
            try {
                // Fetch and parse the CSV logic
                Papa.parse(foodWastageDataUrl || '/src/assets/food_waste_data/food_wastage_data.csv', {
                    download: true,
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.errors.length > 0 && results.data.length === 0) {
                            setError("Failed to parse CSV data.");
                            setLoading(false);
                            return;
                        }
                        processData(results.data);
                        setLoading(false);
                    },
                    error: (err) => {
                        setError(err.message);
                        setLoading(false);
                    }
                });
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        loadCSV();
    }, []);
    if (loading) {
        return (
            <div className="flex items-center justify-center text-[#c4a882]/60 bg-[#1c1a16] border border-[#3a3328] rounded-2xl min-h-[40vh] md:min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-[#c4a882]/30 border-t-[#c4a882] rounded-full animate-spin"></div>
                    <p>Loading analytics data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[40vh] md:min-h-[60vh] text-center">
                <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
                <h3 className="text-red-400 font-bold text-xl mb-1">Data Load Error</h3>
                <p className="text-red-400/70">{error}</p>
            </div>
        );
    }

    // Custom Pie chart label
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="11" fontWeight="bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="bg-[#1c1a16] border border-[#3a3328] rounded-2xl p-8 flex flex-col shadow-2xl backdrop-blur-xl bg-opacity-70 h-[calc(100vh-8rem)] relative z-10 overflow-y-auto w-full custom-scrollbar">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold font-sans text-[#f5efe6] tracking-tight flex items-center gap-2">
                        <Grid className="w-5 h-5 text-[#c4a882]" />
                        Food Wastage Analytics
                    </h2>
                    <p className="text-[#c4a882]/60 text-sm mt-1">Deep dive into historical food waste data patterns.</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#141210] border border-[#3a3328] p-6 rounded-xl shadow-lg">
                    <p className="text-[#c4a882]/60 text-xs mb-1 uppercase tracking-wider font-semibold">Total Historical Wastage</p>
                    <p className="text-[#f5efe6] font-medium flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{summary.totalWaste.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span className="text-sm text-[#c4a882]/60">kg</span>
                    </p>
                </div>
                <div className="bg-[#141210] border border-[#3a3328] p-6 rounded-xl shadow-lg">
                    <p className="text-[#c4a882]/60 text-xs mb-1 uppercase tracking-wider font-semibold">Total Events Recorded</p>
                    <p className="text-[#f5efe6] font-medium flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{summary.totalEvents.toLocaleString()}</span>
                    </p>
                </div>
                <div className="bg-[#141210] border border-[#3a3328] p-6 rounded-xl shadow-lg">
                    <p className="text-[#c4a882]/60 text-xs mb-1 uppercase tracking-wider font-semibold">Avg. Wastage per Event</p>
                    <p className="text-[#f5efe6] font-medium flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{summary.avgWaste.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                        <span className="text-sm text-[#c4a882]/60">kg</span>
                    </p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">

                {/* Food Type Bar Chart */}
                <div className="bg-[#141210] border border-[#3a3328] rounded-xl p-6 shadow-lg">
                    <h3 className="text-[#f5efe6] font-medium flex items-center gap-2 mb-6">
                        <BarChart3 className="w-4 h-4 text-[#c4a882]" />
                        Wastage by Food Type
                    </h3>
                    <div className="h-64 sm:h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byFoodType} margin={{ top: 5, right: 20, left: -10, bottom: 25 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#3a3328" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#c4a882"
                                    tick={{ fill: "#c4a882", opacity: 0.6, fontSize: 11 }}
                                    angle={-45}
                                    textAnchor="end"
                                />
                                <YAxis
                                    stroke="#c4a882"
                                    tick={{ fill: "#c4a882", opacity: 0.6, fontSize: 11 }}
                                    tickFormatter={(v) => `${v / 1000}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#3a3328', opacity: 0.4 }}
                                    contentStyle={{ backgroundColor: '#1c1a16', borderColor: '#3a3328', borderRadius: '8px', color: '#f5efe6' }}
                                    formatter={(value) => [`${value.toLocaleString()} kg`, 'Wastage']}
                                />
                                <Bar dataKey="value" fill="#c4a882" radius={[4, 4, 0, 0]}>
                                    {byFoodType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.85} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Event Type Pie Chart */}
                <div className="bg-[#141210] border border-[#3a3328] rounded-xl p-6 shadow-lg">
                    <h3 className="text-[#f5efe6] font-medium flex items-center gap-2 mb-6">
                        <PieChartIcon className="w-4 h-4 text-[#c4a882]" />
                        Wastage by Event Type
                    </h3>
                    <div className="h-64 sm:h-72 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={byEventType}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    outerRadius={90}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {byEventType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#141210" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1c1a16', borderColor: '#3a3328', borderRadius: '8px', color: '#f5efe6' }}
                                    formatter={(value) => [`${value.toLocaleString()} kg`, 'Wastage']}
                                />
                                <Legend
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                    align="center"
                                    wrapperStyle={{ fontSize: '11px', color: '#c4a882', paddingTop: '10px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Storage Conditions Bar Chart - Horizontal */}
                <div className="bg-[#141210] border border-[#3a3328] rounded-xl p-6 shadow-lg lg:col-span-2">
                    <h3 className="text-[#f5efe6] font-medium flex items-center gap-2 mb-6">
                        <BarChart3 className="w-4 h-4 text-[#c4a882] rotate-90" />
                        Impact of Storage Conditions
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byStorage} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#3a3328" horizontal={false} />
                                <XAxis
                                    type="number"
                                    stroke="#c4a882"
                                    tick={{ fill: "#c4a882", opacity: 0.6, fontSize: 11 }}
                                    tickFormatter={(v) => `${v / 1000}k`}
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="#c4a882"
                                    tick={{ fill: "#c4a882", opacity: 0.8, fontSize: 11 }}
                                    width={120}
                                />
                                <Tooltip
                                    cursor={{ fill: '#3a3328', opacity: 0.4 }}
                                    contentStyle={{ backgroundColor: '#1c1a16', borderColor: '#3a3328', borderRadius: '8px', color: '#f5efe6' }}
                                    formatter={(value) => [`${value.toLocaleString()} kg`, 'Wastage']}
                                />
                                <Bar dataKey="value" fill="#d4b896" radius={[0, 4, 4, 0]} barSize={32}>
                                    {byStorage.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} opacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
