import { Worker } from "bullmq";
import { QUEUE_NAMES } from "../constants";
import { redisConnection } from "../queues/connection";

export const analyticsRollupWorker = new Worker(
  QUEUE_NAMES.analyticsRollup,
  async (job) => {
    return {
      ok: true,
      processedAt: new Date().toISOString(),
      userId: job.data.userId
    };
  },
  { connection: redisConnection, skipVersionCheck: true }
);
