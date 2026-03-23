import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUsername } from "@/lib/api-auth";
import { z } from "zod";

const updateBoxSchema = z.object({
  name: z.string().max(255).optional().nullable(),
  location: z.string().max(100).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const box = await prisma.box.findUnique({
    where: { id: params.id },
    include: {
      items: {
        select: {
          id: true, name: true, category: true, location: true,
          barcode: true, photoUrl: true, estimatedValue: true, condition: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!box) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...box,
    count: box.items.length,
    totalValue: box.items.reduce((sum, i) => sum + (i.estimatedValue || 0), 0),
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const existing = await prisma.box.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateBoxSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const box = await prisma.box.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name !== undefined ? parsed.data.name : existing.name,
      location: parsed.data.location ?? existing.location,
      notes: parsed.data.notes !== undefined ? parsed.data.notes : existing.notes,
    },
  });

  return NextResponse.json(box);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const existing = await prisma.box.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Unassign items from this box first
  await prisma.item.updateMany({
    where: { boxId: params.id },
    data: { boxId: null, boxNumber: null },
  });

  await prisma.box.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
