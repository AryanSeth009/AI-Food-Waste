import React, { useState, useEffect, useRef } from "react";

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are FoodWaste.AI, a specialized AI advisor built into a food redistribution 
platform. You are NOT a general AI — you are a domain expert with deep knowledge 
of food safety, logistics, and redistribution operations.

═══════════════════════════════════════
FOOD SAFETY KNOWLEDGE BASE:
═══════════════════════════════════════
- Bread & Pastries:     expires 8–12 hours after baking
- Leafy Greens:         expires 4–6 hours unrefrigerated
- Cooked / Hot Food:    expires 6 hours max at room temperature
- Dairy Products:       spoils above 8°C, expires in 24–48 hours
- Root Vegetables:      safe for 24–48 hours with proper storage
- Fresh Fruits:         12–36 hours depending on ripeness
- Frozen Items:         safe if kept below -15°C continuously
- Rice / Grains:        cooked rice expires in 4–6 hours

═══════════════════════════════════════
REDISTRIBUTION LOGIC:
═══════════════════════════════════════
- Urgency Score Formula: (surplus_kg / hours_until_expiry) × 10
  * Score > 7  → 🔴 CRITICAL — dispatch within 1 hour
  * Score 4–7  → 🟡 HIGH — dispatch within 4 hours  
  * Score < 4  → 🟢 LOW — schedule for today
- Always prioritize food banks with cooking facilities for raw items
- Cold chain required for: dairy, meat, cooked food, cut fruits
- Match food TYPE to food bank NEED for best impact

═══════════════════════════════════════
IMPACT CALCULATION:
═══════════════════════════════════════
- 1 kg food rescued = ~3.3 meals served
- 1 kg food rescued = ~2.5 kg CO₂ avoided vs landfill
- 1 kg food rescued = $2.10 avg disposal cost saved
- Methane from 1 kg food waste = 25× more harmful than CO₂

═══════════════════════════════════════
PLATFORM DATA (your live system):
═══════════════════════════════════════
- Active Donors: 124 (restaurants, supermarkets, farms, hotels)
- Registered Food Banks: 38
- Average Match Score: 87%
- Top Food Banks by capacity:
  * Community Kitchen — 300kg capacity, accepts all food
  * Hope Food Bank — 200kg capacity, needs vegetables & fruits
  * Sunrise Shelter — 150kg capacity, needs bread & dairy
  * Youth Center — 100kg capacity, needs cooked food
  * Elderly Care Home — 80kg capacity, needs dairy & fruits
- Current City: Ahmedabad, Gujarat, India
- Peak surplus days: Friday & Saturday (38% above average)

═══════════════════════════════════════
STRICT RESPONSE FORMAT RULES:
═══════════════════════════════════════
1. Start with urgency level: 🔴 CRITICAL / 🟡 HIGH / 🟢 LOW
2. Give a clear "Action Plan" with max 4 bullet points
3. Always include exact Impact Estimate (meals, CO₂, cost)
4. Add 1 relevant warning if cold chain or time is critical
5. End with exactly one "💡 Pro Tip" specific to the situation
6. Keep total response under 200 words — be concise
7. Use emojis for readability
8. Never say you are ChatGPT, Claude, or any other AI
9. You are FoodWaste.AI — always stay in character
`;

// ── FEW-SHOT EXAMPLES ─────────────────────────────────────────────────────────
const FEW_SHOT_EXAMPLES = [
  {
    role: "user",
    content: "I have 50kg of bread expiring in 6 hours, what should I do?"
  },
  {
    role: "assistant",
    content: `🔴 CRITICAL URGENCY — Act within 1 hour

📦 Action Plan:
• Split into 3 batches for fastest dispatch
• 20kg → Hope Food Bank (2.1km, capacity available)
• 18kg → Sunrise Shelter (3.4km, specifically needs bread)
• 12kg → Community Kitchen (4.2km, open 24/7)

📊 Impact Estimate:
• ~165 meals served
• ~125 kg CO₂ avoided
• $105 in disposal costs saved

⚠️ Warning: Bread degrades fast — dispatch driver NOW, do not wait.

💡 Pro Tip: Your data shows 40% more bread surplus on weekends. Pre-schedule Friday evening pickups with Sunrise Shelter to avoid future critical alerts.`
  },
  {
    role: "user",
    content: "80kg of vegetables expiring in 24 hours"
  },
  {
    role: "assistant",
    content: `🟡 HIGH URGENCY — Act within 4 hours

📦 Action Plan:
• Prioritize food banks with cooking facilities first
• 40kg → Hope Food Bank (needs vegetables, 200kg capacity free)
• 30kg → Community Kitchen (accepts all, can process & store)
• 10kg → local restaurant partner for same-day cooking

📊 Impact Estimate:
• ~264 meals served
• ~200 kg CO₂ avoided
• $168 in disposal costs saved

❄️ Cold Chain: Keep below 8°C during transport — use refrigerated van.

💡 Pro Tip: Leafy greens have only 4–6 hours unrefrigerated. If dispatch is delayed beyond 6 hours, move to cold storage immediately.`
  },
  {
    role: "user",
    content: "How can I improve my redistribution efficiency?"
  },
  {
    role: "assistant",
    content: `🟢 EFFICIENCY ANALYSIS

📊 Your Current Stats:
• Match efficiency: 87% (industry top is 94%)
• Peak waste days: Friday–Saturday (38% above average)
• Biggest gap: Sunday food banks not pre-scheduled

📦 Top 3 Improvements:
• Pre-schedule 2 extra food bank pickups every Sunday
• Add a Restaurant Partner tier for same-day cooked food
• Enable cold-chain alerts for dairy & meat items

📊 Projected Impact if implemented:
• +23% more food rescued per week
• ~+340 extra meals served per week
• ~$510 additional cost savings monthly

💡 Pro Tip: Your Saturday surplus spike is predictable — run the AI Forecast every Friday morning to pre-alert food banks before surplus happens, not after.`
  }
];

// ── QUICK SUGGESTION BUTTONS ──────────────────────────────────────────────────
const SUGGESTIONS = [
  "50kg bread expiring in 6 hours — what do I do?",
  "How do I improve my match efficiency?",
  "Which food bank should I prioritize today?",
  "Calculate impact of 100kg vegetable rescue",
];

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function AIAdvisor({ initialQueryText, clearInitialQuery }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `👋 Hello! I'm your **FoodWaste.AI Advisor**.

I can run locally on Ollama (llama3.2:1b) or via Cloud (OpenRouter).

I can help you with:
• 🚨 Urgent surplus redistribution decisions
• 📦 Optimal food bank matching
• 📊 Impact calculations (meals, CO₂, cost)
• 💡 Efficiency improvements for your operations

What do you need help with right now?`
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("ollama"); // "ollama" | "openrouter"
  const [ollamaStatus, setOllamaStatus] = useState("checking"); // "online" | "offline" | "checking"
  const [conversationHistory, setConversationHistory] = useState([]);
  const bottomRef = useRef(null);

  // ── Check if Ollama is running on mount ──
  useEffect(() => {
    const checkOllama = async () => {
      try {
        const res = await fetch("http://localhost:11434/api/tags");
        if (res.ok) setOllamaStatus("online");
        else setOllamaStatus("offline");
      } catch {
        setOllamaStatus("offline");
      }
    };
    checkOllama();
  }, []);



  // ── Auto scroll to bottom ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Send message to Ollama ──
  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMessage = { role: "user", text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Build updated conversation history
    const updatedHistory = [
      ...conversationHistory,
      { role: "user", content: text }
    ];

    if (provider === "openrouter") {
      try {
        const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error("VITE_OPENROUTER_API_KEY is not set in your .env file.");
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.3-70b-instruct:free",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...FEW_SHOT_EXAMPLES,
              ...updatedHistory,
            ],
            temperature: 0.7,
            top_p: 0.9,
          })
        });

        const data = await response.json();
        let assistantText = "Sorry, I couldn't process that. Please try again.";

        if (data.error) {
          assistantText = `⚠️ OpenRouter Error: ${data.error.message || JSON.stringify(data.error)}`;
        } else if (data.choices?.[0]?.message?.content) {
          assistantText = data.choices[0].message.content;
        }

        setMessages(prev => [...prev, { role: "assistant", text: assistantText }]);
        setConversationHistory([
          ...updatedHistory,
          { role: "assistant", content: assistantText }
        ]);
        setLoading(false);
        return;
      } catch (err) {
        console.error(err);
        setMessages(prev => [...prev, {
          role: "assistant",
          text: `⚠️ Cloud Error: ${err.message}\n\nPlease check your .env file and OpenRouter API key.`
        }]);
        setLoading(false);
        return;
      }
    }

    if (ollamaStatus === "offline" && provider === "ollama") {
      // Fallback to smart mock if Ollama is offline
      await new Promise(r => setTimeout(r, 1000));
      const fallback = getFallbackResponse(text);
      setMessages(prev => [...prev, { role: "assistant", text: fallback }]);
      setConversationHistory([
        ...updatedHistory,
        { role: "assistant", content: fallback }
      ]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2:1b",
          messages: [
            // Layer 1: System prompt (domain knowledge)
            { role: "system", content: SYSTEM_PROMPT },
            // Layer 2: Few-shot examples (response style tuning)
            ...FEW_SHOT_EXAMPLES,
            // Layer 3: Real conversation history (context memory)
            ...updatedHistory,
          ],
          stream: false,
          options: {
            temperature: 0.7,      // balanced creativity vs consistency
            top_p: 0.9,
            num_predict: 400,      // max tokens — keeps responses concise
          }
        })
      });

      const data = await response.json();
      let assistantText = "Sorry, I couldn't process that. Please try again.";

      if (data.error) {
        assistantText = `⚠️ Ollama Error: ${data.error}`;
      } else if (data.message?.content) {
        assistantText = data.message.content;
      }

      setMessages(prev => [...prev, { role: "assistant", text: assistantText }]);
      setConversationHistory([
        ...updatedHistory,
        { role: "assistant", content: assistantText }
      ]);

    } catch (err) {
      console.error(err);
      setOllamaStatus("offline");
      setMessages(prev => [...prev, {
        role: "assistant",
        text: `⚠️ Cannot reach Ollama. Using offline mode.\n\nTo fix: open terminal and run:\n\`ollama serve\`\n\nThen refresh the page.`
      }]);
    }

    setLoading(false);
  };

  // ── Smart fallback when Ollama is offline ──
  const getFallbackResponse = (text) => {
    const lower = text.toLowerCase();

    // Dataset smart parsing fallback
    if (lower.includes("dataset summary") || lower.includes("total rows")) {
      return `🟡 HIGH URGENCY — Dataset Received\n\n📦 Action Plan:\n• Routing algorithm optimized for bulk dataset inputs\n• Review high urgency items from your upload first\n• Matches initialized for 38 local food banks\n\n📊 Impact Estimate for batch:\n• Matches found for 85% of items\n• Pre-computation suggests ~500kg CO₂ avoided\n• Optimal routing saves $400 in disposal costs\n\n💡 Pro Tip: For bulk datasets, sorting by 'Hours to Expiry' ascending guarantees we tackle critical food batches first.\n\n⚡ Note: Running in offline mode — start Ollama for detailed per-item analysis from dataset.`;
    }

    if (lower.includes("bread") || lower.includes("pastry") || lower.includes("croissant")) {
      return `🔴 CRITICAL URGENCY — Act within 1 hour\n\n📦 Action Plan:\n• Split batch across 3 nearby food banks\n• 20kg → Hope Food Bank (2.1km)\n• 18kg → Sunrise Shelter (needs bread specifically)\n• Remaining → Community Kitchen (24/7 open)\n\n📊 Impact Estimate:\n• ~165 meals served\n• ~125 kg CO₂ avoided\n• $105 in disposal costs saved\n\n💡 Pro Tip: Pre-schedule Friday evening pickups to prevent future critical bread alerts.\n\n⚡ Note: Running in offline mode — start Ollama for live AI responses.`;
    }
    if (lower.includes("vegetable") || lower.includes("spinach") || lower.includes("tomato") || (lower.includes("80kg") && lower.includes("24"))) {
      return `🟡 HIGH URGENCY — Act within 4 hours\n\n📦 Action Plan:\n• Prioritize food banks with cooking facilities\n• Hope Food Bank — specifically needs vegetables\n• Community Kitchen — can process and preserve\n• Keep below 8°C during transport\n\n📊 Impact Estimate:\n• ~264 meals served per 80kg\n• ~200 kg CO₂ avoided\n• $168 in disposal costs saved\n\n💡 Pro Tip: Partner with local restaurants for same-day vegetable pickups.\n\n⚡ Note: Running in offline mode — start Ollama for live AI responses.`;
    }
    if (lower.includes("efficiency") || lower.includes("improve") || lower.includes("optimize")) {
      return `🟢 EFFICIENCY ANALYSIS\n\n📊 Your Current Performance:\n• Match efficiency: 87% (target: 94%)\n• Peak waste: Friday–Saturday\n• Gap: Sunday pickups not scheduled\n\n📦 Top 3 Improvements:\n• Pre-schedule Sunday food bank pickups\n• Add cold-chain alerts for dairy items\n• Enable Friday morning AI forecast alerts\n\n📊 Projected Gains:\n• +23% more food rescued weekly\n• ~340 extra meals served per week\n\n💡 Pro Tip: Run AI Forecast every Friday morning — predict before surplus happens.\n\n⚡ Note: Running in offline mode — start Ollama for live AI responses.`;
    }
    return `🟡 ANALYZING YOUR REQUEST\n\n📦 General Recommendation:\n• Check urgency score: quantity ÷ hours remaining\n• Score > 7 → dispatch immediately\n• Score 4–7 → schedule within 4 hours\n• Score < 4 → plan for today\n\n📊 Platform Status:\n• 38 food banks available right now\n• Average match score: 87%\n• Community Kitchen has highest capacity (300kg)\n\n💡 Pro Tip: Always contact the food bank 30 minutes before dispatch to confirm capacity.\n\n⚡ Note: Running in offline mode — start Ollama for live AI responses.`;
  };

  // Handle incoming initial queries from other components
  useEffect(() => {
    if (initialQueryText) {
      sendMessage(initialQueryText);
      if (clearInitialQuery) clearInitialQuery();
    }
  }, [initialQueryText, clearInitialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 flex flex-col h-full relative z-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-sans text-[#f5efe6] tracking-tight">AI Advisor</h1>
          <p className="text-[#c4a882]/60 text-sm mt-1 flex items-center gap-2">
            Powered by {provider === "openrouter" ? "OpenRouter (Cloud)" : "Ollama (Local)"}
          </p>
        </div>

        <div className="flex flex-col gap-2 items-end">
          {/* Provider Toggle */}
          <div className="flex bg-[#141210] rounded-full p-1 border border-[#3a3328]">
            <button
              onClick={() => setProvider("ollama")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${provider === "ollama" ? "bg-[#c4a882] text-[#1a1814]" : "text-[#c4a882]/60 hover:text-[#c4a882]"}`}
            >
              Local (Ollama)
            </button>
            <button
              onClick={() => setProvider("openrouter")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${provider === "openrouter" ? "bg-[#c4a882] text-[#1a1814]" : "text-[#c4a882]/60 hover:text-[#c4a882]"}`}
            >
              Cloud (OpenRouter)
            </button>
          </div>

          {/* Ollama Status Badge - Only show if Ollama is selected */}
          {provider === "ollama" && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md ${ollamaStatus === "online"
              ? "bg-[#c4a882]/10 border-[#c4a882]/30 text-[#c4a882]"
              : ollamaStatus === "offline"
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-[#3a3328]/30 border-[#3a3328] text-[#c4a882]/40"
              }`}>
              <div className={`w-2 h-2 rounded-full ${ollamaStatus === "online" ? "bg-[#d4b896] animate-pulse" :
                ollamaStatus === "offline" ? "bg-red-400" : "bg-[#c4a882]/40 animate-pulse"
                }`} />
              {ollamaStatus === "online" ? "Ollama Online" :
                ollamaStatus === "offline" ? "Ollama Offline" :
                  "Checking Ollama..."}
            </div>
          )}
        </div>
      </div>

      {/* Offline warning */}
      {ollamaStatus === "offline" && provider === "ollama" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 shadow-sm">
          <p className="text-red-400 text-sm font-medium mb-1">⚠️ Ollama is not running</p>
          <p className="text-red-400/70 text-xs">
            Open terminal and run: <code className="bg-red-500/20 px-2 py-0.5 rounded font-mono">ollama serve</code>
            &nbsp;then&nbsp;
            <code className="bg-red-500/20 px-2 py-0.5 rounded font-mono">ollama pull llama3.2:1b</code>
          </p>
          <p className="text-red-400/50 text-xs mt-1">Smart offline responses are active as backup.</p>
        </div>
      )}

      {/* Chat Window */}
      <div className="bg-[#1c1a16] border border-[#3a3328] rounded-2xl p-4 flex flex-col shadow-2xl flex-1 backdrop-blur-xl bg-opacity-70" style={{ minHeight: "60vh" }}>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

              {/* AI Avatar */}
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c4a882]/30 to-[#d4b896]/10 border border-[#c4a882]/30 flex items-center justify-center mr-2 flex-shrink-0 mt-1 shadow-sm">
                  <span className="text-xs">🤖</span>
                </div>
              )}

              {/* Message Bubble */}
              <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line shadow-sm ${msg.role === "user"
                ? "bg-gradient-to-br from-[#c4a882] to-[#b3956e] text-[#1a1814] font-medium rounded-br-sm"
                : "bg-[#141210] border border-[#3a3328] text-[#ede0cc]/95 rounded-bl-sm"
                }`}>
                {msg.text}
              </div>

              {/* User Avatar */}
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c4a882]/20 to-[#d4b896]/5 border border-[#c4a882]/30 flex items-center justify-center ml-2 flex-shrink-0 mt-1">
                  <span className="text-xs">👤</span>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#c4a882]/20 border border-[#c4a882]/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs">🤖</span>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-[#141210] border border-[#3a3328] flex gap-1.5 items-center">
                <span className="text-xs text-[#c4a882]/50 mr-1">FoodWaste.AI is thinking</span>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#d4b896]/60 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion Buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full bg-[#c4a882]/5 border border-[#c4a882]/20 text-[#d4b896] hover:bg-[#c4a882]/15 hover:border-[#c4a882]/40 disabled:opacity-40 transition-all font-medium"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about surplus, routing, food banks, impact..."
            className="flex-1 bg-[#100e0c] border border-[#3a3328] rounded-xl px-4 py-3 text-sm text-[#ede0cc] placeholder-[#c4a882]/40 focus:outline-none focus:border-[#c4a882]/60 focus:ring-1 focus:ring-[#c4a882]/30 transition-all"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c4a882] to-[#b3956e] hover:from-[#d4b896] hover:to-[#c4a882] disabled:from-[#3a3328] disabled:to-[#3a3328] disabled:text-gray-500 flex items-center justify-center text-[#1a1814] transition-all shadow-lg hover:shadow-[#c4a882]/20 hover:-translate-y-0.5 active:translate-y-0"
          >
            {/* Send icon inline */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        {/* Fine-tuning info footer */}
        <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${provider === "openrouter" ? "bg-blue-400/40" : "bg-[#c4a882]/40"}`} />
            <p className="text-[#c4a882]/40 text-[11px] font-medium tracking-wide">
              {provider === "openrouter" ? "CLOUD INFERENCE · META-LLAMA-3" : "DOMAIN-TUNED · LOCAL INFERENCE · PRIVATE"}
            </p>
          </div>
          {provider === "openrouter" && (
            <p className="text-[#c4a882]/30 text-[11px]">Powered by OpenRouter.ai API</p>
          )}
        </div>
      </div>
    </div>
  );
}
