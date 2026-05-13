// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const getLlmUsageSummary = vi.fn();
const saveLlmSettings = vi.fn();

vi.mock("@/lib/server/llm-admin", () => ({
  getLlmUsageSummary,
  saveLlmSettings
}));

afterEach(() => {
  vi.clearAllMocks();
});

const summary = {
  config: {
    configured: true,
    maskedKey: "sk-abc...1234",
    source: "runtime",
    model: "deepseek-v4-flash",
    apiUrl: "https://api.deepseek.com/chat/completions",
    inputTokenUsdPerMillion: 0.1,
    outputTokenUsdPerMillion: 0.2
  },
  totals: {
    calls: 2,
    success: 1,
    fallback: 1,
    error: 0,
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    estimatedCostUsd: 0.00002
  },
  recent: []
};

describe("/api/admin/llm-settings", () => {
  it("returns masked LLM config and usage summary", async () => {
    getLlmUsageSummary.mockResolvedValueOnce(summary);

    const { GET } = await import("@/app/api/admin/llm-settings/route");
    const response = await GET(new Request("http://localhost/api/admin/llm-settings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.config.maskedKey).toBe("sk-abc...1234");
    expect(body.config.apiKey).toBeUndefined();
    expect(body.totals.totalTokens).toBe(150);
  });

  it("saves settings and returns the refreshed usage summary", async () => {
    saveLlmSettings.mockResolvedValueOnce(undefined);
    getLlmUsageSummary.mockResolvedValueOnce(summary);

    const { POST } = await import("@/app/api/admin/llm-settings/route");
    const response = await POST(
      new Request("http://localhost/api/admin/llm-settings", {
        method: "POST",
        body: JSON.stringify({
          apiKey: "sk-test",
          model: "deepseek-v4-flash",
          apiUrl: "https://api.deepseek.com/chat/completions",
          inputTokenUsdPerMillion: 0.1,
          outputTokenUsdPerMillion: 0.2
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(saveLlmSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "sk-test",
        model: "deepseek-v4-flash"
      })
    );
    expect(body.config.apiKey).toBeUndefined();
  });
});
