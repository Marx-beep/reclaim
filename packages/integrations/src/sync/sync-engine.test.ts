import { describe, expect, it } from "vitest";
import { mapGoogleEventToExternalSync, mapOutlookEventToExternalSync } from "./sync-engine";

describe("sync-engine mapping", () => {
  it("maps google event payload for calendar sync mock", () => {
    const mapped = mapGoogleEventToExternalSync({
      id: "g-1",
      summary: "Google Event",
      description: "desc",
      start: { dateTime: "2026-04-10T10:00:00.000Z", timeZone: "UTC" },
      end: { dateTime: "2026-04-10T11:00:00.000Z", timeZone: "UTC" },
      attendees: [{}, {}]
    });

    expect(mapped?.externalEventId).toBe("g-1");
    expect(mapped?.source).toBe("GOOGLE");
    expect(mapped?.metadata?.attendees).toBe(2);
  });

  it("maps outlook event payload for calendar sync mock", () => {
    const mapped = mapOutlookEventToExternalSync({
      id: "o-1",
      subject: "Outlook Event",
      bodyPreview: "desc",
      start: { dateTime: "2026-04-10T18:00:00.000Z", timeZone: "UTC" },
      end: { dateTime: "2026-04-10T19:00:00.000Z", timeZone: "UTC" },
      isAllDay: false,
      organizer: { emailAddress: { address: "host@example.com" } }
    });

    expect(mapped?.externalEventId).toBe("o-1");
    expect(mapped?.source).toBe("OUTLOOK");
    expect(mapped?.metadata?.organizer).toBe("host@example.com");
  });
});
