import type { SmartEvent, SmartEventPriority } from "@prisma/client";
import { prisma } from "../client";

export type EventWindowQuery = {
  userId: string;
  windowStart: Date;
  windowEnd: Date;
};

export async function findEventsInWindow(query: EventWindowQuery): Promise<SmartEvent[]> {
  return prisma.smartEvent.findMany({
    where: {
      userId: query.userId,
      deletedAt: null,
      startAt: { lt: query.windowEnd },
      endAt: { gt: query.windowStart }
    },
    orderBy: [{ startAt: "asc" }, { priority: "asc" }]
  });
}

export async function findDueTasks(userId: string, dueBefore: Date): Promise<SmartEvent[]> {
  return prisma.smartEvent.findMany({
    where: {
      userId,
      type: "TASK",
      dueAt: { lte: dueBefore },
      status: { in: ["DRAFT", "SCHEDULED", "IN_PROGRESS"] },
      deletedAt: null
    },
    orderBy: [{ dueAt: "asc" }, { priority: "asc" }]
  });
}

export async function updatePriority(id: string, priority: SmartEventPriority): Promise<SmartEvent> {
  return prisma.smartEvent.update({
    where: { id },
    data: { priority }
  });
}
