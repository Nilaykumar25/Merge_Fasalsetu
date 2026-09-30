import { useState } from "react";
import { C, radius, shadow } from "../tokens";
import { PageHeader, Badge } from "../components/ui";
import type { Screen } from "../tokens";

const waveCount = 32;

export default function Voice({ navigate }: { navigate: (s: Screen) => void }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedLang, setSelectedLang] = useState<"hi" | "kn" | "ta">("hi");

  const messages = [
    { lang: "hi", label: "Hindi", flag: "🇮🇳", text: "नमस्ते रमेश जी। आज आपके खेत में कोई समस्या नहीं है। फसल स्वस्थ है। कल सुबह एक और जाँच होगी।", duration: "0:18" },
    { lang: "kn", label: "Kannada", flag: "🇮🇳", text: "ನಮಸ್ಕಾರ ರಮೇಶ್ ಜೀ. ಇಂದು ನಿಮ್ಮ ಹೊಲದಲ್ಲಿ ಯಾವುದೇ ಸಮಸ್ಯೆ ಇಲ್ಲ. ಬೆಳೆ ಆರೋಗ್ಯಕರವಾಗಿದೆ.", duration: "0:16" },
    { lang: "ta", label: "Tamil", flag: "🇮🇳", text: "வணக்கம் ரமேஷ் ஜீ. இன்று உங்கள் வயலில் எந்த பிரச்னையும் இல்லை. பயிர் ஆரோக்கியமாக உள்ளது.", duration: "0:17" },
  ];

  const current = messages.find((m) => m.lang === selectedLang)!;

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    setPlaying(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setPlaying(false);
          return 100;
        }
        return p + 1.2;
      });
    }, 200);
  }

  return (
    <div>
      <PageHeader
        title="Voice Playback"
        subtitle="Latest message — All clear, 10 Sep 2026"
        back="Messages"
        onBack={() => navigate("messages")}
        actions={<Badge color={C.sage} bg={C.sageTint}>Text-to-Speech · Google Cloud TTS</Badge>}
      />

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Main player */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              background: `linear-gradient(135deg, ${C.sageDeep} 0%, #2a3d2c 60%, #1a2a1c 100%)`,
              borderRadius: radius.xxl,
              padding: "48px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: `${C.sage}12` }} />

            {/* Language selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 36, position: "relative" }}>
              {messages.map((m) => (
                <button
                  key={m.lang}
                  onClick={() => { setSelectedLang(m.lang as "hi" | "kn" | "ta"); setPlaying(false); setProgress(0); }}
                  style={{
                    padding: "8px 18px",
                    borderRadius: radius.full,
                    border: "none",
                    background: selectedLang === m.lang ? C.sage : "rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    transition: "all 0.15s",
                  }}
                >
                  {m.flag} {m.label}
                </button>
              ))}
            </div>

            {/* Play button */}
            <button
              onClick={togglePlay}
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: playing ? C.amber : C.sage,
                border: "none",
                color: "#fff",
                fontSize: 36,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 8px 32px ${playing ? C.amber : C.sage}44`,
                transition: "all 0.2s",
                marginBottom: 32,
                position: "relative",
              }}
            >
              {playing ? "⏸" : "▶"}
              {/* Pulse ring */}
              {playing && (
                <div style={{ position: "absolute", inset: -12, borderRadius: "50%", border: `2px solid ${C.sage}`, animation: "pulseRing 1.5s ease-out infinite" }} />
              )}
            </button>

            {/* Waveform */}
            <div style={{ display: "flex", gap: 3, alignItems: "center", height: 60, marginBottom: 20, width: "100%" }}>
              {Array.from({ length: waveCount }).map((_, i) => {
                const pct = (i / waveCount) * 100;
                const active = playing && pct <= progress;
                const heights = [24, 36, 20, 48, 32, 44, 28, 56, 40, 32, 20, 44, 36, 24, 52, 36, 28, 48, 20, 40, 56, 32, 44, 24, 36, 52, 28, 40, 20, 48, 36, 28];
                const h = heights[i % heights.length];
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: h,
                      borderRadius: 3,
                      background: active ? C.sage : "rgba(255,255,255,0.2)",
                      transition: "background 0.1s",
                      animation: playing && active ? `waveAnim ${0.3 + (i % 5) * 0.1}s ease-in-out infinite alternate` : "none",
                    }}
                  />
                );
              })}
            </div>

            {/* Progress */}
            <div style={{ width: "100%", height: 4, borderRadius: 999, background: "rgba(255,255,255,0.15)", overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", width: `${progress}%`, background: C.sage, borderRadius: 999, transition: "width 0.2s" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
              <span>{Math.floor(progress * 0.18 / 100 * 60)}s</span>
              <span>{current.duration}</span>
            </div>
          </div>

          {/* Transcript */}
          <div
            style={{
              background: C.surface,
              borderRadius: radius.xl,
              padding: "20px 24px",
              border: `1px solid ${C.line}`,
              boxShadow: shadow.card,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkMuted, marginBottom: 10 }}>Transcript — {current.label}</div>
            <div style={{ fontSize: 16, color: C.ink, lineHeight: 1.8 }}>{current.text}</div>
          </div>
        </div>

        {/* Recent voice messages */}
        <div
          style={{
            width: 300,
            background: C.surface,
            borderRadius: radius.xl,
            border: `1px solid ${C.line}`,
            boxShadow: shadow.card,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.line}`, fontSize: 12, fontWeight: 700, color: C.ink }}>Recent voice messages</div>
          {[
            { title: "All clear — no action today", time: "Today 6:12 AM", duration: "0:18", icon: "✓" },
            { title: "Grading result: Batch #2", time: "Sep 07", duration: "0:22", icon: "⊙" },
            { title: "Harvest window identified", time: "Sep 06", duration: "0:31", icon: "◈" },
            { title: "Irrigation needed — 24h", time: "Sep 05 · Urgent", duration: "0:24", icon: "!" },
          ].map(({ title, time, duration, icon }, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                padding: "12px 18px",
                borderBottom: i < 3 ? `1px solid ${C.line}` : "none",
                cursor: "pointer",
                transition: "background 0.15s",
                alignItems: "center",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = C.bg)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 1 }}>{time} · {duration}</div>
              </div>
              <div style={{ color: C.sage, fontSize: 18, flexShrink: 0 }}>▶</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulseRing { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes waveAnim { from { transform: scaleY(0.7); } to { transform: scaleY(1.2); } }
      `}</style>
    </div>
  );
}
