import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { UploadCloud, FileJson, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export default function DatasetUpload({ onDatasetAnalyzed }) {
  const [dragActive, setDragActive] = useState(false);
  const [datasetStats, setDatasetStats] = useState(null);
  const [error, setError] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    setError(null);
    setDatasetStats(null);

    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            setError("Failed to parse CSV file. Please ensure it is formatted correctly.");
          } else {
            analyzeDataset(results.data, file.name);
          }
        },
        error: (err) => {
          setError(err.message);
        }
      });
    } else if (file.type === "application/json" || file.name.endsWith(".json")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          // Auto-detect array of objects vs single object
          const arrData = Array.isArray(data) ? data : (data.items || data.data || [data]);
          analyzeDataset(arrData, file.name);
        } catch (err) {
          setError("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    } else {
      setError("Please upload a .csv or .json file.");
    }
  };

  const analyzeDataset = (data, filename) => {
    if (!Array.isArray(data) || data.length === 0) {
      setError("Dataset is empty or format is unrecognized.");
      return;
    }

    try {
      // Very simple heuristic scanning for known keys
      let totalItems = data.length;
      let totalWeight = 0;
      let types = new Set();
      let soonestExpiryHour = Infinity;

      data.forEach(row => {
        // Try to sum weight/quantity
        const qty = row.weight || row.quantity || row.qty || row.kg || row['Weight (kg)'] || 0;
        if (typeof qty === 'number') totalWeight += qty;
        else if (typeof qty === 'string') {
          const num = parseFloat(qty.replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) totalWeight += num;
        }

        // Try to gather types
        const type = row.type || row.category || row.item || row.food_type || row['Food Category'];
        if (type) types.add(type);

        // Try to get expiry hours
        const expiry = row.hours_to_expiry || row.expiry_hours || row['Hours until Expiry'];
        if (typeof expiry === 'number' && expiry < soonestExpiryHour) {
          soonestExpiryHour = expiry;
        }
      });

      const stats = {
        filename,
        totalItems,
        totalWeight: totalWeight.toFixed(2),
        categories: Array.from(types).slice(0, 3).join(", ") + (types.size > 3 ? "..." : ""),
        criticalExpiry: soonestExpiryHour !== Infinity ? soonestExpiryHour : "N/A"
      };

      setDatasetStats(stats);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze dataset structure. Ensure you have standard columns like 'weight', 'type', and 'hours_to_expiry'.");
    }
  };

  const sendToAdvisor = () => {
    if (!datasetStats) return;
    const prompt = `I just uploaded a dataset named ${datasetStats.filename}.
Dataset Summary:
- Total rows/items: ${datasetStats.totalItems}
- Estimated Total Weight: ${datasetStats.totalWeight}kg
- Key Categories: ${datasetStats.categories || "Unknown"}
- Shortest Expiry: ${datasetStats.criticalExpiry} hours

Can you suggest an optimal redistribution plan for this batch based on these stats?`;
    onDatasetAnalyzed(prompt);
  };

  return (
    <div className="bg-[#1c1a16] border border-[#3a3328] rounded-2xl p-6 flex flex-col shadow-2xl backdrop-blur-xl bg-opacity-70 h-full relative z-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold font-sans text-[#f5efe6] tracking-tight">Dataset Upload</h2>
        <p className="text-[#c4a882]/60 text-sm mt-1">Upload CSV or JSON of current surplus</p>
      </div>

      {!datasetStats ? (
        <div
          className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-all ${dragActive ? "border-[#c4a882] bg-[#c4a882]/5" : "border-[#3a3328] bg-[#141210]"
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <UploadCloud className={`w-12 h-12 mb-4 ${dragActive ? "text-[#c4a882]" : "text-[#c4a882]/40"}`} />
          <p className="text-[#ede0cc] font-medium mb-1">Drag and drop your dataset here</p>
          <p className="text-[#c4a882]/60 text-xs mb-4">Supports .csv and .json bulk exports</p>

          <label className="cursor-pointer bg-[#c4a882]/10 hover:bg-[#c4a882]/20 text-[#d4b896] px-5 py-2.5 rounded-xl text-sm font-medium transition-colors border border-[#c4a882]/20">
            Browse Files
            <input type="file" className="hidden" accept=".csv, application/json" onChange={handleChange} />
          </label>

          {error && (
            <div className="mt-4 flex items-start gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg text-sm border border-red-500/20 max-w-full">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-[#141210] rounded-xl border border-[#3a3328] p-5">
            <div className="flex items-center gap-3 mb-5 border-b border-[#3a3328] pb-4">
              <div className="w-10 h-10 rounded-lg bg-[#c4a882]/10 flex items-center justify-center">
                {datasetStats.filename.endsWith('.csv') ?
                  <FileText className="text-[#c4a882] w-5 h-5" /> :
                  <FileJson className="text-[#c4a882] w-5 h-5" />}
              </div>
              <div className="overflow-hidden">
                <p className="text-[#ede0cc] font-medium truncate" title={datasetStats.filename}>{datasetStats.filename}</p>
                <div className="flex items-center gap-1.5 text-[#c4a882]/60 text-xs mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-green-400/80" />
                  <span>Successfully parsed</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1c1a16] border border-[#3a3328] p-3 rounded-lg">
                <p className="text-[#c4a882]/60 text-xs mb-1 uppercase tracking-wider font-semibold">Total Items</p>
                <p className="text-[#f5efe6] font-medium text-lg">{datasetStats.totalItems}</p>
              </div>
              <div className="bg-[#1c1a16] border border-[#3a3328] p-3 rounded-lg">
                <p className="text-[#c4a882]/60 text-xs mb-1 uppercase tracking-wider font-semibold">Est. Weight</p>
                <p className="text-[#f5efe6] font-medium flex items-baseline gap-1">
                  <span className="text-lg">{datasetStats.totalWeight}</span>
                  <span className="text-sm text-[#c4a882]/60">kg</span>
                </p>
              </div>
              <div className="bg-[#1c1a16] border border-[#3a3328] p-3 rounded-lg col-span-2">
                <p className="text-[#c4a882]/60 text-xs mb-1 uppercase tracking-wider font-semibold">Top Categories</p>
                <p className="text-[#f5efe6] font-medium text-sm truncate">{datasetStats.categories || "Uncategorized"}</p>
              </div>
              <div className={`bg-[#1c1a16] border p-3 rounded-lg col-span-2 flex justify-between items-center ${datasetStats.criticalExpiry < 8 ? 'border-red-500/30 bg-red-500/5' : 'border-[#3a3328]'}`}>
                <p className="text-[#c4a882]/60 text-xs uppercase tracking-wider font-semibold">Most Critical Expiry</p>
                <p className={`font-bold ${datasetStats.criticalExpiry < 8 ? 'text-red-400' : 'text-[#f5efe6]'}`}>
                  {datasetStats.criticalExpiry} hours
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => { setDatasetStats(null); setError(null); }}
              className="px-4 py-2.5 rounded-xl border border-[#3a3328] hover:bg-[#3a3328]/50 text-[#ede0cc] text-sm font-medium transition-colors"
            >
              Clear
            </button>
            <button
              onClick={sendToAdvisor}
              className="flex-1 bg-gradient-to-br from-[#c4a882] to-[#b3956e] hover:from-[#d4b896] hover:to-[#c4a882] text-[#1a1814] px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-[#c4a882]/20 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              Ask AI Advisor
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
