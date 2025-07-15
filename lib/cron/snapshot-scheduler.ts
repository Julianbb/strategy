import { cronManager } from './cron-manager';

const SNAPSHOT_API_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXTAUTH_URL
    : 'http://localhost:3000';

async function triggerSnapshot() {
  try {
    console.log(`[${new Date().toISOString()}] Triggering strategy snapshot...`);

    const response = await fetch(`${SNAPSHOT_API_URL}/api/snapshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[${new Date().toISOString()}] Snapshot completed:`, {
      status: result.status,
      processedStrategies: result.processedStrategies,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Snapshot failed:`, error);
  }
}

function startSnapshotScheduler(testMode = false) {
  const jobName = 'snapshot-scheduler';
  const schedule = testMode ? '*/30 * * * * *' : '*/10 * * * *';
  
  cronManager.addJob({
    name: jobName,
    schedule,
    handler: triggerSnapshot,
  });
  
  cronManager.startJob(jobName);
  
  if (testMode) {
    console.log('Starting snapshot scheduler in TEST mode (every 30 seconds)');
  } else {
    console.log('Starting snapshot scheduler (every 10 minutes)');
  }
  
  return cronManager;
}

function stopSnapshotScheduler() {
  cronManager.stopJob('snapshot-scheduler');
  console.log('Snapshot scheduler stopped');
}

module.exports = {
  startSnapshotScheduler,
  stopSnapshotScheduler,
};

// 允许命令行直接执行该文件
if (require.main === module) {
  const isTestMode = process.argv.includes('--test');
  startSnapshotScheduler(isTestMode);
}
