import { cronManager } from './cron-manager';

const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXTAUTH_URL
    : 'http://localhost:3000';

async function triggerMonthlyPnLCalculation() {
  try {
    console.log(`[${new Date().toISOString()}] Triggering monthly P&L calculation...`);

    const response = await fetch(`${API_BASE_URL}/api/monthly-pnl`, {
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
    console.log(`[${new Date().toISOString()}] Monthly P&L calculation completed:`, {
      status: result.status,
      processedStrategies: result.processedStrategies,
      processed: result.processed,
      errors: result.errors
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Monthly P&L calculation failed:`, error);
  }
}

/**
 * Start the monthly P&L calculator cron job
 * Runs every day at 00:00:00 UTC+8 (16:00:00 UTC)
 */
function startMonthlyPnLCalculator() {
  const jobName = 'monthly-pnl-calculator';
  // Cron expression: 0 16 * * * (every day at 16:00 UTC = 00:00 UTC+8)
  const schedule = '0 16 * * *';
  
  cronManager.addJob({
    name: jobName,
    schedule,
    handler: triggerMonthlyPnLCalculation,
    timezone: 'UTC'
  });
  
  cronManager.startJob(jobName);
  
  console.log('Monthly P&L calculator started (daily at 00:00 UTC+8)');
  
  return cronManager;
}

/**
 * Stop the monthly P&L calculator
 */
function stopMonthlyPnLCalculator() {
  cronManager.stopJob('monthly-pnl-calculator');
  console.log('Monthly P&L calculator stopped');
}

export {
  triggerMonthlyPnLCalculation,
  startMonthlyPnLCalculator,
  stopMonthlyPnLCalculator
};

// Allow command line execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--start-cron')) {
    // Start the cron job
    startMonthlyPnLCalculator();
  } else {
    // Default: Run once for testing
    triggerMonthlyPnLCalculation()
      .then(() => {
        console.log('One-time execution completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('One-time execution failed:', error);
        process.exit(1);
      });
  }
}