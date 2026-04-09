import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { buildGoogleConsentUrl } from "@reclaim/integrations";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";

export async function GET(request: Request) {
  const userId = await getOrCreateCurrentUserId();
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/calendars/connect/google/callback`;
  const state = randomUUID();

  await prisma.calendarConnection.upsert({
    where: { userId_provider_accountEmail: { userId, provider: "GOOGLE", accountEmail: "pending-google@local" } },
    update: { status: "PENDING" },
    create: {
      userId,
      provider: "GOOGLE",
      accountEmail: "pending-google@local",
      status: "PENDING",
      scopes: ["calendar.readwrite"]
    }
  });

  const url = buildGoogleConsentUrl(redirectUri, state);
  return NextResponse.redirect(url);
}
