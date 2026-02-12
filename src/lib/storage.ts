import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "./supabase";

/**
 * Get current date folder path in YYYY-MM-DD format
 */
function getDateFolder(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Upload an image to Supabase Storage (uploads folder)
 * Returns the public URL
 */
export async function saveUpload(
  base64: string,
  mimeType: string
): Promise<string> {
  const ext = mimeType.split("/")[1] || "png";
  const filename = `${uuidv4()}.${ext}`;
  const dateFolder = getDateFolder();
  const storagePath = `uploads/${dateFolder}/${filename}`;

  const buffer = Buffer.from(base64, "base64");

  const { error } = await supabaseAdmin.storage
    .from("stage-images")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data } = supabaseAdmin.storage
    .from("stage-images")
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Upload a generated result image to Supabase Storage (results folder)
 * Returns the public URL
 */
export async function saveResult(
  base64: string,
  mimeType: string
): Promise<string> {
  const ext = mimeType.split("/")[1] || "png";
  const filename = `${uuidv4()}.${ext}`;
  const dateFolder = getDateFolder();
  const storagePath = `results/${dateFolder}/${filename}`;

  const buffer = Buffer.from(base64, "base64");

  const { error } = await supabaseAdmin.storage
    .from("stage-images")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Supabase result upload error:", error);
    throw new Error(`Failed to upload result image: ${error.message}`);
  }

  // Get public URL
  const { data } = supabaseAdmin.storage
    .from("stage-images")
    .getPublicUrl(storagePath);

  return data.publicUrl;
}
