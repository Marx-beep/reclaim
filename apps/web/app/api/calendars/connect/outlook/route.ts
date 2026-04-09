import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";

export async function GET(request: Request) {
  const userId = await getOrCreateCurrentUserId();
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/calendars/connect/outlook/callback`;

  await prisma.calendarConnection.upsert({
    where: { userId_provider_accountEmail: { userId, provider: "OUTLOOK", accountEmail: "pending-outlook@local" } },
    update: { status: "PENDING" },
    create: {
      userId,
      provider: "OUTLOOK",
      accountEmail: "pending-outlook@local",
      status: "PENDING",
      scopes: ["Calendars.ReadWrite", "offline_access"]
    }
  });

  const tenant = process.env.MICROSOFT_TENANT_ID ?? "common";
  const clientId = process.env.MICROSOFT_CLIENT_ID ?? "";
  const state = randomUUID();
  const scope = encodeURIComponent("openid profile email offline_access Calendars.ReadWrite");
  const encodedRedirect = encodeURIComponent(redirectUri);

  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodedRedirect}&response_mode=query&scope=${scope}&state=${state}`;
  return NextResponse.redirect(url);
}
