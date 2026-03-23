import { prisma } from "@/lib/prisma";
import { generateBarcode } from "@/lib/barcode";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category") || "";
  const location = url.searchParams.get("location") || "";
  const boxNumber = url.searchParams.get("boxNumber") || "";
  const sortBy = url.searchParams.get("sortBy") || "updatedAt";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const all = url.searchParams.get("all") === "true";

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
  if (boxNumber) where.boxNumber = boxNumber;

  const validSortFields = ["name", "category", "location", "updatedAt", "createdAt", "quantity"];
  const orderField = validSortFields.includes(sortBy) ? sortBy : "updatedAt";
  const orderDir = sortOrder === "asc" ? "asc" : "desc";

  if (all) {
    const items = await prisma.item.findMany({
      where,
      orderBy: { [orderField]: orderDir },
    });
    return NextResponse.json(items);
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.item.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  const barcode = body.barcode || generateBarcode();

  const item = await prisma.item.create({
    data: {
      name: body.name.trim(),
      description: body.description || null,
      category: body.category || "Miscellaneous",
      location: body.location || "Pod 1",
      condition: body.condition || null,
      quantity: body.quantity || 1,
      barcode,
      photoUrl: body.photoUrl || null,
      photoUrls: body.photoUrls ? JSON.stringify(body.photoUrls) : null,
      notes: body.notes || null,
      boxNumber: body.boxNumber || null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
