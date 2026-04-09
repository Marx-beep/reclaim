import { Worker } from "bullmq";
import { QUEUE_NAMES } from "../constants";
import { redisConnection } from "../queues/connection";

export const calendarSyncWorker = new Worker(
  QUEUE_NAMES.calendarSync,
  async (job) => {
    return { ok: true, received: job.data, processedAt: new Date().toISOString() };
  },
  { connection: redisConnection, skipVersionCheck: true }
);
