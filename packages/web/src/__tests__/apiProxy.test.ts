import { describe, it, expect, vi, beforeEach } from "vitest";
import { onRequest } from "../../functions/api/[[route]]";

describe("Cloudflare Pages API Proxy - [[route]].ts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should forward request and clean response headers", async () => {
    // Mock the backend API response headers
    const backendHeaders = new Headers({
      "Content-Type": "application/json",
      "Set-Cookie": "CF_Authorization=secret-cookie-backend",
      "Content-Encoding": "gzip",
      "Content-Length": "123",
      "Transfer-Encoding": "chunked",
      "X-Custom-Header": "hello-world",
    });

    const mockResponse = new Response(JSON.stringify({ data: "ok" }), {
      status: 200,
      statusText: "OK",
      headers: backendHeaders,
    });

    // Mock global fetch to return our response
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    // Mock request
    const request = new Request("https://porta.dev/api/conversations/123", {
      method: "GET",
      headers: new Headers({
        "Origin": "https://porta.dev",
        "Referer": "https://porta.dev/chat",
        "Cookie": "CF_Authorization=frontend-cookie",
      }),
    });

    const context = {
      request,
      env: {
        PORTA_API_BASE: "https://api.porta.local",
        CF_ACCESS_CLIENT_ID: "client-id",
        CF_ACCESS_CLIENT_SECRET: "client-secret",
      },
    };

    const response = await onRequest(context);

    // Verify fetch was called with the correct target URL and headers
    expect(fetchSpy).toHaveBeenCalled();
    const calledRequest = fetchSpy.mock.calls[0][0] as Request;
    expect(calledRequest.url).toBe("https://api.porta.local/api/conversations/123");
    expect(calledRequest.headers.get("CF-Access-Client-Id")).toBe("client-id");
    expect(calledRequest.headers.get("CF-Access-Client-Secret")).toBe("client-secret");
    expect(calledRequest.headers.get("Origin")).toBeNull();
    expect(calledRequest.headers.get("Referer")).toBeNull();

    // Verify response headers
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("X-Custom-Header")).toBe("hello-world");

    // Verify Set-Cookie is stripped
    expect(response.headers.get("Set-Cookie")).toBeNull();

    // Verify decompression/streaming headers are stripped
    expect(response.headers.get("Content-Encoding")).toBeNull();
    expect(response.headers.get("Content-Length")).toBeNull();
    expect(response.headers.get("Transfer-Encoding")).toBeNull();
  });
});
