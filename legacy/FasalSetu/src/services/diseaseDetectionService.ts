// diseaseDetectionService.ts — matches your HomePage.tsx result shape exactly

const MODEL_API_URL = (import.meta as any).env.VITE_MODEL_API_URL;

// ── Result shape your component expects ───────────────────────────────────────
export interface StructuredResult {
  plantName  : string;
  diseaseName: string;
  severity   : 'severe' | 'moderate' | 'mild' | 'healthy' | 'unknown';
  confidence : number;          // 0–100 (percentage)
  isHealthy  : boolean;
  treatment  : string[];        // array of steps
  prevention : string[];        // array of steps
  notes      : string;
  image_url  : string;
  model_used : string;
}

export interface DetectionResponse {
  structured: StructuredResult | null;
  raw       : any;
}

// ── Convert base64 data URL → File object ────────────────────────────────────
function base64ToFile(base64: string, filename = 'crop.jpg'): File {
  // base64 may be "data:image/jpeg;base64,/9j/..." or just the raw base64
  const parts    = base64.split(',');
  const mime     = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const byteStr  = atob(parts.length > 1 ? parts[1] : parts[0]);
  const arr      = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

// ── Call Flask backend ────────────────────────────────────────────────────────
async function callBackend(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file, file.name);   // file is a proper Blob — no error

  const res = await fetch(`${MODEL_API_URL}/predict`, {
    method: 'POST',
    body  : formData
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Server ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Parse treatment string → array of steps ──────────────────────────────────
function toSteps(text: string): string[] {
  if (!text) return ['Consult your local KVK for guidance.'];
  // Split on ". " or numbered patterns like "1. "
  const steps = text
    .split(/\.\s+(?=[A-Z0-9])|\d+\.\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 4);
  return steps.length ? steps : [text];
}

// ── Prevention steps based on disease ────────────────────────────────────────
function getPrevention(disease: string, isHealthy: boolean): string[] {
  if (isHealthy) return [
    'Continue current crop management practices.',
    'Monitor regularly for early signs of stress or disease.',
    'Maintain proper soil nutrition with balanced NPK.'
  ];
  const d = disease.toLowerCase();
  if (d.includes('blight')) return [
    'Use certified disease-free seeds next season.',
    'Apply preventive copper fungicide spray at planting.',
    'Ensure proper field drainage to reduce moisture stress.',
    'Rotate crops — avoid same family for 2 seasons.'
  ];
  if (d.includes('rust')) return [
    'Plant rust-resistant varieties like HD-2967 for wheat.',
    'Apply propiconazole preventively at tillering stage.',
    'Monitor weather — rust spreads fast in cool humid conditions.'
  ];
  if (d.includes('mildew')) return [
    'Improve spacing between plants for air circulation.',
    'Avoid overhead irrigation — water at base of plant.',
    'Apply sulphur dust preventively in dry weather.'
  ];
  if (d.includes('smut') || d.includes('rice')) return [
    'Treat seeds with carbendazim 2g/kg before sowing.',
    'Remove and destroy infected crop residue after harvest.',
    'Avoid excessive nitrogen fertilisation.'
  ];
  return [
    'Use disease-resistant varieties next season.',
    'Maintain field hygiene — remove infected plant material.',
    'Follow recommended crop rotation practices.',
    'Apply preventive fungicide at early growth stage.'
  ];
}

// ── Extract plant name from class string ──────────────────────────────────────
function extractPlant(raw: string): string {
  // raw_class like "Tomato___Early_blight" or "Rice - Bacterial leaf blight"
  const part = raw.split(/___|-/)[0].trim();
  return part.replace(/_/g, ' ').replace(/\(.*?\)/g, '').trim() || 'Unknown';
}

// ── Severity from confidence ──────────────────────────────────────────────────
function toSeverity(
  conf: number,
  isHealthy: boolean
): StructuredResult['severity'] {
  if (isHealthy)  return 'healthy';
  if (conf > 0.9) return 'severe';
  if (conf > 0.75) return 'moderate';
  if (conf > 0.55) return 'mild';
  return 'unknown';
}

// ── Build structured result from raw API response ─────────────────────────────
function buildStructured(raw: any, imageUrl: string): StructuredResult {
  const rawClass  = raw.raw_class || raw.disease_detected || raw.disease || '';
  const disease   = raw.disease   || raw.disease_detected || 'Unknown';
  const isHealthy = raw.is_healthy ?? disease.toLowerCase().includes('healthy');
  const conf      = Math.round((raw.confidence || 0) * 100); // 0.87 → 87

  const plantName   = extractPlant(rawClass) || raw.crop_type || 'Unknown';
  const diseaseName = isHealthy
    ? 'Healthy — No disease detected'
    : disease.replace(/___/g, ' — ').replace(/_/g, ' ');

  const treatmentText = raw.treatment || '';
  const treatment     = toSteps(treatmentText);

  // Add organic alternative as extra treatment step if present
  if (raw.organic_alternative && !isHealthy) {
    treatment.push(`Organic option: ${raw.organic_alternative}`);
  }

  const notes = raw.model_used?.includes('Gemini')
    ? `Low confidence from trained model — Gemini fallback used. Verify with local expert.`
    : raw.trained_model_suggestion
      ? `Trained model suggested: ${raw.trained_model_suggestion}`
      : '';

  return {
    plantName,
    diseaseName,
    severity  : toSeverity(raw.confidence || 0, isHealthy),
    confidence: conf,
    isHealthy,
    treatment,
    prevention: getPrevention(disease, isHealthy),
    notes,
    image_url : imageUrl,
    model_used: raw.model_used || 'EfficientNet-B2'
  };
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function detectDiseaseFromImage(
  input: string | File    // accepts EITHER base64 string OR File object
): Promise<DetectionResponse | null> {
  try {
    // Convert base64 → File if needed (HomePage passes base64)
    const file = typeof input === 'string'
      ? base64ToFile(input, 'crop-upload.jpg')
      : input;

    console.log('Sending to backend:', file.name, file.size, 'bytes');

    const raw      = await callBackend(file);
    const imageUrl = raw.image_url || URL.createObjectURL(file);
    const structured = buildStructured(raw, imageUrl);

    console.log('Structured result:', structured);
    return { structured, raw };

  } catch (err: any) {
    console.error('detectDiseaseFromImage failed:', err);
    return null;
  }
}