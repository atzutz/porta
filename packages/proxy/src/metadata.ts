/**
 * Shared metadata and disk-scanning utilities for the proxy.
 */

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export const CONVERSATIONS_DIR = join(
  homedir(),
  ".gemini",
  "antigravity",
  "conversations",
);

/**
 * Build the metadata object that the LS requires on write RPCs.
 * Mirrors what the VS Code extension sends via MetadataProvider.
 */
export async function getMetadata(
  fileAccessGranted = false,
): Promise<Record<string, unknown>> {
  const meta: Record<string, unknown> = {
    ideName: "vscode",
    ideVersion: "0.1.0",
    extensionVersion: "0.1.0",
  };
  if (fileAccessGranted) {
    meta.allowFileAccess = true;
    meta.allWorkspaceTrustGranted = true;
  }
  return meta;
}

/** Scan disk for .pb conversation files not loaded in memory */
export async function scanDiskConversations(): Promise<
  { id: string; mtime: string }[]
> {
  try {
    const files = await readdir(CONVERSATIONS_DIR);
    const results: { id: string; mtime: string }[] = [];
    for (const file of files) {
      if (!file.endsWith(".pb")) continue;
      const id = file.replace(".pb", "");
      try {
        const s = await stat(join(CONVERSATIONS_DIR, file));
        results.push({ id, mtime: s.mtime.toISOString() });
      } catch {
        results.push({ id, mtime: new Date().toISOString() });
      }
    }
    return results;
  } catch {
    return [];
  }
}
