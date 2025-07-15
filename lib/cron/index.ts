import { cronManager } from './cron-manager';

// Import all job modules
const snapshotScheduler = require('./snapshot-scheduler');
const priceAlertMonitor = require('./price-alert-monitor');

interface StartOptions {
  testMode?: boolean;
  jobs?: string[];
}

function startAllJobs(options: StartOptions = {}) {
  const { testMode = false, jobs } = options;
  
  console.log('=== Starting Cron Jobs ===');
  console.log(`Mode: ${testMode ? 'TEST' : 'PRODUCTION'}`);
  
  // Start snapshot scheduler
  if (!jobs || jobs.includes('snapshot')) {
    snapshotScheduler.startSnapshotScheduler(testMode);
  }
  
  // Start price alert monitor
  if (!jobs || jobs.includes('price-alerts')) {
    priceAlertMonitor.startPriceAlertMonitor(testMode);
  }
  
  // Display job status
  console.log('\n=== Active Jobs ===');
  cronManager.listJobs().forEach(jobName => {
    const status = cronManager.getJobStatus(jobName);
    console.log(`${jobName}: ${status?.running ? 'RUNNING' : 'STOPPED'}`);
    if (status?.nextDate) {
      console.log(`  Next run: ${status.nextDate.toString()}`);
    }
  });
  
  console.log('\n=== Cron Manager Started ===');
}

function stopAllJobs() {
  console.log('=== Stopping All Jobs ===');
  cronManager.stopAll();
  console.log('=== All Jobs Stopped ===');
}

function getJobsStatus() {
  const jobs = cronManager.listJobs();
  return jobs.map(jobName => cronManager.getJobStatus(jobName));
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const isTestMode = args.includes('--test');
  const specificJobs = args.filter(arg => !arg.startsWith('--'));
  
  if (args.includes('--help')) {
    console.log(`
Usage: node lib/cron/index.js [options] [jobs]

Options:
  --test          Run in test mode (faster intervals)
  --help          Show this help message

Jobs (optional, runs all if not specified):
  snapshot        Strategy snapshot scheduler
  price-alerts    Price alert monitor

Examples:
  node lib/cron/index.js                    # Start all jobs in production mode
  node lib/cron/index.js --test             # Start all jobs in test mode
  node lib/cron/index.js snapshot           # Start only snapshot scheduler
  node lib/cron/index.js --test price-alerts # Start only price alerts in test mode
    `);
    process.exit(0);
  }
  
  startAllJobs({
    testMode: isTestMode,
    jobs: specificJobs.length > 0 ? specificJobs : undefined
  });
}

export {
  startAllJobs,
  stopAllJobs,
  getJobsStatus,
  cronManager
};