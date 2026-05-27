import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChatPanel } from "../components/ChatPanel";
import { useStepsStream } from "../hooks/useStepsStream";

vi.mock("../hooks/useStepsStream", () => ({
  useStepsStream: vi.fn(),
}));

describe("ChatPanel Scroll Behavior", () => {
  let scrollTopSpy: any;
  let originalScrollTo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock scrollTo on HTMLElement
    originalScrollTo = window.HTMLElement.prototype.scrollTo;
    window.HTMLElement.prototype.scrollTo = vi.fn();

    // Define scrollTop/scrollHeight getters/setters on HTMLElement.prototype
    // so we can spy on scrollTop assignments and mock scrollHeight values.
    let mockScrollTop = 0;
    scrollTopSpy = vi.fn((val) => {
      mockScrollTop = val;
    });

    Object.defineProperty(window.HTMLElement.prototype, "scrollTop", {
      configurable: true,
      get() {
        return mockScrollTop;
      },
      set: scrollTopSpy,
    });

    Object.defineProperty(window.HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return 500; // Mock scrollHeight
      },
    });

    Object.defineProperty(window.HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return 300; // Mock clientHeight
      },
    });
  });

  afterEach(() => {
    window.HTMLElement.prototype.scrollTo = originalScrollTo;
    Object.defineProperty(window.HTMLElement.prototype, "scrollTop", {
      configurable: true,
      value: 0,
      writable: true,
    });
  });

  it("scrolls to the bottom on initial load", () => {
    vi.mocked(useStepsStream).mockReturnValue({
      steps: [
        {
          type: "CORTEX_STEP_TYPE_USER_INPUT",
          userInput: { items: [{ text: "hello user" }] },
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
      hardRefresh: vi.fn(),
      hasMore: false,
      loadingOlder: false,
      loadOlder: vi.fn().mockResolvedValue(0),
      wsRunning: false,
    } as any);

    render(
      <ChatPanel
        cascadeId="chat-1"
        onRevert={vi.fn()}
        onFilePermission={vi.fn()}
      />
    );

    // Verify chat area was scrolled to the bottom (scrollHeight = 500)
    expect(scrollTopSpy).toHaveBeenCalledWith(500);
  });

  it("scrolls to the bottom when switching cascadeId", () => {
    // First render with chat-1
    vi.mocked(useStepsStream).mockReturnValue({
      steps: [
        {
          type: "CORTEX_STEP_TYPE_USER_INPUT",
          userInput: { items: [{ text: "message in chat 1" }] },
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
      hardRefresh: vi.fn(),
      hasMore: false,
      loadingOlder: false,
      loadOlder: vi.fn().mockResolvedValue(0),
      wsRunning: false,
    } as any);

    const { rerender } = render(
      <ChatPanel
        cascadeId="chat-1"
        onRevert={vi.fn()}
        onFilePermission={vi.fn()}
      />
    );

    expect(scrollTopSpy).toHaveBeenCalledWith(500);
    scrollTopSpy.mockClear();

    // Now switch to chat-2
    vi.mocked(useStepsStream).mockReturnValue({
      steps: [
        {
          type: "CORTEX_STEP_TYPE_USER_INPUT",
          userInput: { items: [{ text: "message in chat 2" }] },
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
      hardRefresh: vi.fn(),
      hasMore: false,
      loadingOlder: false,
      loadOlder: vi.fn().mockResolvedValue(0),
      wsRunning: false,
    } as any);

    rerender(
      <ChatPanel
        cascadeId="chat-2"
        onRevert={vi.fn()}
        onFilePermission={vi.fn()}
      />
    );

    // Verify chat area was scrolled to the bottom again (scrollHeight = 500)
    expect(scrollTopSpy).toHaveBeenCalledWith(500);
  });
});
