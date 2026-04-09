import { Worker } from "bullmq";
import { QUEUE_NAMES } from "../constants";
import { redisConnection } from "../queues/connection";

export const notificationWorker = new Worker(
  QUEUE_NAMES.notification,
  async (job) => {
    return { delivered: true, jobId: job.id, payload: job.data };
  },
  { connection: redisConnection, skipVersionCheck: true }
);
