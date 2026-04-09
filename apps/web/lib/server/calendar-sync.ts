import { SmartEventType, EventSource, SmartEventPriority } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { listGoogleCalendars, listGoogleEvents, listOutlookCalendars, listOutlookEvents } from "@reclaim/integrations";
import { mapGoogleEventToExternalSync, mapOutlookEventToExternalSync } from "@reclaim/integrations";

export async function runCalendarSync(userId: string): Promise<{ synced: number; providers: string[] }> {
  const connections = await prisma.calendarConnection.findMany({
    where: {
      userId,
      status: "ACTIVE",
      deletedAt: null
    }
  });

  let syncedCount = 0;
  const providers = new Set<string>();

  for (const connection of connections) {
    providers.add(connection.provider);

    // If no token exists, create one mock event so local MVP stays demonstrable.
    if (!connection.accessTokenEnc) {
      const start = new Date();
      const end = new Date(start.getTime() + 30 * 60_000);
      await prisma.smartEvent.create({
        data: {
          userId,
          type: SmartEventType.MEETING,
          title: `${connection.provider} placeholder sync event`,
          startAt: start,
          endAt: end,
          timezone: "UTC",
          source: connection.provider === "GOOGLE" ? EventSource.GOOGLE : EventSource.OUTLOOK,
          priority: SmartEventPriority.P3,
          lockState: "BUSY"
        }
      });
      syncedCount += 1;
      continue;
    }

    const windowStart = new Date();
    const windowEnd = new Date(windowStart.getTime() + 14 * 24 * 60 * 60_000);

    if (connection.provider === "GOOGLE") {
      const calendars = await listGoogleCalendars(connection.accessTokenEnc);
      for (const externalCalendar of calendars) {
        const calendar = await prisma.externalCalendar.upsert({
          where: {
            connectionId_providerCalendarId: {
              connectionId: connection.id,
              providerCalendarId: externalCalendar.id ?? "primary"
            }
          },
          update: {
            name: externalCalendar.summary ?? "Untitled",
            timezone: externalCalendar.timeZone ?? "UTC",
            isPrimary: Boolean(externalCalendar.primary)
          },
          create: {
            userId,
            connectionId: connection.id,
            providerCalendarId: externalCalendar.id ?? "primary",
            name: externalCalendar.summary ?? "Untitled",
            timezone: externalCalendar.timeZone ?? "UTC",
            isPrimary: Boolean(externalCalendar.primary)
          }
        });

        const events = await listGoogleEvents(
          connection.accessTokenEnc,
          externalCalendar.id ?? "primary",
          windowStart.toISOString(),
          windowEnd.toISOString()
        );

        for (const externalEvent of events) {
          const mapped = mapGoogleEventToExternalSync(externalEvent as Record<string, any>);
          if (!mapped) continue;

          const smart = await prisma.smartEvent.create({
            data: {
              userId,
              calendarId: calendar.id,
              type: SmartEventType.MEETING,
              title: mapped.title,
              description: mapped.description,
              startAt: new Date(mapped.startAt),
              endAt: new Date(mapped.endAt),
              timezone: mapped.timezone,
              source: mapped.source,
              priority: SmartEventPriority.P2,
              lockState: "BUSY",
              metadata: (mapped.metadata ?? {}) as Prisma.InputJsonValue
            }
          });

          await prisma.externalEventMirror.upsert({
            where: {
              externalCalendarId_externalEventId: {
                externalCalendarId: calendar.id,
                externalEventId: mapped.externalEventId
              }
            },
            update: {
              smartEventId: smart.id,
              externalUpdatedAt: new Date(),
              rawPayload: externalEvent as Record<string, any>
            },
            create: {
              userId,
              externalCalendarId: calendar.id,
              smartEventId: smart.id,
              externalEventId: mapped.externalEventId,
              externalUpdatedAt: new Date(),
              rawPayload: externalEvent as Record<string, any>
            }
          });

          syncedCount += 1;
        }
      }
    }

    if (connection.provider === "OUTLOOK") {
      const calendars = await listOutlookCalendars(connection.accessTokenEnc);
      for (const externalCalendar of calendars) {
        const calendar = await prisma.externalCalendar.upsert({
          where: {
            connectionId_providerCalendarId: {
              connectionId: connection.id,
              providerCalendarId: externalCalendar.id
            }
          },
          update: {
            name: externalCalendar.name ?? "Untitled",
            timezone: externalCalendar.timeZone ?? "UTC"
          },
          create: {
            userId,
            connectionId: connection.id,
            providerCalendarId: externalCalendar.id,
            name: externalCalendar.name ?? "Untitled",
            timezone: externalCalendar.timeZone ?? "UTC",
            isPrimary: Boolean(externalCalendar.isDefaultCalendar)
          }
        });

        const events = await listOutlookEvents(
          connection.accessTokenEnc,
          externalCalendar.id,
          windowStart.toISOString(),
          windowEnd.toISOString()
        );

        for (const externalEvent of events) {
          const mapped = mapOutlookEventToExternalSync(externalEvent as Record<string, any>);
          if (!mapped) continue;

          const smart = await prisma.smartEvent.create({
            data: {
              userId,
              calendarId: calendar.id,
              type: SmartEventType.MEETING,
              title: mapped.title,
              description: mapped.description,
              startAt: new Date(mapped.startAt),
              endAt: new Date(mapped.endAt),
              timezone: mapped.timezone,
              source: mapped.source,
              priority: SmartEventPriority.P2,
              lockState: "BUSY",
              metadata: (mapped.metadata ?? {}) as Prisma.InputJsonValue
            }
          });

          await prisma.externalEventMirror.upsert({
            where: {
              externalCalendarId_externalEventId: {
                externalCalendarId: calendar.id,
                externalEventId: mapped.externalEventId
              }
            },
            update: {
              smartEventId: smart.id,
              externalUpdatedAt: new Date(),
              rawPayload: externalEvent as Record<string, any>
            },
            create: {
              userId,
              externalCalendarId: calendar.id,
              smartEventId: smart.id,
              externalEventId: mapped.externalEventId,
              externalUpdatedAt: new Date(),
              rawPayload: externalEvent as Record<string, any>
            }
          });

          syncedCount += 1;
        }
      }
    }

    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), lastError: null }
    });
  }

  return { synced: syncedCount, providers: [...providers] };
}
