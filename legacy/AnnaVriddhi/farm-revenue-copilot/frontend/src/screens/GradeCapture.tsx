import { useState, useRef } from "react";
import { C, radius, shadow } from "../tokens";
import { PageHeader, Btn, Badge } from "../components/ui";
import type { Screen } from "../tokens";
import { useData } from "../contexts/DataContext";
import { submitGrading } from "../api/grading";

// Crops supported by the ML grading model
const SUPPORTED_GRADING_CROPS = ["tomato", "banana", "potato", "onion"] as const;
type SupportedCrop = typeof SUPPORTED_GRADING_CROPS[number];

// Map common crop names → supported grading model crop
const CROP_NAME_MAP: Record<string, SupportedCrop> = {
  tomato: "tomato",   tomatoes: "tomato",
  banana: "banana",   bananas: "banana",
  potato: "potato",   potatoes: "potato",
  onion: "onion",     onions: "onion",
  // close enough mappings
  "cherry tomato": "tomato",
};

/**
 * Resolve the crop name from a crop object that may use different field names
 * across demo data (name), Supabase frontend schema (crop_name) and
 * the backend schema (crop_type).
 */
function resolveCropName(crop: any): string {
  if (!crop) return "";
  // Try all possible field names
  const raw =
    crop.crop_name ||     // frontend Supabase Crop type
    crop.crop_type ||     // backend schema field
    crop.name ||          // demo data field
    "";
  // Strip variety info in parentheses: "Wheat (HD-3086)" → "wheat"
  return raw.replace(/\s*\(.*?\)/, "").trim().toLowerCase();
}

/**
 * Map a resolved crop name to a supported grading model crop.
 * Returns null if no mapping found.
 */
function mapToGradingCrop(cropName: string): SupportedCrop | null {
  if (!cropName) return null;
  const lower = cropName.toLowerCase().trim();
  return CROP_NAME_MAP[lower] ?? null;
}

export default function GradeCapture({ navigate }: { navigate: (s: Screen) => void }) {
  const { currentCrop } = useData();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCropType, setManualCropType] = useState<SupportedCrop | "">("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive crop name safely
  const resolvedCropName = resolveCropName(currentCrop);
  const autoCropType = mapToGradingCrop(resolvedCropName);

  // The crop type to actually send: auto-mapped first, manual override second
  const effectiveCropType: SupportedCrop | "" = manualCropType || autoCropType || "";

  // Display name for UI
  const displayCropName =
    (currentCrop as any)?.crop_name ||
    (currentCrop as any)?.crop_type ||
    (currentCrop as any)?.name ||
    "Not selected";

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPEG, PNG, etc.)");
      return;
    }
    setSelectedImage(file);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
    // Reset value so same file can be re-selected
    e.target.value = "";
  };

  async function handleAnalyze() {
    if (!selectedImage) {
      setError("Please select an image first.");
      return;
    }
    if (!effectiveCropType) {
      setError("Please select the produce type below before analyzing.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      formData.append("crop", effectiveCropType);
      if (currentCrop?.id) {
        formData.append("cropId", currentCrop.id);
      }

      const result = await submitGrading(formData);

      // Store result for GradingResult page
      sessionStorage.setItem("latest_grading_result", JSON.stringify(result));
      navigate("grading-result");
    } catch (err: any) {
      console.error("Grading error:", err);
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Analysis failed. Please try again.";
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  }

  const needsManualCrop = !autoCropType;

  return (
    <div>
      <PageHeader
        title="Grade Produce"
        subtitle="Photograph your batch for instant quality grading"
        back="Dashboard"
        onBack={() => navigate("dashboard")}
        actions={<Badge color={C.blue} bg={C.blueTint}>AI-powered · RGB analysis</Badge>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>

        {/* ── Image area ── */}
        <div
          style={{
            background: "#0d1117",
            borderRadius: radius.xxl,
            overflow: "hidden",
            position: "relative",
            aspectRatio: "16/10",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: shadow.lg,
            cursor: imagePreview ? "default" : "pointer",
          }}
          onClick={() => !imagePreview && fileInputRef.current?.click()}
        >
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Selected produce"
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
            />
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "#fff" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📷</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Upload Produce Image
              </div>
              <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 16 }}>
                Click anywhere here to select an image from your device
              </div>
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 20px",
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: radius.full,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Browse files
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: "none" }}
          />

          {/* Guide frame */}
          <div
            style={{
              position: "absolute",
              inset: "12%",
              border: "2px solid rgba(255,255,255,0.5)",
              borderRadius: radius.xl,
              pointerEvents: "none",
            }}
          >
            {[
              { top: -2, left: -2, borderTop: "3px solid #fff", borderLeft: "3px solid #fff" },
              { top: -2, right: -2, borderTop: "3px solid #fff", borderRight: "3px solid #fff" },
              { bottom: -2, left: -2, borderBottom: "3px solid #fff", borderLeft: "3px solid #fff" },
              { bottom: -2, right: -2, borderBottom: "3px solid #fff", borderRight: "3px solid #fff" },
            ].map((s, i) => (
              <div key={i} style={{ position: "absolute", width: 28, height: 28, borderRadius: 4, ...s }} />
            ))}
          </div>

          {/* Top bar */}
          <div
            style={{
              position: "absolute", top: 0, left: 0, right: 0,
              padding: "14px 18px",
              background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>LIVE</span>
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
              {effectiveCropType
                ? `${effectiveCropType.charAt(0).toUpperCase() + effectiveCropType.slice(1)} · Grading ready`
                : "Select produce type →"}
            </span>
          </div>

          {/* Analyzing overlay */}
          {analyzing && (
            <div
              style={{
                position: "absolute", inset: 0,
                background: "rgba(13,17,23,0.75)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 16,
              }}
            >
              <div style={{ width: 60, height: 60, border: `3px solid ${C.sage}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>Analysing produce…</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Checking size · colour · surface quality</div>
            </div>
          )}

          {/* Error banner */}
          {error && !analyzing && (
            <div
              style={{
                position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
                background: "rgba(180,30,30,0.92)",
                color: "#fff", fontSize: 13, fontWeight: 600,
                padding: "9px 18px", borderRadius: radius.md,
                backdropFilter: "blur(4px)",
                maxWidth: "85%", textAlign: "center", lineHeight: 1.4,
                boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
              }}
            >
              {error}
            </div>
          )}

          {/* Action buttons */}
          {imagePreview && !analyzing && (
            <div
              style={{
                position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
                display: "flex", gap: 12,
              }}
            >
              <button
                onClick={handleAnalyze}
                disabled={!effectiveCropType}
                style={{
                  padding: "12px 26px",
                  background: effectiveCropType ? C.sage : "rgba(255,255,255,0.25)",
                  color: "#fff",
                  border: "none",
                  borderRadius: radius.full,
                  cursor: effectiveCropType ? "pointer" : "not-allowed",
                  fontSize: 14, fontWeight: 700,
                  boxShadow: effectiveCropType ? "0 4px 20px rgba(0,0,0,0.45)" : "none",
                  transition: "all 0.15s",
                }}
              >
                🔍 Analyze Quality
              </button>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                  setError(null);
                  setManualCropType("");
                }}
                style={{
                  padding: "12px 22px",
                  background: "rgba(255,255,255,0.18)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: radius.full,
                  cursor: "pointer",
                  fontSize: 14, fontWeight: 600,
                }}
              >
                Change Image
              </button>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Batch details */}
          <div
            style={{
              background: C.surface, borderRadius: radius.xl,
              padding: "20px", border: `1px solid ${C.line}`, boxShadow: shadow.card,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 14 }}>Batch details</div>
            {[
              { label: "Crop", value: displayCropName },
              { label: "Variety", value: (currentCrop as any)?.variety || "—" },
              { label: "Status", value: selectedImage ? "Image ready" : "No image selected" },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13,
                }}
              >
                <span style={{ color: C.inkMuted }}>{label}</span>
                <span style={{ color: C.ink, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Produce type selector — always visible */}
          <div
            style={{
              background: needsManualCrop && !manualCropType ? C.amberTint : C.surface,
              borderRadius: radius.xl,
              padding: "18px 20px",
              border: `1.5px solid ${needsManualCrop && !manualCropType ? C.amber + "55" : C.line}`,
              boxShadow: shadow.card,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
              Produce type for grading
            </div>
            {needsManualCrop && !manualCropType && (
              <div style={{ fontSize: 11, color: C.amber, fontWeight: 600, marginBottom: 10 }}>
                ⚠ Your crop ({resolvedCropName || "unknown"}) needs manual selection
              </div>
            )}
            {autoCropType && !manualCropType && (
              <div style={{ fontSize: 11, color: C.sage, fontWeight: 600, marginBottom: 10 }}>
                ✓ Auto-detected: {autoCropType}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
              {SUPPORTED_GRADING_CROPS.map((c) => {
                const isSelected = effectiveCropType === c;
                return (
                  <button
                    key={c}
                    onClick={() => setManualCropType(c)}
                    style={{
                      padding: "10px 8px",
                      background: isSelected ? C.sageDeep : C.bg,
                      color: isSelected ? "#fff" : C.ink,
                      border: `1.5px solid ${isSelected ? C.sageDeep : C.line}`,
                      borderRadius: radius.md,
                      fontSize: 13, fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      textTransform: "capitalize",
                      transition: "all 0.15s",
                    }}
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                );
              })}
            </div>
            {manualCropType && (
              <button
                onClick={() => setManualCropType("")}
                style={{
                  marginTop: 8, width: "100%",
                  padding: "6px", background: "transparent",
                  color: C.inkMuted, border: `1px solid ${C.line}`,
                  borderRadius: radius.md, fontSize: 11, cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                ← Reset to auto-detect
              </button>
            )}
          </div>

          {/* What we check */}
          <div
            style={{
              background: C.sageTint, borderRadius: radius.xl,
              padding: "16px 18px", border: `1px solid ${C.sage}22`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: C.sageDeep, marginBottom: 8 }}>What we check</div>
            {[
              { icon: "▭", label: "Size & shape uniformity" },
              { icon: "🎨", label: "Colour consistency & ripeness" },
              { icon: "🔍", label: "Surface blemishes & foreign matter" },
              { icon: "≈",  label: "Moisture content estimate" },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, fontSize: 12, color: C.inkMuted }}>
                <span>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>

          <Btn variant="secondary" fullWidth onClick={() => navigate("grading-history")}>
            ▦ View grading history
          </Btn>
        </div>
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
