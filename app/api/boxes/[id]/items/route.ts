import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUsername } from "@/lib/api-auth";
import { z } from "zod";

const assignItemSchema = z.object({
  itemId: z.string().optional(),
  barcode: z.string().optional(),
});

const removeItemSchema = z.object({
  itemId: z.string().min(1),
});

// POST: Assign an item to this box (by item ID or by scanning a barcode)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError, session } = await requireAuth();
  if (authError) return authError;

  const box = await prisma.box.findUnique({ where: { id: params.id } });
  if (!box) return NextResponse.json({ error: "Box not found" }, { status: 404 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = assignItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!parsed.data.itemId && !parsed.data.barcode) {
    return NextResponse.json({ error: "Either itemId or barcode is required" }, { status: 400 });
  }

  try {
    let item;
    if (parsed.data.itemId) {
      item = await prisma.item.findUnique({ where: { id: parsed.data.itemId } });
    } else if (parsed.data.barcode) {
      item = await prisma.item.findUnique({ where: { barcode: parsed.data.barcode } });
    }

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const boxLabel = `Box ${box.number}${box.name ? ` - ${box.name}` : ""}`;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.item.update({
        where: { id: item.id },
        data: {
          boxId: box.id,
          boxNumber: boxLabel,
        },
      });

      await tx.activityLog.create({
        data: {
          itemId: item.id,
          action: "updated",
          details: `Assigned to ${boxLabel}`,
          user: getUsername(session),
        },
      });

      return result;
    });

    return NextResponse.json({ item: updated, box: boxLabel });
  } catch {
    return NextResponse.json({ error: "Failed to assign item to box" }, { status: 500 });
  }
}

// DELETE: Remove an item from this box
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError, session } = await requireAuth();
  if (authError) return authError;

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = removeItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  try {
    const item = await prisma.item.findUnique({ where: { id: parsed.data.itemId } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.item.update({
        where: { id: parsed.data.itemId },
        data: { boxId: null, boxNumber: null },
      });

      await tx.activityLog.create({
        data: {
          itemId: item.id,
          action: "updated",
          details: `Removed from box`,
          user: getUsername(session),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove item from box" }, { status: 500 });
  }
}
