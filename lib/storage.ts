import { createClient } from "@supabase/supabase-js";

const PROOF_BUCKET = "task-proofs";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured (missing URL or service role key).");
  }
  // Service-role client — server-only, never imported into client components.
  return createClient(url, key);
}

/** Uploads a proof screenshot to the private bucket at the given safe key. */
export async function uploadProofScreenshot(key: string, bytes: Buffer, mimeType: string) {
  const supabase = supabaseAdmin();
  const { error } = await supabase.storage
    .from(PROOF_BUCKET)
    .upload(key, bytes, { contentType: mimeType, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return key;
}

/**
 * Returns a short-lived signed URL so an Admin (or the owning tasker) can
 * view a proof screenshot without the bucket ever being public.
 */
export async function getSignedProofUrl(key: string, expiresInSeconds = 300) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(key, expiresInSeconds);
  if (error || !data) throw new Error(`Could not sign URL: ${error?.message}`);
  return data.signedUrl;
}
