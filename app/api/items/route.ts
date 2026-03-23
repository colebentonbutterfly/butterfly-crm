import { prisma } from "@/lib/prisma";
import { generateBarcode } from "@/lib/barcode";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUsername } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { createItemSchema, searchSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  if (!rateLimit(`items-get-${ip}`, 120)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = req.nextUrl;
  const params = searchSchema.safeParse({
    search: url.searchParams.get("search") || undefined,
    category: url.searchParams.get("category") || undefined,
    location: url.searchParams.get("location") || undefined,
    boxNumber: url.searchParams.get("boxNumber") || undefined,
    sortBy: url.searchParams.get("sortBy") || undefined,
    sortOrder: url.searchParams.get("sortOrder") || undefined,
    page: url.searchParams.get("page") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  });

  if (!params.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const { search, category, location, boxNumber, sortBy, sortOrder, page, limit } = {
    search: "", category: "", location: "", boxNumber: "",
    sortBy: "updatedAt", sortOrder: "desc" as const, page: 1, limit: 50,
    ...params.data,
  };

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

  const validSortFields = ["name", "category", "location", "updatedAt", "createdAt", "quantity", "estimatedValue"];
  const orderField = validSortFields.includes(sortBy) ? sortBy : "updatedAt";
  const orderDir = sortOrder === "asc" ? "asc" : "desc";

  // Export mode: bounded to 5000 items max
  const exportMode = url.searchParams.get("export") === "true";
  if (exportMode) {
    const items = await prisma.item.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      take: 5000,
    });
    return NextResponse.json(items);
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      skip: (page - 1) * limit,
      take: Math.min(limit, 200),
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
  const { error: authError, session } = await requireAuth();
  if (authError) return authError;

  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  if (!rateLimit(`items-post-${ip}`, 30, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;
  const barcode = data.barcode || generateBarcode();

  const item = await prisma.item.create({
    data: {
      name: data.name.trim(),
      description: data.description || null,
      category: data.category || "Miscellaneous",
      location: data.location || "Pod 1",
      condition: data.condition || null,
      quantity: data.quantity || 1,
      barcode,
      photoUrl: data.photoUrl || null,
      photoUrls: data.photoUrls ? JSON.stringify(data.photoUrls) : null,
      notes: data.notes || null,
      boxNumber: data.boxNumber || null,
      estimatedValue: data.estimatedValue ?? null,
      tags: data.tags ? JSON.stringify(data.tags) : null,
    },
  });

  await prisma.activityLog.create({
    data: {
      itemId: item.id,
      action: "created",
      details: `Created item "${item.name}" in ${item.location}`,
      user: getUsername(session),
    },
  });

  return NextResponse.json(item, { status: 201 });
}
