'use strict';

/**
 * gradingService.js
 *
 * Orchestrates hybrid RGB quality grading:
 *   1. Receives a crop image (Buffer or temp file path) + crop name
 *   2. Calls grading/scripts/infer.py via Python subprocess
 *   3. Persists the result to Supabase produce_grades table
 *   4. Returns the structured grade response
 */

const { spawn }  = require('child_process');
const path       = require('path');
const fs         = require('fs');
const os         = require('os');
const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Supabase client (service-role key — bypasses RLS for server-side writes)
// ---------------------------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

// ---------------------------------------------------------------------------
// Path to the Python inference script  (inside backend/grading/scripts/)
// ---------------------------------------------------------------------------
const INFER_SCRIPT = path.resolve(
  __dirname, '..', '..', 'grading', 'scripts', 'infer.py'
);

// Python executable — use the system python that has PIL/cv2/numpy
const PYTHON = (() => {
  const candidates = [
    'python',
    'python3',
    path.resolve(__dirname, '..', '..', 'grading', '.venv', 'bin', 'python'),
    path.resolve(__dirname, '..', '..', 'grading', '.venv', 'bin', 'python3'),
  ];
  for (const c of candidates) {
    try {
      if ((c.startsWith('/') || c.includes('\\')) && !fs.existsSync(c)) continue;
      return c;
    } catch { /* pass */ }
  }
  return 'python';
})();


// ---------------------------------------------------------------------------
// Core: run infer.py as a subprocess
// ---------------------------------------------------------------------------

/**
 * @param {string} imagePath  - absolute path to a temp image file
 * @param {string} crop       - 'tomato' | 'banana' | 'potato' | 'onion'
 * @returns {Promise<object>} - parsed JSON result from infer.py
 */
function runInferScript(imagePath, crop) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, [INFER_SCRIPT, '--image', imagePath, '--crop', crop, '--json'], {
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', code => {
      // Clean up temp file regardless of outcome
      try { fs.unlinkSync(imagePath); } catch (_) {}

      if (code !== 0 && !stdout) {
        return reject(new Error(`infer.py exited ${code}: ${stderr.slice(0, 400)}`));
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.status === 'error') {
          return reject(new Error(parsed.message || 'Grading script error'));
        }
        resolve(parsed);
      } catch (e) {
        reject(new Error(`Could not parse infer.py output: ${stdout.slice(0, 200)}`));
      }
    });

    proc.on('error', err => {
      reject(new Error(`Failed to start Python: ${err.message}. Is Python 3 installed?`));
    });
  });
}


// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/**
 * grade({ cropId, crop, imageBuffer, notes })
 *
 * imageBuffer: Buffer from multer (req.file.buffer)
 * crop:        'tomato' | 'banana' | 'potato' | 'onion'
 * cropId:      UUID of the crop row in Supabase
 */
async function grade({ cropId, crop, imageBuffer, notes }) {
  if (!crop) throw Object.assign(new Error('crop name is required'), { status: 422 });

  // Write buffer to a temp file so Python can read it
  const tmpPath = path.join(os.tmpdir(), `av_grade_${Date.now()}.jpg`);
  fs.writeFileSync(tmpPath, imageBuffer);

  // Run the hybrid grader
  const result = await runInferScript(tmpPath, crop.toLowerCase());

  // Persist to Supabase if we have a cropId
  if (cropId && result.grade) {
    const row = {
      crop_id:                    cropId,
      grade:                      result.grade,
      quality_score:              result.quality_score ?? null,
      color_ripeness_score:       result.subscores?.color_ripeness ?? null,
      surface_quality_score:      result.subscores?.surface_defect ?? null,
      grain_size_uniformity_score: result.subscores?.shape ?? null,
      moisture_estimate:          null,
      graded_date:                new Date().toISOString().slice(0, 10),
      notes:                      notes || null,
    };

    const { error } = await supabase.from('produce_grades').insert(row);
    if (error) {
      // Log but don't fail the request — grading result is still valid
      console.error('[gradingService] DB insert failed:', error.message);
    }
  }

  return {
    cropId,
    crop,
    ...result,
    gradedAt: new Date().toISOString(),
  };
}


/**
 * getLatest(cropId) — most recent grading result for a crop
 */
async function getLatest(cropId) {
  const { data, error } = await supabase
    .from('produce_grades')
    .select('*')
    .eq('crop_id', cropId)
    .order('graded_date', { ascending: false })
    .limit(1)
    .single();

  if (error) return { cropId, grade: null, quality_score: null, gradedAt: null };
  return data;
}


/**
 * getHistory(cropId) — all grading records for a crop
 */
async function getHistory(cropId) {
  const { data, error } = await supabase
    .from('produce_grades')
    .select('*')
    .eq('crop_id', cropId)
    .order('graded_date', { ascending: false });

  if (error) return [];
  return data ?? [];
}


module.exports = { grade, getLatest, getHistory };
