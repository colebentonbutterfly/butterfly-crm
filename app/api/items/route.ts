import { prisma } from "@/lib/prisma";
import { generateBarcode } from "@/lib/barcode";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category") || "";
  const location = url.searchParams.get("location") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { barcode: { contains: search } },
      { boxNumber: { contains: search } },
      { notes: { contains: search } },
    ];
  }
  if (category) where.category = category;
  if (location) where.location = location;

  const items = await prisma.item.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const barcode = body.barcode || generateBarcode();

  const item = await prisma.item.create({
    data: {
      name: body.name,
      description: body.description || null,
      category: body.category,
      location: body.location,
      condition: body.condition || null,
      quantity: body.quantity || 1,
      barcode,
      photoUrl: body.photoUrl || null,
      notes: body.notes || null,
      boxNumber: body.boxNumber || null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
