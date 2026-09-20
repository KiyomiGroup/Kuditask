import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB

export class UploadValidationError extends Error {}

/**
 * Validates a proof-screenshot upload. Throws UploadValidationError with a
 * user-facing message on any failure. Never trusts the client-reported
 * mime type alone for anything security-sensitive beyond this check —
 * Supabase Storage is also configured (bucket policy, not shown here) to
 * reject non-image content server-side as defense in depth.
 */
export function validateProofFile(file: { type: string; size: number }) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new UploadValidationError(
      "Unsupported file type — upload a PNG, JPEG, or WEBP screenshot."
    );
  }
  if (file.size <= 0) {
    throw new UploadValidationError("The file appears to be empty.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new UploadValidationError("File is too large — maximum size is 8MB.");
  }
}

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Generates a safe storage key. Deliberately ignores the original filename
 * entirely — no user-supplied string ever reaches the filesystem/storage
 * path, which rules out path traversal and extension-spoofing tricks.
 */
export function safeProofStorageKey(taskerId: string, mimeType: string) {
  const ext = EXT_BY_MIME[mimeType] ?? "bin";
  return `proofs/${taskerId}/${randomUUID()}.${ext}`;
}
