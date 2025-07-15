const { CronJob } = require('cron');

const PRICE_ALERT_API_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXTAUTH_URL
    : 'http://localhost:3000';

async function checkPriceAlerts() {
  try {
    console.log(`[${new Date().toISOString()}] Checking price alerts...`);

    const response = await fetch(`${PRICE_ALERT_API_URL}/api/price-alerts/monitor`, {
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
    console.log(`[${new Date().toISOString()}] Price alert check completed:`, {
      status: result.status,
      checkedAlerts: result.checkedAlerts,
      triggeredAlerts: result.triggeredAlerts,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Price alert check failed:`, error);
  }
}

// 每 30 秒运行一次
const priceAlertJob = new CronJob(
  '*/30 * * * * *',
  checkPriceAlerts,
  null,
  false,
  'UTC'
);

// 每 1 分钟运行一次（生产环境）
const priceAlertJobProduction = new CronJob(
  '0 * * * * *',
  checkPriceAlerts,
  null,
  false,
  'UTC'
);

function startPriceAlertMonitor(testMode = false) {
  if (testMode) {
    console.log('Starting price alert monitor in TEST mode (every 30 seconds)');
    priceAlertJob.start();
    return priceAlertJob;
  } else {
    console.log('Starting price alert monitor (every 1 minute)');
    priceAlertJobProduction.start();
    return priceAlertJobProduction;
  }
}

function stopPriceAlertMonitor() {
  priceAlertJob.stop();
  priceAlertJobProduction.stop();
  console.log('Price alert monitor stopped');
}

module.exports = {
  startPriceAlertMonitor,
  stopPriceAlertMonitor,
};

// 允许命令行直接执行该文件
if (require.main === module) {
  const isTestMode = process.argv.includes('--test');
  startPriceAlertMonitor(isTestMode);

  process.on('SIGINT', () => {
    console.log('Received SIGINT, stopping price alert monitor...');
    stopPriceAlertMonitor();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, stopping price alert monitor...');
    stopPriceAlertMonitor();
    process.exit(0);
  });
}