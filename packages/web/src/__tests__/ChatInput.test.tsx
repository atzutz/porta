import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChatInput } from "../components/ChatInput";

describe("ChatInput", () => {
  const mockOnSend = vi.fn();
  const mockOnStop = vi.fn();
  const mockOnDraftChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:mock"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(),
    });
  });

  const defaultProps = {
    onSend: mockOnSend,
    onStop: mockOnStop,
    onDraftChange: mockOnDraftChange,
    isRunning: false,
    draft: "",
  };

  it("renders correctly", () => {
    render(<ChatInput {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Send a message..."),
    ).toBeInTheDocument();
  });

  it("calls onDraftChange when typing", () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Send a message...");
    fireEvent.change(textarea, { target: { value: "hello" } });
    expect(mockOnDraftChange).toHaveBeenCalledWith("hello");
  });

  it("blocks oversized svg attachments before sending", async () => {
    const { container } = render(<ChatInput {...defaultProps} />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    const file = new File(
      [new Uint8Array(1024 * 1024 + 1)],
      "large.svg",
      { type: "image/svg+xml" },
    );

    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByAltText("attachment")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Send (Enter)"));

    await waitFor(() => {
      expect(mockOnSend).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Non-image attachments must stay under",
      );
    });
  });
});
