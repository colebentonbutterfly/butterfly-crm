import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const code = params.code.slice(0, 100);
  const box = await prisma.box.findUnique({
    where: { barcode: code },
    include: {
      items: {
        select: {
          id: true, name: true, category: true, location: true,
          barcode: true, photoUrl: true, estimatedValue: true,
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
