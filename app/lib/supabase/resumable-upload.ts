"use client";

import { Upload } from "tus-js-client";
import { createClient } from "./client";

const TUS_CHUNK_BYTES = 6 * 1024 * 1024;

function getResumableUploadEndpoint(projectUrl: string) {
  const url = new URL(projectUrl);
  if (url.hostname.endsWith(".supabase.co")) {
    url.hostname = url.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co");
  }
  return new URL("/storage/v1/upload/resumable", url.origin).toString();
}

export async function uploadMediaResumable(
  file: File,
  storagePath: string,
  onProgress: (uploadedBytes: number, totalBytes: number) => void,
) {
  const supabase = createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.access_token) throw new Error("Please sign in again before uploading this file.");

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!projectUrl || !publishableKey) {
    throw new Error("Supabase environment variables are missing. Check .env.local and restart the dev server.");
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const upload = new Upload(file, {
      endpoint: getResumableUploadEndpoint(projectUrl),
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        apikey: publishableKey,
      },
      fingerprint: (uploadFile) => Promise.resolve(
        [uploadFile.name, uploadFile.type, uploadFile.size, uploadFile.lastModified, storagePath].join("-"),
      ),
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: TUS_CHUNK_BYTES,
      metadata: {
        bucketName: "gift-media",
        objectName: storagePath,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
        metadata: "{}",
      },
      onProgress,
      onError: (uploadError) => {
        if (settled) return;
        settled = true;
        reject(uploadError);
      },
      onSuccess: () => {
        if (settled) return;
        settled = true;
        resolve();
      },
    });

    void upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    }).catch((uploadError: unknown) => {
      if (settled) return;
      settled = true;
      reject(uploadError);
    });
  });
}
