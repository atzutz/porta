import { describe, it, expect } from "vitest";
import { getMetadata } from "../metadata.js";

describe("getMetadata", () => {
  it("returns base fields without file access", async () => {
    const meta = await getMetadata();
    expect(meta.ideName).toBe("vscode");
    expect(meta.ideVersion).toBe("0.1.0");
    expect(meta.extensionVersion).toBe("0.1.0");
    expect(meta.allowFileAccess).toBeUndefined();
    expect(meta.allWorkspaceTrustGranted).toBeUndefined();
  });

  it("returns base fields with fileAccessGranted=false", async () => {
    const meta = await getMetadata(false);
    expect(meta.ideName).toBe("vscode");
    expect(meta.allowFileAccess).toBeUndefined();
  });

  it("includes file access fields when granted", async () => {
    const meta = await getMetadata(true);
    expect(meta.ideName).toBe("vscode");
    expect(meta.allowFileAccess).toBe(true);
    expect(meta.allWorkspaceTrustGranted).toBe(true);
  });

  it("includes cascadeAutoExecutionPolicy when provided", async () => {
    const meta = await getMetadata(false, 3);
    expect(meta.ideName).toBe("vscode");
    expect(meta.cascadeAutoExecutionPolicy).toBe(3);
  });

  it("returns a fresh object on each call", async () => {
    const a = await getMetadata();
    const b = await getMetadata();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
