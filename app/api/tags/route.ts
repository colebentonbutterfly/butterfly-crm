import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

const tagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6b7280"),
});

export async function GET() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(tags);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = tagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation error" }, { status: 400 });
  }

  try {
    const tag = await prisma.tag.create({ data: parsed.data });
    return NextResponse.json(tag, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create tag (name may already exist)" }, { status: 409 });
  }
}
