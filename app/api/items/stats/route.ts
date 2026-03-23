import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  if (!rateLimit(`stats-${ip}`, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const [total, pod1, pod2, container, donated, trash, categories] = await Promise.all([
    prisma.item.count(),
    prisma.item.count({ where: { location: "Pod 1" } }),
    prisma.item.count({ where: { location: "Pod 2" } }),
    prisma.item.count({ where: { location: "Shipping Container" } }),
    prisma.item.count({ where: { location: "Donated" } }),
    prisma.item.count({ where: { location: "Trash" } }),
    prisma.item.groupBy({ by: ["category"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
  ]);

  const recentItems = await prisma.item.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  // Aggregate estimated value
  const valueResult = await prisma.item.aggregate({
    _sum: { estimatedValue: true },
  });

  return NextResponse.json({
    total,
    byLocation: { "Pod 1": pod1, "Pod 2": pod2, "Shipping Container": container, "Donated": donated, "Trash": trash },
    byCategory: categories.map((c) => ({ category: c.category, count: c._count.id })),
    recentItems,
    totalEstimatedValue: valueResult._sum.estimatedValue || 0,
  });
}
