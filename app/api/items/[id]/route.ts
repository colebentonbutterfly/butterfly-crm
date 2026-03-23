import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.item.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.item.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const item = await prisma.item.update({
    where: { id: params.id },
    data: {
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      category: body.category ?? existing.category,
      location: body.location ?? existing.location,
      condition: body.condition ?? existing.condition,
      quantity: body.quantity ?? existing.quantity,
      barcode: body.barcode ?? existing.barcode,
      photoUrl: body.photoUrl ?? existing.photoUrl,
      photoUrls: body.photoUrls !== undefined ? JSON.stringify(body.photoUrls) : existing.photoUrls,
      notes: body.notes ?? existing.notes,
      boxNumber: body.boxNumber ?? existing.boxNumber,
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.item.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.item.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
