import { z } from "zod";

const apiErrorSchema = z.object({ message: z.string() });

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Unknown API error" }));
    const parsed = apiErrorSchema.safeParse(payload);
    throw new Error(parsed.success ? parsed.data.message : "API request failed");
  }

  return response.json() as Promise<T>;
}
