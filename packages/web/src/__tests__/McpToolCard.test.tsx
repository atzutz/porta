import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { McpToolCard } from "../components/StepCards";
import type { TrajectoryStep } from "../types";

function waitingStep(overrides: Partial<TrajectoryStep> = {}): TrajectoryStep {
  return {
    type: "CORTEX_STEP_TYPE_MCP_TOOL",
    status: "CORTEX_STEP_STATUS_WAITING",
    metadata: {
      sourceTrajectoryStepInfo: {
        trajectoryId: "traj-1",
        stepIndex: 14,
      },
    },
    mcpTool: {
      serverName: "asana",
      toolCall: {
        name: "asana_list_workspaces",
        argumentsJson: "{}",
      },
    },
    ...overrides,
  };
}

function doneStep(overrides: Partial<TrajectoryStep> = {}): TrajectoryStep {
  return {
    type: "CORTEX_STEP_TYPE_MCP_TOOL",
    status: "CORTEX_STEP_STATUS_DONE",
    metadata: {
      sourceTrajectoryStepInfo: {
        trajectoryId: "traj-1",
        stepIndex: 14,
      },
    },
    mcpTool: {
      serverName: "asana",
      toolCall: {
        name: "asana_list_workspaces",
        argumentsJson: "{\"opt_fields\":\"name\"}",
      },
      resultString: "[{\"gid\":\"1198560554435486\",\"name\":\"TheSoul Group\"}]",
    },
    ...overrides,
  };
}

describe("McpToolCard", () => {
  it("renders server name and tool name", () => {
    render(<McpToolCard step={doneStep()} />);
    expect(screen.getByText("asana/asana_list_workspaces")).toBeInTheDocument();
  });

  it("shows waiting status controls and labels when step is waiting", () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    render(<McpToolCard step={waitingStep()} onCommandAction={onAction} />);
    expect(screen.getByText("Waiting for approval")).toBeInTheDocument();
    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByText("Reject")).toBeInTheDocument();
  });

  it("expands to show arguments and outputs when clicked", async () => {
    render(<McpToolCard step={doneStep()} />);
    
    // Toggle details button
    const headerButton = screen.getByTitle("Toggle details");
    expect(screen.queryByText("Arguments:")).not.toBeInTheDocument();
    expect(screen.queryByText("Output:")).not.toBeInTheDocument();

    await userEvent.click(headerButton);

    expect(screen.getByText("Arguments:")).toBeInTheDocument();
    expect(screen.getByText(/"opt_fields": "name"/)).toBeInTheDocument();
    expect(screen.getByText("Output:")).toBeInTheDocument();
    expect(screen.getByText(/TheSoul Group/)).toBeInTheDocument();
  });

  it("expands to show empty arguments when argumentsJson is empty", async () => {
    render(<McpToolCard step={waitingStep()} />);
    const headerButton = screen.getByTitle("Toggle details");
    await userEvent.click(headerButton);
    expect(screen.getByText("Arguments:")).toBeInTheDocument();
    expect(screen.getByText("{}")).toBeInTheDocument();
  });
});
