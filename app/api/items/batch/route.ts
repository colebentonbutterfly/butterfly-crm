import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUsername } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { batchTransferSchema } from "@/lib/validation";

export async function PUT(req: NextRequest) {
  const { error: authError, session } = await requireAuth();
  if (authError) return authError;

  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  if (!rateLimit(`batch-${ip}`, 10, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = batchTransferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation error" }, { status: 400 });
  }

  const { ids, location } = parsed.data;

  try {
    const username = getUsername(session);

    const result = await prisma.$transaction(async (tx) => {
      // Get items before update for logging
      const items = await tx.item.findMany({ where: { id: { in: ids } } });

      const updateResult = await tx.item.updateMany({
        where: { id: { in: ids } },
        data: { location },
      });

      // Log each move
      if (items.length > 0) {
        await tx.activityLog.createMany({
          data: items.map((item) => ({
            itemId: item.id,
            action: "moved",
            details: `Batch moved from ${item.location} to ${location}`,
            user: username,
          })),
        });
      }

      return updateResult;
    });

    return NextResponse.json({ updated: result.count });
  } catch {
    return NextResponse.json({ error: "Failed to batch transfer items" }, { status: 500 });
  }
}
