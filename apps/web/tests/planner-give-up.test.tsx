import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlannerApp from "@/lib/planner-prototype/App";
import { mockEvents, mockTasks, plannerSettings } from "@/lib/planner-prototype/data/mockEvents";
import { requestScheduleReplan } from "@/lib/planner-prototype/utils/replanClient";

describe("planner give-up flow", () => {
  it("shows obvious UI feedback after clicking the give-up action", async () => {
    render(<PlannerApp />);

    fireEvent.click(screen.getByText("撰写提案大纲"));
    expect(screen.queryByText("点击后会变成")).not.toBeInTheDocument();
    expect(screen.getByText("触发并查看恢复方案")).toBeInTheDocument();

    fireEvent.click(screen.getByText("触发并查看恢复方案"));

    await waitFor(() => {
      expect(screen.queryByText("触发并查看恢复方案")).not.toBeInTheDocument();
      expect(screen.getByText("恢复方案已应用")).toBeInTheDocument();
      expect(screen.getByText("点击后实际变成")).toBeInTheDocument();
      expect(screen.getByText("先收一小段")).toBeInTheDocument();
      expect(screen.getByText("恢复一下")).toBeInTheDocument();
      expect(screen.getByText("切轻任务")).toBeInTheDocument();
      expect(screen.getAllByText("休息 / 缓冲").length).toBeGreaterThan(0);
      expect(screen.getAllByText("撰写提案大纲（继续）").length).toBeGreaterThan(0);
    });
  });

  it("inserts recovery and follow-up blocks into the schedule", async () => {
    const result = await requestScheduleReplan({
      currentEvents: mockEvents,
      currentTasks: mockTasks,
      action: {
        kind: "give_up",
        eventId: "ev-17",
        focusDay: 2,
        startHour: 14
      },
      settings: plannerSettings
    });

    expect(result.latestLog.action).toContain("干不下去了");
    expect(result.changes.some((change) => change.type === "buffered")).toBe(true);
    expect(result.events.some((event) => event.title === "休息 / 缓冲" && event.day === 2 && event.startHour === 14.75)).toBe(true);
    expect(result.events.some((event) => event.title === "复盘会议纪要" && event.day === 2 && event.startHour === 15)).toBe(true);
    expect(result.events.some((event) => event.title === "撰写提案大纲（继续）" && event.status === "interrupted")).toBe(true);
  });
});
