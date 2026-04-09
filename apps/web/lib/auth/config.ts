import { NextResponse } from "next/server";

async function handler() {
  return NextResponse.json({
    enabled: false,
    mode: "single-user-demo",
    message: "Auth is disabled for local MVP runtime"
  });
}

export const handlers = {
  GET: handler,
  POST: handler
};
