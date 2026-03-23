import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUsername } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const createBoxSchema = z.object({
  name: z.string().max(255).optional().nullable(),
  location: z.string().max(100).default("Pod 1"),
  notes: z.string().max(5000).optional().nullable(),
});

export async function GET() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const boxes = await prisma.box.findMany({
    orderBy: { number: "asc" },
    include: {
      items: {
        select: {
          id: true,
          name: true,
          category: true,
          location: true,
          barcode: true,
          photoUrl: true,
          estimatedValue: true,
          condition: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  return NextResponse.json(boxes.map((box) => ({
    ...box,
    count: box.items.length,
    totalValue: box.items.reduce((sum, i) => sum + (i.estimatedValue || 0), 0),
    locations: [...new Set(box.items.map((i) => i.location))],
  })));
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  if (!rateLimit(`boxes-post-${ip}`, 30, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createBoxSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation error" }, { status: 400 });
  }

  // Get next box number
  const lastBox = await prisma.box.findFirst({ orderBy: { number: "desc" } });
  const nextNumber = (lastBox?.number || 0) + 1;

  // Generate box barcode: BOX-XXXX
  const barcode = `BOX-${String(nextNumber).padStart(4, "0")}`;

  const box = await prisma.box.create({
    data: {
      number: nextNumber,
      barcode,
      name: parsed.data.name || null,
      location: parsed.data.location,
      notes: parsed.data.notes || null,
    },
  });

  return NextResponse.json(box, { status: 201 });
}
