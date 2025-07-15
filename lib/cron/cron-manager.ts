const { CronJob } = require('cron');

interface CronJobConfig {
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  timezone?: string;
}

class CronManager {
  private jobs: Map<string, any> = new Map();

  addJob(config: CronJobConfig) {
    if (this.jobs.has(config.name)) {
      console.warn(`Job ${config.name} already exists, stopping previous instance`);
      this.stopJob(config.name);
    }

    const job = new CronJob(
      config.schedule,
      config.handler,
      null,
      false,
      config.timezone || 'UTC'
    );

    this.jobs.set(config.name, job);
    console.log(`Added job: ${config.name} with schedule: ${config.schedule}`);
    return job;
  }

  startJob(name: string) {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      console.log(`Started job: ${name}`);
      return true;
    }
    console.error(`Job ${name} not found`);
    return false;
  }

  stopJob(name: string) {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      console.log(`Stopped job: ${name}`);
      return true;
    }
    console.error(`Job ${name} not found`);
    return false;
  }

  startAll() {
    for (const [name, job] of this.jobs) {
      job.start();
      console.log(`Started job: ${name}`);
    }
  }

  stopAll() {
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`Stopped job: ${name}`);
    }
  }

  removeJob(name: string) {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.jobs.delete(name);
      console.log(`Removed job: ${name}`);
      return true;
    }
    return false;
  }

  listJobs() {
    return Array.from(this.jobs.keys());
  }

  getJobStatus(name: string) {
    const job = this.jobs.get(name);
    if (job) {
      return {
        name,
        running: job.running,
        lastDate: job.lastDate(),
        nextDate: job.nextDate()
      };
    }
    return null;
  }
}

// Export singleton instance
export const cronManager = new CronManager();

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping all cron jobs...');
  cronManager.stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping all cron jobs...');
  cronManager.stopAll();
  process.exit(0);
});