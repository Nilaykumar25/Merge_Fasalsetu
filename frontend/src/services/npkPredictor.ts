/**
 * npkPredictor.ts
 * Runs the trained GradientBoosting model entirely in the browser.
 * No server, no ngrok — model exported from soil_agent.py / train_npk_model.py.
 *
 * Features (order matches training):
 *   [0] soil_conductivity  [1] soil_humidity  [2] soil_pH
 *   [3] soil_temperature   [4] hour           [5] day_of_year
 */
import modelData from './npkModel.json';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TreeNode {
  v?: number;           // leaf value
  f?: number;           // feature index
  t?: number;           // threshold
  l?: TreeNode;         // left child  (feature <= threshold)
  r?: TreeNode;         // right child (feature >  threshold)
}

interface ModelEntry {
  init:  number;
  lr:    number;
  trees: TreeNode[];
}

interface ModelFile {
  nitrogen:   ModelEntry;
  phosphorus: ModelEntry;
  potassium:  ModelEntry;
}

export interface NPKPrediction {
  nitrogen:   { value: number; unit: string; status: string };
  phosphorus: { value: number; unit: string; status: string };
  potassium:  { value: number; unit: string; status: string };
  confidence: string;
  recommendation: string;
}

// ── Tree traversal ────────────────────────────────────────────────────────────
function predictTree(node: TreeNode, x: number[]): number {
  if (node.v !== undefined) return node.v;
  return x[node.f!] <= node.t!
    ? predictTree(node.l!, x)
    : predictTree(node.r!, x);
}

function predictGBM(entry: ModelEntry, x: number[]): number {
  let pred = entry.init;
  for (const tree of entry.trees) {
    pred += entry.lr * predictTree(tree, x);
  }
  return pred;
}

// ── Status helpers ────────────────────────────────────────────────────────────
function status(v: number, lo: number, hi: number): string {
  if (v < lo) return 'deficient';
  if (v > hi) return 'excess';
  return 'adequate';
}

function recommendation(n: number, p: number, k: number): string {
  const tips: string[] = [];
  if (n < 24.93) tips.push('Apply Urea (46-0-0) to boost Nitrogen');
  if (p < 29.93) tips.push('Add Single Superphosphate (SSP) for Phosphorus');
  if (k < 199.93) tips.push('Apply Muriate of Potash (MOP) for Potassium');
  return tips.length ? tips.join('; ') : 'NPK levels are within normal range';
}

// ── Main export ───────────────────────────────────────────────────────────────
export function predictNPK(
  soil_conductivity: number,
  soil_humidity:     number,
  soil_pH:           number,
  soil_temperature:  number,
  hour?:             number,
  day_of_year?:      number,
): NPKPrediction {
  const now = new Date();
  const h   = hour        ?? now.getHours();
  const doy = day_of_year ?? Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000
  );

  const x = [soil_conductivity, soil_humidity, soil_pH, soil_temperature, h, doy];
  const model = modelData as unknown as ModelFile;

  const n = predictGBM(model.nitrogen,   x);
  const p = predictGBM(model.phosphorus, x);
  const k = predictGBM(model.potassium,  x);

  return {
    nitrogen:   { value: +n.toFixed(3), unit: 'mg/kg', status: status(n, 24.93, 25.05) },
    phosphorus: { value: +p.toFixed(3), unit: 'mg/kg', status: status(p, 29.93, 30.05) },
    potassium:  { value: +k.toFixed(3), unit: 'mg/kg', status: status(k, 199.93, 200.05) },
    confidence: 'GBM model · MAE ±0.06 mg/kg · runs in-browser',
    recommendation: recommendation(n, p, k),
  };
}
