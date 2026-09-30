import { useState, useEffect, useRef } from "react";
import { C, radius, shadow } from "../tokens";
import { Card, PageHeader, Badge, Btn, IconBadge } from "../components/ui";
import type { Screen } from "../tokens";
import { detectDisease, getSupportedClasses } from "../api";

interface DetectionResult {
  success: boolean;
  analyzedAt: string;
  detection: {
    className: string;
    crop: string;
    disease: string | null;
    healthy: boolean;
    confidence: number;
    confidenceLevel: string;
    category: string;
    scientificName?: string;
  };
  assessment: {
    status: string;
    riskLevel: string;
    action: string;
    message: string;
    requiresAttention: boolean;
    urgent: boolean;
  };
  knowledge: {
    symptoms: string[];
    treatment: string[];
    prevention: string[];
    organic?: string[];
  } | null;
  model: {
    name: string;
    provider: string;
  };
}

interface SupportedClasses {
  crops: string[];
  classes: Array<{ crop: string; diseases: string[] }>;
}

export default function DiseaseDetection({ navigate }: { navigate: (s: Screen) => void }) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supportedClasses, setSupportedClasses] = useState<SupportedClasses | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load supported classes on mount
  useEffect(() => {
    getSupportedClasses()
      .then(setSupportedClasses)
      .catch(console.error);
  }, []);

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setSelectedImage(file);
    setError(null);
    setResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const detectionResult = await detectDisease(selectedImage);
      setResult(detectionResult);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to analyze image. Please try again.");
      console.error("Disease detection error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case "high":
      case "urgent":
        return { color: "#dc2626", bg: "#fef2f2" };
      case "medium":
      case "moderate":
        return { color: C.amber, bg: C.amberTint };
      case "low":
      case "clear":
        return { color: C.sage, bg: C.sageTint };
      default:
        return { color: C.inkMuted, bg: C.bg };
    }
  };

  const getStatusBadge = () => {
    if (!result) {
      return <Badge color={C.inkMuted} bg={C.bg}>No analysis yet</Badge>;
    }
    if (result.detection.healthy) {
      return <Badge color={C.sage} bg={C.sageTint}>No disease detected</Badge>;
    }
    const riskColors = getRiskColor(result.assessment.riskLevel);
    return <Badge color={riskColors.color} bg={riskColors.bg}>{result.assessment.riskLevel} risk</Badge>;
  };

  return (
    <div>
      <PageHeader
        title="Disease Detection"
        subtitle="AI-powered crop image analysis · Plot A"
        back="Dashboard"
        onBack={() => navigate("dashboard")}
        actions={getStatusBadge()}
      />

      <div style={{ display: "grid", gridTemplateColumns: selectedImage ? "1fr 420px" : "1fr", gap: 20, marginBottom: 20 }}>
        {/* Main Analysis Section - LEFT */}
        <Card hover={false} style={{ padding: 0, overflow: "hidden" }}>
          {!imagePreview ? (
            // Upload Zone
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              style={{
                minHeight: 400,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
                border: `2px dashed ${C.line}`,
                borderRadius: radius.lg,
                margin: 20,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.sage;
                e.currentTarget.style.backgroundColor = C.sageTint;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.line;
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <IconBadge bg={C.sageTint} size={64}>📷</IconBadge>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginTop: 16 }}>Upload Crop or Leaf Image</div>
              <div style={{ fontSize: 13, color: C.inkMuted, marginTop: 8, textAlign: "center", maxWidth: 400 }}>
                Click to browse or drag and drop an image of your crop or leaf to detect diseases
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <Badge color={C.sage}>📷 Camera</Badge>
                <Badge color={C.blue}>🖼️ Gallery</Badge>
                <Badge color={C.amber}>📁 File Upload</Badge>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                style={{ display: "none" }}
              />
            </div>
          ) : (
            // Image Preview and Analysis
            <>
              <div style={{ position: "relative" }}>
                <img
                  src={imagePreview}
                  alt="Uploaded crop"
                  style={{ width: "100%", height: 420, objectFit: "cover", display: "block" }}
                />
                {isAnalyzing && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(255,255,255,0.9)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Analyzing image...</div>
                    <div style={{ fontSize: 13, color: C.inkMuted, marginTop: 8 }}>
                      Running AI disease detection model
                    </div>
                  </div>
                )}
              </div>
              <div style={{ padding: "20px 24px" }}>
                {result ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
                      Analysis completed — {new Date(result.analyzedAt).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: C.inkMuted }}>
                      ML model: {result.model.name} · Confidence: {result.detection.confidence}% · 
                      Crop: {result.detection.crop}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12 }}>
                      Ready to analyze
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <Btn variant="primary" onClick={handleAnalyze} disabled={isAnalyzing}>
                        🔍 Analyze for Disease
                      </Btn>
                      <Btn variant="secondary" onClick={handleReset}>
                        ✕ Cancel
                      </Btn>
                    </div>
                  </>
                )}
                {error && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "12px 16px",
                      background: "#fef2f2",
                      border: "1px solid #fca5a5",
                      borderRadius: radius.md,
                      fontSize: 12,
                      color: "#dc2626",
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Results Panel - RIGHT */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Main Result Card */}
            <Card
              hover={false}
              style={{
                background: result.detection.healthy ? C.sageTint : getRiskColor(result.assessment.riskLevel).bg,
                border: `1px solid ${result.detection.healthy ? C.sage : getRiskColor(result.assessment.riskLevel).color}33`,
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>{result.detection.healthy ? "✓" : "⚠"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
                    {result.detection.healthy ? "No Disease Detected" : result.detection.disease}
                  </div>
                  <Badge
                    color={getRiskColor(result.assessment.riskLevel).color}
                    size="sm"
                  >
                    {result.assessment.riskLevel}
                  </Badge>
                  {result.detection.scientificName && (
                    <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 6, fontStyle: "italic" }}>
                      {result.detection.scientificName}
                    </div>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 12, color: C.inkMuted, lineHeight: 1.6, margin: 0 }}>
                {result.assessment.message}
              </p>
            </Card>

            {/* Treatment & Prevention for Disease */}
            {result.knowledge && !result.detection.healthy && (
              <>
                {/* Symptoms */}
                {result.knowledge.symptoms.length > 0 && (
                  <Card hover={false} style={{ padding: "18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🔬</span> Symptoms
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: C.inkMuted, lineHeight: 1.7 }}>
                      {result.knowledge.symptoms.map((symptom, i) => (
                        <li key={i}>{symptom}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Treatment */}
                {result.knowledge.treatment.length > 0 && (
                  <Card hover={false} style={{ padding: "18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>💊</span> Treatment
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: C.inkMuted, lineHeight: 1.7 }}>
                      {result.knowledge.treatment.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Prevention */}
                {result.knowledge.prevention.length > 0 && (
                  <Card hover={false} style={{ padding: "18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🛡️</span> Prevention
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: C.inkMuted, lineHeight: 1.7 }}>
                      {result.knowledge.prevention.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Organic Options */}
                {result.knowledge.organic && result.knowledge.organic.length > 0 && (
                  <Card hover={false} style={{ padding: "18px", background: "#f0fdf4", border: "1px solid #86efac" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.sageDeep, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🌿</span> Organic Options
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: C.inkMuted, lineHeight: 1.7 }}>
                      {result.knowledge.organic.map((option, i) => (
                        <li key={i}>{option}</li>
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            )}

            {/* Action Button */}
            {result && (
              <Btn variant="secondary" size="lg" onClick={handleReset}>
                📷 Analyze Another Image
              </Btn>
            )}
          </div>
        )}
      </div>

      {/* Supported Diseases Section */}
      {supportedClasses && (
        <Card hover={false} style={{ padding: "24px 28px", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 16 }}>
            Supported Diseases ({supportedClasses.classes.reduce((acc, c) => acc + c.diseases.length, 0)} conditions)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {supportedClasses.classes.map((cropClass) =>
              cropClass.diseases.map((disease, idx) => (
                <div
                  key={`${cropClass.crop}-${idx}`}
                  style={{
                    background: C.bg,
                    borderRadius: radius.md,
                    padding: "12px 14px",
                    border: `1px solid ${C.line}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <IconBadge bg={C.surface} size={32}>
                    {getCropEmoji(cropClass.crop)}
                  </IconBadge>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 2 }}>
                      {disease}
                    </div>
                    <div style={{ fontSize: 10, color: C.inkMuted }}>{cropClass.crop}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// Helper function to get crop emoji
function getCropEmoji(crop: string): string {
  const emojiMap: Record<string, string> = {
    Apple: "🍎",
    Corn: "🌽",
    Tomato: "🍅",
    Potato: "🥔",
    Grape: "🍇",
    Pepper: "🌶️",
  };
  return emojiMap[crop] || "🌱";
}
