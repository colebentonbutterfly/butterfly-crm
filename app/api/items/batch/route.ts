import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { ids, location } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No items selected" }, { status: 400 });
  }
  if (!location) {
    return NextResponse.json({ error: "Location is required" }, { status: 400 });
  }

  const result = await prisma.item.updateMany({
    where: { id: { in: ids } },
    data: { location },
  });

  return NextResponse.json({ updated: result.count });
}
