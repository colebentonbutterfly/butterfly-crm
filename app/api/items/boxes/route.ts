import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
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
        return {
          boxNumber: b.boxNumber!,
          count: b._count.id,
          locations,
          items,
        };
      })
  );

  return NextResponse.json(result);
}
