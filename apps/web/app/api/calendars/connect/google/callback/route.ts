import { NextResponse } from "next/server";
import { createGoogleOAuthClient } from "@reclaim/integrations";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";

export async function GET(request: Request) {
  try {
    const userId = await getOrCreateCurrentUserId();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) return NextResponse.redirect(`${url.origin}/settings?error=no_google_code`);

    const oauth = createGoogleOAuthClient(`${url.origin}/api/calendars/connect/google/callback`);

    const token = await oauth.getToken(code);
    const access = token.tokens.access_token;
    const refresh = token.tokens.refresh_token;
    const expires = token.tokens.expiry_date ? new Date(token.tokens.expiry_date) : null;

    await prisma.calendarConnection.upsert({
      where: {
        userId_provider_accountEmail: {
          userId,
          provider: "GOOGLE",
          accountEmail: "pending-google@local"
        }
      },
      update: {
        status: "ACTIVE",
        accessTokenEnc: access,
        refreshTokenEnc: refresh,
        tokenExpiresAt: expires
      },
      create: {
        userId,
        provider: "GOOGLE",
        accountEmail: "pending-google@local",
        status: "ACTIVE",
        accessTokenEnc: access,
        refreshTokenEnc: refresh,
        tokenExpiresAt: expires,
        scopes: ["calendar.readwrite"]
      }
    });

    return NextResponse.redirect(`${url.origin}/settings?connected=google`);
  } catch {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/settings?error=google_callback_failed`);
  }
}
