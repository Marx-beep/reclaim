import { Worker } from "bullmq";
import { QUEUE_NAMES } from "../constants";
import { redisConnection } from "../queues/connection";

export const cleanupWorker = new Worker(
  QUEUE_NAMES.cleanup,
  async (job) => {
    return { cleaned: true, cutoff: job.data?.cutoff ?? null };
  },
  { connection: redisConnection, skipVersionCheck: true }
);
