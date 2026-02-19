#!/usr/bin/env node
/**
 * Upload OpenClaw demo video to Supabase Storage for use on the landing page.
 *
 * Required env:
 *   SUPABASE_URL              - e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (or anon key if bucket allows uploads)
 *
 * Optional env:
 *   SUPABASE_BUCKET           - Bucket name (default: assets)
 *   VIDEO_PATH                - Local path to video file (default: ~/Downloads/OpenClaw_Trading.mp4)
 *
 * Usage (from repo root):
 *   make upload-video-supabase
 * Or from web/: node scripts/upload-video-to-supabase.mjs
 *
 * After upload, add to web/.env.local:
 *   NEXT_PUBLIC_OPENCLAW_VIDEO_URL=<printed public URL>
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..", "..");

const DEFAULT_VIDEO_PATH = join(homedir(), "Downloads", "OpenClaw_Trading.mp4");
const BUCKET = process.env.SUPABASE_BUCKET || "assets";
const OBJECT_PATH = "videos/OpenClaw_Trading.mp4";

/** Load .env from a directory into process.env. */
function loadEnv(dir) {
  const envPath = join(dir, ".env");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      )
        val = val.slice(1, -1).trim();
      process.env[key] = val;
    }
  } catch {
    // .env missing or unreadable
  }
}

async function main() {
  loadEnv(root);
  loadEnv(join(root, "web"));
  const webEnvLocal = join(root, "web", ".env.local");
  try {
    const raw = readFileSync(webEnvLocal, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1).trim();
      process.env[key] = val;
    }
  } catch {
    // ignore
  }

  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();

  if (!url || !key) {
    console.error(
      "Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)."
    );
    console.error("Set them in the environment or in .env / web/.env.local");
    process.exit(1);
  }

  if (!/^https?:\/\//i.test(url)) {
    console.error("Invalid SUPABASE_URL: must be a valid HTTP(S) URL.");
    process.exit(1);
  }

  const videoPath =
    process.env.VIDEO_PATH ||
    process.argv[2] ||
    DEFAULT_VIDEO_PATH;

  let resolvedPath = videoPath;
  if (resolvedPath.startsWith("~/"))
    resolvedPath = join(homedir(), resolvedPath.slice(2));

  try {
    const st = statSync(resolvedPath);
    if (!st.isFile()) throw new Error("Not a file");
  } catch {
    console.error("Video file not found:", resolvedPath);
    console.error("Set VIDEO_PATH or pass path as first argument.");
    process.exit(1);
  }

  const body = readFileSync(resolvedPath);
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET);
  if (!bucketExists) {
    console.log(`Bucket "${BUCKET}" not found. Creating...`);
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
    });
    if (createErr) {
      console.error(
        "Could not create bucket:",
        createErr.message,
        "\nCreate the bucket in Supabase Dashboard (Storage → New bucket → Public)."
      );
      process.exit(1);
    }
    console.log("  Bucket created.");
  }

  console.log(`Uploading ${resolvedPath} to ${BUCKET}/${OBJECT_PATH} ...`);
  const { error } = await supabase.storage.from(BUCKET).upload(OBJECT_PATH, body, {
    contentType: "video/mp4",
    upsert: true,
  });

  if (error) {
    console.error("Upload failed:", error.message);
    process.exit(1);
  }

  const base = url.replace(/\/$/, "");
  const publicUrl = `${base}/storage/v1/object/public/${BUCKET}/${OBJECT_PATH}`;
  console.log("\nDone. Public URL:");
  console.log("  ", publicUrl);
  console.log("\nAdd to web/.env.local:");
  console.log("  NEXT_PUBLIC_OPENCLAW_VIDEO_URL=" + publicUrl);
}

main();
