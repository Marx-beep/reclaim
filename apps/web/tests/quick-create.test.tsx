import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickCreatePanel } from "@/components/dashboard/quick-create";
import { AppProviders } from "@/lib/query/providers";

describe("QuickCreatePanel", () => {
  it("renders quick create section", () => {
    render(
      <AppProviders>
        <QuickCreatePanel />
      </AppProviders>
    );

    expect(screen.getByText("快速创建")).toBeInTheDocument();
    expect(screen.getByText("添加任务")).toBeInTheDocument();
  });
});
