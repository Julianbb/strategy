const { CronJob } = require('cron');

const SNAPSHOT_API_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_APP_URL
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

// 每 10 分钟运行一次
const snapshotJob = new CronJob(
  '*/10 * * * *',
  triggerSnapshot,
  null,
  false,
  'UTC'
);

// 每 30 秒运行一次（测试用）
const testJob = new CronJob(
  '*/30 * * * * *',
  triggerSnapshot,
  null,
  false,
  'UTC'
);

function startSnapshotScheduler(testMode = false) {
  if (testMode) {
    console.log('Starting snapshot scheduler in TEST mode (every 30 seconds)');
    testJob.start();
    return testJob;
  } else {
    console.log('Starting snapshot scheduler (every 10 minutes)');
    snapshotJob.start();
    return snapshotJob;
  }
}

function stopSnapshotScheduler() {
  snapshotJob.stop();
  testJob.stop();
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

  process.on('SIGINT', () => {
    console.log('Received SIGINT, stopping scheduler...');
    stopSnapshotScheduler();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, stopping scheduler...');
    stopSnapshotScheduler();
    process.exit(0);
  });
}
