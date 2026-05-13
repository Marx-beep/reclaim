import { fail, ok } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const baseUrl = process.env.SCHEDULER_BASE_URL ?? "http://localhost:8000";
    const response = await fetch(`${baseUrl}/schedule/event-replan/undo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      return fail(`Scheduler undo failed: ${response.status} ${message}`, 502);
    }
    return ok(await response.json());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Undo replan failed", 500);
  }
}
