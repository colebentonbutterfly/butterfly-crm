import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.item.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const item = await prisma.item.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description ?? undefined,
      category: body.category,
      location: body.location,
      condition: body.condition ?? undefined,
      quantity: body.quantity ?? undefined,
      barcode: body.barcode ?? undefined,
      photoUrl: body.photoUrl ?? undefined,
      notes: body.notes ?? undefined,
      boxNumber: body.boxNumber ?? undefined,
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.item.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
