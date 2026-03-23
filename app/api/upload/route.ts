import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// JPEG/PNG/WebP/GIF magic bytes
const MAGIC_BYTES: [string, number[]][] = [
  ["jpg", [0xFF, 0xD8, 0xFF]],
  ["png", [0x89, 0x50, 0x4E, 0x47]],
  ["gif", [0x47, 0x49, 0x46]],
  ["webp", [0x52, 0x49, 0x46, 0x46]], // RIFF header
];

function detectFileType(buffer: Buffer): string | null {
  for (const [ext, magic] of MAGIC_BYTES) {
    if (magic.every((b, i) => buffer[i] === b)) return ext;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  if (!rateLimit(`upload-${ip}`, 20, 60000)) {
    return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
  }

  let formData;
  try { formData = await req.formData(); } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Size check
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  // MIME type check
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed." }, { status: 400 });
  }

  // Extension check
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Magic byte verification
  const detectedType = detectFileType(buffer);
  if (!detectedType) {
    return NextResponse.json({ error: "File content does not match an allowed image format" }, { status: 400 });
  }

  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Use detected type as extension for safety
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : detectedType;
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch {
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
