import { NextResponse } from "next/server";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";

export async function GET(request: Request) {
  try {
    const userId = await getOrCreateCurrentUserId();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) return NextResponse.redirect(`${url.origin}/settings?error=no_outlook_code`);

    const tenant = process.env.MICROSOFT_TENANT_ID ?? "common";
    const redirectUri = `${url.origin}/api/calendars/connect/outlook/callback`;

    const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!response.ok) {
      return NextResponse.redirect(`${url.origin}/settings?error=outlook_token_failed`);
    }

    const token = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    await prisma.calendarConnection.upsert({
      where: {
        userId_provider_accountEmail: {
          userId,
          provider: "OUTLOOK",
          accountEmail: "pending-outlook@local"
        }
      },
      update: {
        status: "ACTIVE",
        accessTokenEnc: token.access_token,
        refreshTokenEnc: token.refresh_token,
        tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null
      },
      create: {
        userId,
        provider: "OUTLOOK",
        accountEmail: "pending-outlook@local",
        status: "ACTIVE",
        accessTokenEnc: token.access_token,
        refreshTokenEnc: token.refresh_token,
        tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        scopes: ["Calendars.ReadWrite", "offline_access"]
      }
    });

    return NextResponse.redirect(`${url.origin}/settings?connected=outlook`);
  } catch {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/settings?error=outlook_callback_failed`);
  }
}
