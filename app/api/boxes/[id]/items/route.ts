import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUsername } from "@/lib/api-auth";
import { z } from "zod";

const assignItemSchema = z.object({
  itemId: z.string().optional(),
  barcode: z.string().optional(),
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

  const updated = await prisma.item.update({
    where: { id: item.id },
    data: {
      boxId: box.id,
      boxNumber: boxLabel,
    },
  });

  await prisma.activityLog.create({
    data: {
      itemId: item.id,
      action: "updated",
      details: `Assigned to ${boxLabel}`,
      user: getUsername(session),
    },
  });

  return NextResponse.json({ item: updated, box: boxLabel });
}

// DELETE: Remove an item from this box
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError, session } = await requireAuth();
  if (authError) return authError;

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const itemId = body.itemId;
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  await prisma.item.update({
    where: { id: itemId },
    data: { boxId: null, boxNumber: null },
  });

  await prisma.activityLog.create({
    data: {
      itemId: item.id,
      action: "updated",
      details: `Removed from box`,
      user: getUsername(session),
    },
  });

  return NextResponse.json({ success: true });
}
