/**
 * /api/files route — local file preview (images)
 */

import type { Hono } from "hono";
import { createReadStream, existsSync } from "node:fs";
import { extname, posix, win32 } from "node:path";
import { Readable } from "node:stream";
import { homedir } from "node:os";

const MIME_TYPES: Record<string, string> = {
  // Images
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  // Videos
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
  // Audio
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  // Documents / Code / Text
  ".txt": "text/plain; charset=utf-8",
  ".log": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".ts": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".py": "text/plain; charset=utf-8",
  ".sh": "text/plain; charset=utf-8",
  ".yml": "text/plain; charset=utf-8",
  ".yaml": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function fileUriToPath(
  fileUri: string,
  useWindowsPaths: boolean,
): string | null {
  try {
    const url = new URL(fileUri);
    if (url.protocol !== "file:") return null;

    const pathname = decodeURIComponent(url.pathname);

    if (!useWindowsPaths) {
      if (url.hostname && url.hostname !== "localhost") {
        return `//${url.hostname}${pathname}`;
      }
      return pathname;
    }

    // Node's fileURLToPath() follows the host runtime OS. This custom branch
    // keeps Windows file:// URIs testable and correctly resolved even when the
    // code runs on a non-Windows host.
    if (url.hostname && url.hostname !== "localhost") {
      return `\\\\${url.hostname}${pathname.replaceAll("/", "\\")}`;
    }

    if (/^\/[A-Za-z]:/.test(pathname)) {
      return pathname.slice(1).replaceAll("/", "\\");
    }

    return pathname.replaceAll("/", "\\");
  } catch {
    return null;
  }
}

function normalizeLegacyPath(
  filePath: string,
  useWindowsPaths: boolean,
): string {
  // Backward-compatibility for old clients that already rewrote file:///C:/...
  // into /C:/... before the URI-safe pipeline existed.
  if (useWindowsPaths && /^\/[A-Za-z]:/.test(filePath)) {
    return filePath.slice(1);
  }
  return filePath;
}

function looksLikeWindowsPath(filePath: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(filePath) || /^\\\\/.test(filePath);
}

function inferWindowsPathMode(
  home: string,
  fileRef: string,
  useWindowsPaths?: boolean,
): boolean {
  if (typeof useWindowsPaths === "boolean") {
    return useWindowsPaths;
  }

  if (looksLikeWindowsPath(home)) {
    return true;
  }

  if (home.startsWith("/") && !/^\/[A-Za-z]:/.test(home)) {
    return false;
  }

  if (fileRef.startsWith("file://")) {
    try {
      const url = new URL(fileRef);
      const pathname = decodeURIComponent(url.pathname);
      return (
        (Boolean(url.hostname) && url.hostname !== "localhost") ||
        /^\/[A-Za-z]:/.test(pathname)
      );
    } catch {
      return false;
    }
  }

  return looksLikeWindowsPath(fileRef) || /^\/[A-Za-z]:/.test(fileRef);
}

export function resolveSafeHomeFilePath(
  fileRef: string,
  home = homedir(),
  useWindowsPaths?: boolean,
): string | null {
  const windowsPaths = inferWindowsPathMode(home, fileRef, useWindowsPaths);
  const pathApi = windowsPaths ? win32 : posix;
  const resolvedHome = pathApi.resolve(home);
  const localPath = fileRef.startsWith("file://")
    ? fileUriToPath(fileRef, windowsPaths)
    : normalizeLegacyPath(fileRef, windowsPaths);
  if (!localPath) return null;

  const resolvedPath = pathApi.isAbsolute(localPath)
    ? pathApi.resolve(localPath)
    : pathApi.resolve(resolvedHome, localPath);
  const relativePath = pathApi.relative(resolvedHome, resolvedPath);

  if (
    relativePath.startsWith("..") ||
    pathApi.isAbsolute(relativePath)
  ) {
    return null;
  }

  return resolvedPath;
}

export function registerFileRoutes(app: Hono): void {
  app.get("/api/files", async (c) => {
    const fileRef = c.req.query("uri") ?? c.req.query("path");
    if (!fileRef) {
      return c.json({ error: "Missing 'uri' or 'path' query param" }, 400);
    }

    // Security: only serve files under home dir
    const resolved = resolveSafeHomeFilePath(fileRef);
    if (!resolved) {
      return c.json({ error: "Access denied" }, 403);
    }

    const ext = extname(resolved).toLowerCase();
    const mimeType = MIME_TYPES[ext] ?? "application/octet-stream";

    if (!existsSync(resolved)) {
      return c.json({ error: "File not found" }, 404);
    }

    const stream = createReadStream(resolved);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  });
}
