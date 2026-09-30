#!/usr/bin/env node
'use strict';

/**
 * scripts/seed-demo-data.js
 * Populates the database with realistic demo data for the pitch / local dev.
 *
 * Usage:
 *   node scripts/seed-demo-data.js
 *
 * Requires:
 *   - backend/.env (or environment variables) with DB_* vars set
 *   - The schema already applied: psql -d <db> -f backend/src/models/schema.sql
 */

require('dotenv').config({ path: `${__dirname}/../backend/.env` });

const { Client } = require('pg');

const client = new Client({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'farm_revenue_copilot',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'changeme',
});

// ── Demo data ────────────────────────────────────────────────────────────────

const FARMERS = [
  { id: 'f1b2c3d4-0000-0000-0000-000000000001', name: 'Ramesh Kumar',   phone: '+919876543210', state: 'Maharashtra', district: 'Pune',      land_area_ac: 3.5 },
  { id: 'f1b2c3d4-0000-0000-0000-000000000002', name: 'Sunita Devi',    phone: '+919876543211', state: 'Punjab',      district: 'Ludhiana',   land_area_ac: 6.0 },
  { id: 'f1b2c3d4-0000-0000-0000-000000000003', name: 'Arjun Patel',    phone: '+919876543212', state: 'Gujarat',     district: 'Anand',      land_area_ac: 2.0 },
];

const CROPS = [
  { id: 'c1b2c3d4-0000-0000-0000-000000000001', farmer_id: FARMERS[0].id, crop_type: 'wheat',  variety: 'HD-3086',     sow_date: '2026-06-15', expected_harvest_date: '2026-11-20', area_ac: 3.0, status: 'active' },
  { id: 'c1b2c3d4-0000-0000-0000-000000000002', farmer_id: FARMERS[1].id, crop_type: 'rice',   variety: 'PR-126',      sow_date: '2026-07-01', expected_harvest_date: '2026-11-10', area_ac: 5.0, status: 'active' },
  { id: 'c1b2c3d4-0000-0000-0000-000000000003', farmer_id: FARMERS[2].id, crop_type: 'cotton', variety: 'Bt Cotton',   sow_date: '2026-05-20', expected_harvest_date: '2026-12-15', area_ac: 2.0, status: 'active' },
];

const GRADING_EVENTS = [
  { id: 'g1b2c3d4-0000-0000-0000-000000000001', crop_id: CROPS[0].id, grade: 'A2', score: 82, breakdown: { color: 88, size: 80, moisture: 79, pestDamage: 85 }, estimated_market_price: 2350, currency: 'INR', unit: 'quintal', notes: 'Minor lodging in north quadrant.' },
  { id: 'g1b2c3d4-0000-0000-0000-000000000002', crop_id: CROPS[1].id, grade: 'B1', score: 71, breakdown: { color: 75, size: 72, moisture: 68, pestDamage: 73 }, estimated_market_price: 2100, currency: 'INR', unit: 'quintal', notes: 'Mild leaf blast detected.' },
  { id: 'g1b2c3d4-0000-0000-0000-000000000003', crop_id: CROPS[2].id, grade: 'A1', score: 91, breakdown: { color: 92, size: 90, moisture: 89, pestDamage: 93 }, estimated_market_price: 6800, currency: 'INR', unit: 'quintal', notes: null },
];

const RECOMMENDATIONS = [
  { id: 'r1b2c3d4-0000-0000-0000-000000000001', crop_id: CROPS[0].id, type: 'irrigation', priority: 'high',   title: 'Irrigate within 48 hours', body: 'Soil moisture at 28% — below 35% threshold. Apply 25mm.', status: 'pending' },
  { id: 'r1b2c3d4-0000-0000-0000-000000000002', crop_id: CROPS[0].id, type: 'fertilizer', priority: 'medium', title: 'Top-dress with urea',      body: 'Mild nitrogen deficiency — apply 20 kg/acre before rain.', status: 'acknowledged' },
  { id: 'r1b2c3d4-0000-0000-0000-000000000003', crop_id: CROPS[1].id, type: 'pesticide',  priority: 'high',   title: 'Apply fungicide — leaf blast risk', body: 'Humidity forecast >85% next 72h. Apply Tricyclazole at 0.6g/L.', status: 'pending' },
  { id: 'r1b2c3d4-0000-0000-0000-000000000004', crop_id: CROPS[2].id, type: 'scheme',     priority: 'low',    title: 'PM-KISAN instalment due', body: 'Next instalment of ₹2,000 expected by 30 Sep. Verify Aadhaar link.', status: 'pending' },
];

const SCHEMES = [
  { id: 'scheme-pm-kisan',   name: 'PM-KISAN',                            provider: 'Government of India', type: 'income_support', benefit: '₹6,000 per year direct transfer', eligibility: JSON.stringify(['land owner','small/marginal farmer']), states_eligible: null, crops_eligible: null, apply_url: 'https://pmkisan.gov.in', deadline: null },
  { id: 'scheme-fasal-bima', name: 'Pradhan Mantri Fasal Bima Yojana',    provider: 'Government of India', type: 'crop_insurance', benefit: 'Up to 100% premium subsidy',       eligibility: JSON.stringify(['all farmers']),                          states_eligible: null, crops_eligible: null, apply_url: 'https://pmfby.gov.in',    deadline: '2026-10-31' },
  { id: 'scheme-kcc',        name: 'Kisan Credit Card',                   provider: 'NABARD / Banks',       type: 'loan',           benefit: 'Credit up to ₹3 lakh at 4% p.a.', eligibility: JSON.stringify(['farmers','sharecroppers']),               states_eligible: null, crops_eligible: null, apply_url: 'https://www.nabard.org',  deadline: null },
];

// ── Seed functions ────────────────────────────────────────────────────────────

async function seedFarmers() {
  console.log('  → Seeding farmers…');
  for (const f of FARMERS) {
    await client.query(
      `INSERT INTO farmers (id, name, phone, state, district, land_area_ac)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [f.id, f.name, f.phone, f.state, f.district, f.land_area_ac]
    );
  }
}

async function seedCrops() {
  console.log('  → Seeding crops…');
  for (const c of CROPS) {
    await client.query(
      `INSERT INTO crops (id, farmer_id, crop_type, variety, sow_date, expected_harvest_date, area_ac, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.farmer_id, c.crop_type, c.variety, c.sow_date, c.expected_harvest_date, c.area_ac, c.status]
    );
  }
}

async function seedGrading() {
  console.log('  → Seeding grading events…');
  for (const g of GRADING_EVENTS) {
    await client.query(
      `INSERT INTO grading_events (id, crop_id, grade, score, breakdown, estimated_market_price, currency, unit, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [g.id, g.crop_id, g.grade, g.score, JSON.stringify(g.breakdown), g.estimated_market_price, g.currency, g.unit, g.notes]
    );
  }
}

async function seedRecommendations() {
  console.log('  → Seeding recommendations…');
  for (const r of RECOMMENDATIONS) {
    await client.query(
      `INSERT INTO recommendation_events (id, crop_id, type, priority, title, body, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.crop_id, r.type, r.priority, r.title, r.body, r.status]
    );
  }
}

async function seedSchemes() {
  console.log('  → Seeding schemes…');
  for (const s of SCHEMES) {
    await client.query(
      `INSERT INTO schemes (id, name, provider, type, benefit, eligibility, states_eligible, crops_eligible, apply_url, deadline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.name, s.provider, s.type, s.benefit, s.eligibility, s.states_eligible, s.crops_eligible, s.apply_url, s.deadline]
    );
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Farm Revenue Copilot — seeding demo data\n');

  await client.connect();
  console.log('  ✓ Connected to database\n');

  try {
    await seedFarmers();
    await seedCrops();
    await seedGrading();
    await seedRecommendations();
    await seedSchemes();
    console.log('\n✅  Seeding complete.');
  } catch (err) {
    console.error('\n❌  Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
