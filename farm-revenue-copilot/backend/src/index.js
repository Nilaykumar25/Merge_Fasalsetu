'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { initializeScheduler } = require('./jobs/scheduler');

const irrigationRoutes    = require('./routes/irrigation');
const gradingRoutes       = require('./routes/grading');
const schemesRoutes       = require('./routes/schemes');
const recommendationRoutes = require('./routes/recommendations');
const webhookRoutes       = require('./routes/webhooks');
const cropWrappedRoutes   = require('./routes/cropWrapped');
const decisionsRoutes     = require('./routes/decisions');
const diseaseRoutes       = require('./routes/disease');
const advisorRoutes       = require('./routes/advisor');
const alertsRoutes        = require('./routes/alerts');
const sensorsRoutes       = require('./routes/sensors');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ──
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ── Routes ──
app.use('/api/irrigation',      irrigationRoutes);
app.use('/api/grading',         gradingRoutes);
app.use('/api/schemes',         schemesRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/webhooks',        webhookRoutes);
app.use('/api/crop-wrapped',    cropWrappedRoutes);
app.use('/api/decisions',       decisionsRoutes);
app.use('/api/disease',         diseaseRoutes);
app.use('/api/advisor',         advisorRoutes);
app.use('/api/alerts',          alertsRoutes);
app.use('/api/sensors',         sensorsRoutes);

// ── Health check ──
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 handler ──
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ──
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] Farm Revenue Copilot API running on http://localhost:${PORT}`);
  
  // Initialize scheduled jobs
  initializeScheduler();
});

module.exports = app;
