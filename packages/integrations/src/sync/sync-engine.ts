type EventSource = "INTERNAL" | "GOOGLE" | "OUTLOOK";
type SmartEventType = "TASK" | "HABIT" | "FOCUS" | "MEETING" | "BUFFER" | "LINK_HOLD" | "PTO";
type SmartEventPriority = "P1" | "P2" | "P3" | "P4";

export type ExternalSyncEvent = {
  externalEventId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  timezone: string;
  source: EventSource;
  isAllDay: boolean;
  metadata?: Record<string, unknown>;
};

export function mapGoogleEventToExternalSync(input: Record<string, any>): ExternalSyncEvent | null {
  const startIso = input.start?.dateTime;
  const endIso = input.end?.dateTime;
  if (!startIso || !endIso) return null;

  return {
    externalEventId: input.id,
    title: input.summary ?? "Untitled",
    description: input.description,
    startAt: startIso,
    endAt: endIso,
    timezone: input.start?.timeZone ?? "UTC",
    source: "GOOGLE",
    isAllDay: Boolean(input.start?.date),
    metadata: {
      status: input.status,
      htmlLink: input.htmlLink,
      attendees: input.attendees?.length ?? 0
    }
  };
}

export function mapOutlookEventToExternalSync(input: Record<string, any>): ExternalSyncEvent | null {
  const startIso = input.start?.dateTime;
  const endIso = input.end?.dateTime;
  if (!startIso || !endIso) return null;

  return {
    externalEventId: input.id,
    title: input.subject ?? "Untitled",
    description: input.bodyPreview,
    startAt: new Date(startIso).toISOString(),
    endAt: new Date(endIso).toISOString(),
    timezone: input.start?.timeZone ?? "UTC",
    source: "OUTLOOK",
    isAllDay: Boolean(input.isAllDay),
    metadata: {
      showAs: input.showAs,
      webLink: input.webLink,
      organizer: input.organizer?.emailAddress?.address
    }
  };
}

export function inferPriorityFromExternal(type: SmartEventType): SmartEventPriority {
  if (type === "MEETING") return "P2";
  return "P3";
}
