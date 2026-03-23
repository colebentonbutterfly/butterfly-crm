import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json([]);
  }

  // Search for similar items by name
  const items = await prisma.item.findMany({
    where: {
      name: { contains: name },
    },
    select: { id: true, name: true, location: true, barcode: true },
    take: 5,
  });

  return NextResponse.json(items);
}
