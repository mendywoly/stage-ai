import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const RESULTS_DIR = path.join(process.cwd(), "public", "results");

function ensureDirs() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

export function saveUpload(base64: string, mimeType: string): string {
  ensureDirs();
  const ext = mimeType.split("/")[1] || "png";
  const filename = `${uuidv4()}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(base64, "base64"));
  return `/uploads/${filename}`;
}

export function saveResult(base64: string, mimeType: string): string {
  ensureDirs();
  const ext = mimeType.split("/")[1] || "png";
  const filename = `${uuidv4()}.${ext}`;
  const filepath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(base64, "base64"));
  return `/results/${filename}`;
}
