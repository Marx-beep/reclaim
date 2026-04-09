import { Worker } from "bullmq";
import { QUEUE_NAMES } from "../constants";
import { redisConnection } from "../queues/connection";
import type { RescheduleJobPayload } from "../jobs/types";

const schedulerBaseUrl = process.env.SCHEDULER_BASE_URL ?? "http://localhost:8000";

export const rescheduleWorker = new Worker<RescheduleJobPayload>(
  QUEUE_NAMES.reschedule,
  async (job) => {
    const response = await fetch(`${schedulerBaseUrl}/schedule/recompute-window`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: job.data.userId,
        windowStart: job.data.windowStart,
        windowEnd: job.data.windowEnd,
        trigger: job.data.trigger
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Scheduler recompute failed: ${response.status} ${text}`);
    }

    return response.json();
  },
  { connection: redisConnection, skipVersionCheck: true }
);
