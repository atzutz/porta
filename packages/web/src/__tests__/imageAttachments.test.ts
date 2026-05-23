import { describe, expect, it } from "vitest";
import {
  attachmentLimits,
  prepareAttachment,
  prepareAttachments,
} from "../utils/imageAttachments";

function fileOfSize(size: number, name: string, type: string): File {
  const f = new File(["tiny"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("imageAttachments", () => {
  it("passes through small svg files", async () => {
    const file = new File(["<svg></svg>"], "small.svg", {
      type: "image/svg+xml",
    });

    const prepared = await prepareAttachment(file);

    expect(prepared.mimeType).toBe("image/svg+xml");
    expect(prepared.bytes).toBe(file.size);
    expect(prepared.inlineData.length).toBeGreaterThan(0);
  });

  it("rejects oversized svg files", async () => {
    const file = fileOfSize(
      attachmentLimits.maxAttachmentBytes + 1,
      "large.svg",
      "image/svg+xml",
    );

    await expect(prepareAttachment(file)).rejects.toThrow(
      "Non-image attachments must stay under",
    );
  });

  it("rejects attachment batches that exceed the total limit", async () => {
    const perFile = 170 * 1024 * 1024;
    const files = [
      fileOfSize(perFile, "one.svg", "image/svg+xml"),
      fileOfSize(perFile, "two.svg", "image/svg+xml"),
      fileOfSize(perFile, "three.svg", "image/svg+xml"),
    ];

    await expect(prepareAttachments(files)).rejects.toThrow(
      "Attachments exceed",
    );
  });
});
