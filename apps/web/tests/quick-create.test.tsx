import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickCreatePanel } from "@/components/dashboard/quick-create";
import { AppProviders } from "@/lib/query/providers";

describe("QuickCreatePanel", () => {
  it("renders manual create section", () => {
    render(
      <AppProviders>
        <QuickCreatePanel />
      </AppProviders>
    );

    expect(screen.getByText("手动添加计划/事件")).toBeInTheDocument();
  });
});

