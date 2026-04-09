import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SmartSuggestionsPanel } from "@/components/dashboard/smart-suggestions";
import { AppProviders } from "@/lib/query/providers";

describe("SmartSuggestionsPanel", () => {
  it("renders panel title", () => {
    render(
      <AppProviders>
        <SmartSuggestionsPanel />
      </AppProviders>
    );

    expect(screen.getByText("智能建议")).toBeInTheDocument();
  });
});
