'use strict';

/**
 * jobs/scheduler.js
 * Manages all scheduled background jobs using node-cron.
 */

const cron = require('node-cron');
const cropStateJob = require('./cropStateJob');
const alertJob = require('./alertJob');

/**
 * Initialize all scheduled jobs.
 * Call this once when the server starts.
 */
function initializeScheduler() {
  console.log('[scheduler] Initializing scheduled jobs…');

  // Run crop state computation every 6 hours (at :00 minutes past 0, 6, 12, 18 hours)
  // Cron format: minute hour day month day-of-week
  const cropStateSchedule = process.env.CROP_STATE_JOB_SCHEDULE || '0 */6 * * *';
  
  cron.schedule(cropStateSchedule, async () => {
    console.log('[scheduler] Triggering cropStateJob…');
    try {
      await cropStateJob.run();
      
      // Run alertJob immediately after cropStateJob completes
      console.log('[scheduler] cropStateJob complete, triggering alertJob…');
      await alertJob.run();
      
    } catch (err) {
      console.error('[scheduler] Job execution failed:', err);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'Asia/Kolkata',
  });

  console.log(`[scheduler] Jobs scheduled: ${cropStateSchedule} (${process.env.TZ || 'Asia/Kolkata'})`);
  console.log('[scheduler] - cropStateJob: Computes crop health scores');
  console.log('[scheduler] - alertJob: Evaluates conditions and sends recommendations');

  // Run once on startup (optional - comment out if you don't want immediate execution)
  if (process.env.RUN_JOBS_ON_STARTUP !== 'false') {
    console.log('[scheduler] Running jobs on startup…');
    setTimeout(async () => {
      try {
        await cropStateJob.run();
        await alertJob.run();
      } catch (err) {
        console.error('[scheduler] Initial job run failed:', err);
      }
    }, 5000); // Wait 5 seconds after server starts
  }
}

module.exports = { initializeScheduler };
