import { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenAI } from "@google/genai";
import { C, radius, shadow } from "../tokens";
import { PageHeader } from "../components/ui";
import type { Screen } from "../tokens";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";

// ── Types ────────────────────────────────────────────────────────────────────

type Msg = { role: "user" | "bot"; text: string; time: string; error?: boolean };

// ── Gemini client — new @google/genai SDK ────────────────────────────────────

function getClient(): GoogleGenAI {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!key || key.trim() === "" || key === "your_key_here") {
    throw new Error("GEMINI_API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey: key });
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Agri Advisor inside AnnaVriddhi — an expert agricultural assistant for Indian farmers.

RULES:
- Answer in the same language/mix the farmer used (Hindi, English, or Hinglish)
- Use ONLY the provided farm context for specific numbers (moisture %, scores, grades, revenue). Never invent figures
- For general agronomy questions (pest control, sowing tips, fertilizer types), use your expert knowledge
- Be concise and practical — farmers need actionable steps, not essays
- Keep responses under 200 words. Use line breaks for readability
- If data is unavailable, say so clearly and suggest contacting the local Krishi Vigyan Kendra (KVK)
- Never repeat the farmer's question back to them

Your goal: help farmers make data-driven decisions using their real farm data.`;

// ── Context builder ───────────────────────────────────────────────────────────

function buildFarmerContext(
  farmer: any,
  currentCrop: any,
  cropHealth: any,
  recommendations: any[],
  alerts: any[]
): string {
  const lines: string[] = [];

  if (farmer) {
    lines.push(`FARMER: ${farmer.name || "Unknown"}`);
    if (farmer.state) lines.push(`LOCATION: ${farmer.district ? farmer.district + ", " : ""}${farmer.state}`);
    if (farmer.total_area_acres) lines.push(`FARM SIZE: ${farmer.total_area_acres} acres`);
  }

  if (currentCrop) {
    const name = currentCrop.crop_name || currentCrop.crop_type || currentCrop.name || "Unknown";
    lines.push(`\nACTIVE CROP: ${name}${currentCrop.variety ? " (" + currentCrop.variety + ")" : ""}`);
    if (currentCrop.planted_date || currentCrop.sow_date) {
      lines.push(`PLANTED: ${currentCrop.planted_date || currentCrop.sow_date}`);
    }
    if (currentCrop.expected_harvest_date) {
      lines.push(`EXPECTED HARVEST: ${currentCrop.expected_harvest_date}`);
    }
    if (currentCrop.current_stage) lines.push(`GROWTH STAGE: ${currentCrop.current_stage}`);
  }

  if (cropHealth) {
    lines.push(`\nCROP HEALTH (today):`);
    if (cropHealth.health_score !== undefined) lines.push(`  Overall score: ${cropHealth.health_score}/100`);
    if (cropHealth.moisture_pct !== undefined) lines.push(`  Soil moisture: ${cropHealth.moisture_pct}%`);
    if (cropHealth.disease_risk_pct !== undefined) lines.push(`  Disease risk: ${cropHealth.disease_risk_pct}%`);
    if (cropHealth.nitrogen_level !== undefined) lines.push(`  Nitrogen: ${cropHealth.nitrogen_level} kg/acre`);
  }

  if (recommendations?.length > 0) {
    lines.push(`\nACTIVE RECOMMENDATIONS:`);
    recommendations.slice(0, 3).forEach((r: any, i: number) => {
      const title = r.title || r.type || "Recommendation";
      const priority = r.priority || "";
      const impact = r.predicted_revenue_impact ? ` (₹${r.predicted_revenue_impact} impact)` : "";
      lines.push(`  ${i + 1}. [${priority.toUpperCase()}] ${title}${impact}`);
    });
  }

  if (alerts?.length > 0) {
    const unread = alerts.filter((a: any) => !a.is_read);
    if (unread.length > 0) {
      lines.push(`\nACTIVE ALERTS (${unread.length} unread):`);
      unread.slice(0, 3).forEach((a: any, i: number) => {
        lines.push(`  ${i + 1}. [${(a.severity || "").toUpperCase()}] ${a.title}`);
      });
    }
  }

  return lines.length > 0 ? lines.join("\n") : "No farm data available yet.";
}

// ── Suggestions ───────────────────────────────────────────────────────────────

const SUGGESTIONS_WITH_CROPS = [
  "Should I irrigate today?",
  "How is my crop doing?",
  "Any pest threats I should know about?",
  "When should I harvest?",
  "Which government schemes am I eligible for?",
];

const SUGGESTIONS_NEW_FARMER = [
  "How do I start growing wheat?",
  "What's the best crop for Kharif season?",
  "How do I apply for Kisan Credit Card?",
  "What is soil pH and why does it matter?",
  "How to prevent common crop diseases?",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatText(text: string) {
  return text.split(/\*\*(.*?)\*\*/g).map((part, j) =>
    j % 2 === 1 ? <strong key={j}>{part}</strong> : part
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Chatbot({ navigate }: { navigate: (s: Screen) => void }) {
  const { farmer } = useAuth();
  const { currentCrop, cropHealth, topRecommendations, activeAlerts } = useData();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [keyMissing, setKeyMissing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // chat session ref — new SDK Chat object
  const chatRef = useRef<any>(null);

  const farmerName = farmer?.name?.split(" ")[0] || "Farmer";
  const suggestions = currentCrop ? SUGGESTIONS_WITH_CROPS : SUGGESTIONS_NEW_FARMER;

  // Greeting
  useEffect(() => {
    setMessages([{
      role: "bot",
      text: `नमस्ते ${farmerName} जी! 👋 I'm your Agri Advisor — powered by Gemini 3.6 Flash and your farm's real data.\n\nAsk me anything about your crops, irrigation, pests, harvest timing, or government schemes.\n\n(मैं Hindi और English दोनों में जवाब दे सकता हूँ!)`,
      time: now(),
    }]);
  }, [farmerName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Build/rebuild chat session whenever farmer or crop changes
  useEffect(() => {
    chatRef.current = null;
    try {
      const ai = getClient();
      const farmContext = buildFarmerContext(
        farmer, currentCrop, cropHealth, topRecommendations, activeAlerts
      );
      // New SDK: system instruction passed at model level, no history role issues
      chatRef.current = ai.chats.create({
        model: "gemini-3.6-flash",
        config: {
          systemInstruction: `${SYSTEM_PROMPT}\n\nFARM CONTEXT:\n${farmContext}`,
          maxOutputTokens: 512,
          temperature: 0.7,
        },
      });
      setKeyMissing(false);
    } catch (err: any) {
      if (err.message === "GEMINI_API_KEY_MISSING") {
        setKeyMissing(true);
      } else {
        console.error("[AgriAdvisor] Chat init error:", err.message);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmer?.id, currentCrop?.id]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || typing) return;

    setMessages(m => [...m, { role: "user", text: text.trim(), time: now() }]);
    setInput("");
    setTyping(true);

    try {
      if (keyMissing) throw new Error("GEMINI_API_KEY_MISSING");

      // Lazy reinit if session was lost
      if (!chatRef.current) {
        const ai = getClient();
        const farmContext = buildFarmerContext(
          farmer, currentCrop, cropHealth, topRecommendations, activeAlerts
        );
        chatRef.current = ai.chats.create({
          model: "gemini-3.6-flash",
          config: {
            systemInstruction: `${SYSTEM_PROMPT}\n\nFARM CONTEXT:\n${farmContext}`,
            maxOutputTokens: 512,
            temperature: 0.7,
          },
        });
      }

      const response = await chatRef.current.sendMessage({ message: text.trim() });
      const botText = response.text?.trim() ?? "";

      setMessages(m => [...m, { role: "bot", text: botText, time: now() }]);
    } catch (err: any) {
      console.error("[AgriAdvisor] Gemini error:", err.message || err);

      let errorText: string;
      if (err.message === "GEMINI_API_KEY_MISSING") {
        errorText = "⚠️ Agri Advisor is not configured yet.\n\nAdd VITE_GEMINI_API_KEY to frontend/.env and restart the dev server.\n\nGet a free key at aistudio.google.com";
      } else if (err.message?.includes("API_KEY_INVALID") || err.message?.includes("API key")) {
        errorText = "⚠️ Gemini API key is invalid. Check VITE_GEMINI_API_KEY in frontend/.env and restart.\n\nGet a valid key at aistudio.google.com";
        chatRef.current = null;
      } else if (err.message?.includes("429") || err.message?.includes("quota")) {
        errorText = "API quota exceeded. Please try again in a minute.";
      } else if (err.message?.includes("SAFETY") || err.message?.includes("blocked")) {
        errorText = "माफ़ करें, यह सवाल नहीं पूछ सकते। कृपया कृषि से संबंधित सवाल पूछें।\n\nSorry, that question was blocked.";
      } else {
        errorText = "माफ़ करें, अभी जवाब नहीं दे पा रहा। कृपया दोबारा कोशिश करें।\n\nSorry, couldn't respond. Please try again.";
        chatRef.current = null;
      }

      setMessages(m => [...m, { role: "bot", text: errorText, time: now(), error: true }]);
    } finally {
      setTyping(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [typing, keyMissing, farmer, currentCrop, cropHealth, topRecommendations, activeAlerts]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      <PageHeader
        title="Agri Advisor"
        subtitle="AI-powered · Your farm's real data · Gemini 3.6 Flash"
        back="Dashboard"
        onBack={() => navigate("dashboard")}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: keyMissing ? C.rust : "#22c55e",
              boxShadow: keyMissing ? "none" : "0 0 0 3px rgba(34,197,94,0.2)",
            }} />
            <span style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600 }}>
              {keyMissing ? "Key missing" : "AI Online"}
            </span>
          </div>
        }
      />

      {/* Key missing banner */}
      {keyMissing && (
        <div style={{
          background: C.amberTint, border: `1px solid ${C.amber}44`,
          borderRadius: radius.lg, padding: "12px 16px",
          fontSize: 13, color: C.ink, marginBottom: 12, lineHeight: 1.5,
        }}>
          <strong>Agri Advisor needs a Gemini API key.</strong> Add{" "}
          <code style={{ background: "#fff", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>
            VITE_GEMINI_API_KEY=your_key
          </code>{" "}
          to <code style={{ background: "#fff", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>frontend/.env</code>,
          then restart the dev server.{" "}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
            style={{ color: C.amber, fontWeight: 700 }}>
            Get a free key →
          </a>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", background: C.bg,
        borderRadius: radius.xl, border: `1px solid ${C.line}`,
        padding: "20px", marginBottom: 14,
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            gap: 10, alignItems: "flex-end",
          }}>
            {msg.role === "bot" && (
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: C.sageTint, display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0, border: `1px solid ${C.sage}33`,
              }}>◈</div>
            )}
            <div style={{ maxWidth: "72%" }}>
              <div style={{
                padding: "12px 16px",
                borderRadius: msg.role === "user"
                  ? `${radius.xl}px ${radius.xl}px 4px ${radius.xl}px`
                  : `4px ${radius.xl}px ${radius.xl}px ${radius.xl}px`,
                background: msg.role === "user" ? C.sage : msg.error ? C.amberTint : C.surface,
                color: msg.role === "user" ? "#fff" : C.ink,
                fontSize: 14, lineHeight: 1.65,
                boxShadow: shadow.card,
                border: msg.role === "bot"
                  ? `1px solid ${msg.error ? C.amber + "55" : C.line}`
                  : "none",
                whiteSpace: "pre-line",
              }}>
                {formatText(msg.text)}
              </div>
              <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 4, textAlign: msg.role === "user" ? "right" : "left" }}>
                {msg.time}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: C.sageTint,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, border: `1px solid ${C.sage}33`,
            }}>◈</div>
            <div style={{
              padding: "14px 18px", background: C.surface,
              borderRadius: `4px ${radius.xl}px ${radius.xl}px ${radius.xl}px`,
              border: `1px solid ${C.line}`, boxShadow: shadow.card,
              display: "flex", gap: 5, alignItems: "center",
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%", background: C.sageMid,
                  animation: `advisor-bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.filter(m => m.role === "user").length < 2 && !keyMissing && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => send(s)} disabled={typing}
              style={{
                padding: "7px 14px", background: C.surface,
                border: `1.5px solid ${C.sage}44`, borderRadius: radius.full,
                fontSize: 12, color: C.sage, fontWeight: 600,
                cursor: typing ? "not-allowed" : "pointer",
                fontFamily: "var(--font-body)", opacity: typing ? 0.5 : 1,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!typing) (e.currentTarget as HTMLElement).style.background = C.sageTint; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.surface; }}
            >{s}</button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
          placeholder={keyMissing ? "Gemini API key required — see banner above" : "Ask about your crop, irrigation, schemes, pests…"}
          disabled={typing || keyMissing}
          style={{
            flex: 1, padding: "13px 18px",
            border: `1.5px solid ${C.line}`, borderRadius: radius.full,
            fontSize: 14, color: C.ink,
            background: typing || keyMissing ? "#f8f8f6" : C.surface,
            outline: "none", fontFamily: "var(--font-body)",
            boxShadow: shadow.card, transition: "border-color 0.15s",
          }}
          onFocus={e => (e.target.style.borderColor = C.sage)}
          onBlur={e => (e.target.style.borderColor = C.line)}
        />
        <button
          onClick={() => send(input)}
          disabled={typing || !input.trim() || keyMissing}
          style={{
            width: 48, height: 48, borderRadius: "50%",
            background: typing || !input.trim() || keyMissing ? C.inkMuted : C.sage,
            border: "none", color: "#fff", fontSize: 20,
            cursor: typing || !input.trim() || keyMissing ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: typing ? "none" : "0 4px 14px rgba(92,122,94,0.35)",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { if (!typing && input.trim() && !keyMissing) (e.currentTarget as HTMLElement).style.background = C.sageDeep; }}
          onMouseLeave={e => { if (!typing && input.trim() && !keyMissing) (e.currentTarget as HTMLElement).style.background = C.sage; }}
        >↑</button>
      </div>

      <style>{`
        @keyframes advisor-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
