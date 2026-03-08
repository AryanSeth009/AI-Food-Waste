import React, { useState } from 'react';
import AIAdvisor from './AIAdvisor';
import DatasetUpload from './DatasetUpload';
import AnalyticsDashboard from './AnalyticsDashboard';
import DataAnalytics from './DataAnalytics';
import { Route, LayoutDashboard, MessageSquare, BarChart2 } from 'lucide-react';

function App() {
  const [initialQueryText, setInitialQueryText] = useState("");
  const [activeTab, setActiveTab] = useState("operations"); // "operations" | "analytics"

  const handleDatasetAnalyzed = (prompt) => {
    setInitialQueryText(prompt);
    setActiveTab("operations");
  };

  return (
    <div className="min-h-screen bg-[#141210] text-[#ede0cc] font-sans selection:bg-[#c4a882] selection:text-black overflow-hidden relative">
      {/* Background aesthetic enhancements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#c4a882] opacity-[0.03] rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-[#d4b896] opacity-[0.02] rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Navigation */}
      <nav className="border-b border-[#3a3328] bg-[#1c1a16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex justify-between items-center h-16">
            <div className="flex shrink-0 items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#c4a882] to-[#9b8566] p-1.5 flex items-center justify-center shadow-lg shadow-[#c4a882]/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight text-[#f5efe6] font-sans">
                FoodWaste<span className="text-[#c4a882]">.AI</span>
              </span>
            </div>

            {/* Tabs */}
            <div className="hidden sm:flex space-x-1 bg-[#141210] p-1 rounded-xl border border-[#3a3328]/50">
              <button
                onClick={() => setActiveTab("operations")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "operations"
                  ? "bg-[#c4a882]/10 text-[#d4b896]"
                  : "text-[#c4a882]/60 hover:text-[#c4a882] hover:bg-[#3a3328]/50"
                  }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Operations
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "analytics"
                  ? "bg-[#c4a882]/10 text-[#d4b896]"
                  : "text-[#c4a882]/60 hover:text-[#c4a882] hover:bg-[#3a3328]/50"
                  }`}
              >
                <Route className="w-4 h-4" />
                Forecasting & Routing
              </button>
              <button
                onClick={() => setActiveTab("data")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "data"
                  ? "bg-[#c4a882]/10 text-[#d4b896]"
                  : "text-[#c4a882]/60 hover:text-[#c4a882] hover:bg-[#3a3328]/50"
                  }`}
              >
                <BarChart2 className="w-4 h-4" />
                Data Insights
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-[#c4a882]/70 hidden md:block">Ahmedabad Region</div>
              <div className="w-8 h-8 rounded-full bg-[#3a3328] border border-[#c4a882]/20 overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=FoodAdmin&backgroundColor=1c1a16" alt="Profile" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Dashboard */}
      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 h-[calc(100vh-4rem)] flex flex-col">
        {activeTab === "operations" ? (
          <>
            <div className="mb-6 z-10">
              <h1 className="text-3xl font-bold tracking-tight text-[#f5efe6]">Operations Dashboard</h1>
              <p className="text-[#c4a882]/70 mt-1">Manage bulk uploads and get situational AI advice.</p>
            </div>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
              <div className="lg:col-span-4 h-full">
                <DatasetUpload onDatasetAnalyzed={handleDatasetAnalyzed} />
              </div>
              <div className="lg:col-span-8 h-full">
                <AIAdvisor
                  initialQueryText={initialQueryText}
                  clearInitialQuery={() => setInitialQueryText("")}
                />
              </div>
            </div>
          </>
        ) : activeTab === "analytics" ? (
          <div className="flex-1 h-full min-h-0 relative z-10 w-full">
            <AnalyticsDashboard />
          </div>
        ) : (
          <div className="flex-1 h-full min-h-0 relative z-10 w-full">
            <DataAnalytics />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
