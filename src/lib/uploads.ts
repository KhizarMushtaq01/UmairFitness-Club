import { v2 as cloudinary } from "cloudinary";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * Real Cloudinary upload when CLOUDINARY_URL is set, otherwise a local write.
 * The SDK reads CLOUDINARY_URL from the environment on its own.
 *
 * The stub used to return a https://stub-cdn.local/... url. next/image refuses
 * any host not listed in next.config.ts remotePatterns, so every uploaded
 * image was broken on the gallery page that had just accepted it — in the
 * default configuration, since CLOUDINARY_URL is normally unset. Writing into
 * public/uploads and returning a relative path needs no remotePatterns entry
 * and actually renders.
 *
 * Writing to public/ at runtime does not work on a serverless host. That is
 * fine: this branch is the local stub, and a deployment sets CLOUDINARY_URL.
 */
export async function uploadImage(file: Buffer, filename: string) {
  if (!process.env.CLOUDINARY_URL) {
    // path.basename drops any directory part the client put in the filename,
    // so "../../.env" cannot escape public/uploads, and the character filter
    // removes everything else that could confuse a path. The uuid prefix
    // keeps two uploads of "photo.jpg" from overwriting each other.
    const safeName = `${randomUUID()}-${path.basename(filename).replace(/[^\w.\-]/g, "_")}`;
    await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_UPLOAD_DIR, safeName), file);
    console.log("[stub:uploads] uploadImage ->", safeName);
    return { url: `/uploads/${safeName}` };
  }

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "umair-fitness-club" },
      (err, res) => {
        if (err || !res) reject(err ?? new Error("Cloudinary returned no result"));
        else resolve(res as { secure_url: string });
      }
    );
    stream.end(file);
  });
  return { url: result.secure_url };
}
