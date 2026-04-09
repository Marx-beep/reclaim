import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../constants";
import { redisConnection } from "./connection";

const queueOptions = { connection: redisConnection, skipVersionCheck: true };

let calendarSyncQueue: Queue | null = null;
let externalWebhookQueue: Queue | null = null;
let rescheduleQueue: Queue | null = null;
let analyticsRollupQueue: Queue | null = null;
let notificationQueue: Queue | null = null;
let cleanupQueue: Queue | null = null;

export function getCalendarSyncQueue(): Queue {
  calendarSyncQueue ??= new Queue(QUEUE_NAMES.calendarSync, queueOptions);
  return calendarSyncQueue;
}

export function getExternalWebhookQueue(): Queue {
  externalWebhookQueue ??= new Queue(QUEUE_NAMES.externalWebhook, queueOptions);
  return externalWebhookQueue;
}

export function getRescheduleQueue(): Queue {
  rescheduleQueue ??= new Queue(QUEUE_NAMES.reschedule, queueOptions);
  return rescheduleQueue;
}

export function getAnalyticsRollupQueue(): Queue {
  analyticsRollupQueue ??= new Queue(QUEUE_NAMES.analyticsRollup, queueOptions);
  return analyticsRollupQueue;
}

export function getNotificationQueue(): Queue {
  notificationQueue ??= new Queue(QUEUE_NAMES.notification, queueOptions);
  return notificationQueue;
}

export function getCleanupQueue(): Queue {
  cleanupQueue ??= new Queue(QUEUE_NAMES.cleanup, queueOptions);
  return cleanupQueue;
}

export const queues = {
  getCalendarSyncQueue,
  getExternalWebhookQueue,
  getRescheduleQueue,
  getAnalyticsRollupQueue,
  getNotificationQueue,
  getCleanupQueue
};
