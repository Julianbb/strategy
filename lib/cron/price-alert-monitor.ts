import { cronManager } from './cron-manager';

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

function startPriceAlertMonitor(testMode = false) {
  const jobName = 'price-alert-monitor';
  const schedule = testMode ? '*/30 * * * * *' : '0 * * * * *';
  
  cronManager.addJob({
    name: jobName,
    schedule,
    handler: checkPriceAlerts,
  });
  
  cronManager.startJob(jobName);
  
  if (testMode) {
    console.log('Starting price alert monitor in TEST mode (every 30 seconds)');
  } else {
    console.log('Starting price alert monitor (every 1 minute)');
  }
  
  return cronManager;
}

function stopPriceAlertMonitor() {
  cronManager.stopJob('price-alert-monitor');
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
}