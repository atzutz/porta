import type { MediaAttachment } from "../types";

const RASTER_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_ATTACHMENT_BYTES = 200 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 500 * 1024 * 1024;
const MAX_RASTER_DIMENSION = 2048;
const SCALE_STEPS = [1, 0.85, 0.7, 0.55];
const QUALITY_STEPS = [0.86, 0.76, 0.66, 0.56];

export interface PreparedAttachment extends MediaAttachment {
  bytes: number;
}

export function formatAttachmentBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function clampDimensions(width: number, height: number) {
  const longestEdge = Math.max(width, height);
  if (longestEdge <= MAX_RASTER_DIMENSION) return { width, height };
  const ratio = MAX_RASTER_DIMENSION / longestEdge;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode ${file.name}`));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image compression failed"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

async function transcodeRaster(file: File): Promise<PreparedAttachment> {
  const img = await loadImage(file);
  const baseSize = clampDimensions(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
  );
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is unavailable for image processing");
  }

  for (const scale of SCALE_STEPS) {
    const width = Math.max(1, Math.round(baseSize.width * scale));
    const height = Math.max(1, Math.round(baseSize.height * scale));
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    for (const mimeType of ["image/webp", "image/jpeg"]) {
      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, mimeType, quality);
        if (blob.size <= MAX_ATTACHMENT_BYTES) {
          return {
            mimeType,
            inlineData: await blobToBase64(blob),
            bytes: blob.size,
          };
        }
      }
    }
  }

  throw new Error(
    `Couldn't shrink ${file.name} below ${formatAttachmentBytes(MAX_ATTACHMENT_BYTES)}.`,
  );
}

export async function prepareAttachment(file: File): Promise<PreparedAttachment> {
  if (RASTER_TYPES.has(file.type)) {
    if (file.size <= MAX_ATTACHMENT_BYTES) {
      return {
        mimeType: file.type,
        inlineData: await blobToBase64(file),
        bytes: file.size,
      };
    }
    return transcodeRaster(file);
  }

  // Pass through all other file types directly
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `${file.name} is ${formatAttachmentBytes(file.size)}. Non-image attachments must stay under ${formatAttachmentBytes(MAX_ATTACHMENT_BYTES)}.`,
    );
  }
  return {
    mimeType: file.type || "application/octet-stream",
    inlineData: await blobToBase64(file),
    bytes: file.size,
  };
}

export async function prepareAttachments(
  files: File[],
): Promise<PreparedAttachment[]> {
  const prepared: PreparedAttachment[] = [];
  let totalBytes = 0;

  for (const file of files) {
    const attachment = await prepareAttachment(file);
    totalBytes += attachment.bytes;
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw new Error(
        `Attachments exceed ${formatAttachmentBytes(MAX_TOTAL_ATTACHMENT_BYTES)} total. Remove an image or use a smaller one.`,
      );
    }
    prepared.push(attachment);
  }

  return prepared;
}

export const attachmentLimits = {
  maxAttachmentBytes: MAX_ATTACHMENT_BYTES,
  maxTotalAttachmentBytes: MAX_TOTAL_ATTACHMENT_BYTES,
};
