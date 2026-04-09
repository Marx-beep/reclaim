import { Client } from "@microsoft/microsoft-graph-client";

type AuthProvider = { getAccessToken: () => Promise<string> };

function createGraphClient(provider: AuthProvider): Client {
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: provider.getAccessToken
    }
  });
}

export async function listOutlookCalendars(accessToken: string) {
  const graph = createGraphClient({ getAccessToken: async () => accessToken });
  const result = await graph.api("/me/calendars").get();
  return result.value ?? [];
}

export async function listOutlookEvents(accessToken: string, calendarId: string, startIso: string, endIso: string) {
  const graph = createGraphClient({ getAccessToken: async () => accessToken });
  const result = await graph
    .api(`/me/calendars/${calendarId}/events`)
    .query({
      $select: "id,subject,bodyPreview,start,end,isAllDay,lastModifiedDateTime,showAs,webLink,organizer",
      $top: "500",
      $filter: `start/dateTime ge '${startIso}' and end/dateTime le '${endIso}'`
    })
    .get();

  return result.value ?? [];
}
