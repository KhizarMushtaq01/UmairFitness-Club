import { v2 as cloudinary } from "cloudinary";

/**
 * Real Cloudinary upload when CLOUDINARY_URL is set, otherwise a logged stub.
 * The SDK reads CLOUDINARY_URL from the environment on its own.
 */
export async function uploadImage(file: Buffer, filename: string) {
  if (!process.env.CLOUDINARY_URL) {
    console.log("[stub:uploads] uploadImage", filename);
    return { url: `https://stub-cdn.local/${encodeURIComponent(filename)}` };
  }
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "umair-fitness-club" }, (err, res) => {
      if (err || !res) reject(err ?? new Error("Cloudinary returned no result"));
      else resolve(res as { secure_url: string });
    });
    stream.end(file);
  });
  return { url: result.secure_url };
}
