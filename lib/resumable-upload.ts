"use client";

import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_URL } from "@/lib/supabase/env";

const BUCKET = "software";
// Supabase's resumable (TUS) endpoint requires a fixed 6MB chunk size.
const CHUNK_SIZE = 6 * 1024 * 1024;

/**
 * Resumable (TUS) upload to Supabase Storage — the recommended path for large
 * files. Chunks the file, retries on flaky networks, can resume, and reports
 * progress. Authorized with the signed-in user's JWT so storage RLS passes.
 */
export async function resumableUpload(opts: {
  path: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Your session expired. Please sign out and sign in again.");
  }

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(opts.file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${token}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: CHUNK_SIZE,
      metadata: {
        bucketName: BUCKET,
        objectName: opts.path,
        contentType: opts.file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onError: (err) => reject(err),
      onProgress: (sent, total) =>
        opts.onProgress?.(total ? Math.round((sent / total) * 100) : 0),
      onSuccess: () => resolve(),
    });

    // Resume an interrupted upload of the same file if one exists.
    upload.findPreviousUploads().then((previous) => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });
}
