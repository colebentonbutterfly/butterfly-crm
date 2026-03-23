import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const boxes = await prisma.item.groupBy({
    by: ["boxNumber"],
    where: { boxNumber: { not: null } },
    _count: { id: true },
    orderBy: { boxNumber: "asc" },
  });

  const result = await Promise.all(
    boxes
      .filter((b) => b.boxNumber)
      .map(async (b) => {
        const items = await prisma.item.findMany({
          where: { boxNumber: b.boxNumber! },
          orderBy: { name: "asc" },
        });
        const locations = [...new Set(items.map((i) => i.location))];
        const totalValue = items.reduce((sum, i) => sum + (i.estimatedValue || 0), 0);
        return {
          boxNumber: b.boxNumber!,
          count: b._count.id,
          locations,
          totalValue,
          items,
        };
      })
  );

  return NextResponse.json(result);
}
