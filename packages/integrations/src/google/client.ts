import { google } from "googleapis";

export function createGoogleOAuthClient(redirectUri: string): InstanceType<typeof google.auth.OAuth2> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are required");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildGoogleConsentUrl(redirectUri: string, state: string): string {
  const oauth = createGoogleOAuthClient(redirectUri);
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events"
    ],
    state
  });
}

export async function listGoogleCalendars(accessToken: string) {
  const calendar = google.calendar({ version: "v3", headers: { Authorization: `Bearer ${accessToken}` } });
  const response = await calendar.calendarList.list();
  return response.data.items ?? [];
}

export async function listGoogleEvents(accessToken: string, calendarId: string, timeMin: string, timeMax: string) {
  const calendar = google.calendar({ version: "v3", headers: { Authorization: `Bearer ${accessToken}` } });
  const response = await calendar.events.list({
    calendarId,
    singleEvents: true,
    orderBy: "startTime",
    timeMin,
    timeMax,
    maxResults: 500
  });

  return response.data.items ?? [];
}
