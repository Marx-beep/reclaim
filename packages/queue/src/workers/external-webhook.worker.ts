import { Worker } from "bullmq";
import { QUEUE_NAMES } from "../constants";
import { redisConnection } from "../queues/connection";

export const externalWebhookWorker = new Worker(
  QUEUE_NAMES.externalWebhook,
  async (job) => {
    return { ok: true, source: "external-webhook", data: job.data };
  },
  { connection: redisConnection, skipVersionCheck: true }
);
