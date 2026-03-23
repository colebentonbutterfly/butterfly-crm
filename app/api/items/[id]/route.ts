import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUsername } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { updateItemSchema } from "@/lib/validation";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const item = await prisma.item.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError, session } = await requireAuth();
  if (authError) return authError;

  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  if (!rateLimit(`items-put-${ip}`, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const existing = await prisma.item.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;

  const item = await prisma.item.update({
    where: { id: params.id },
    data: {
      name: data.name ?? existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      category: data.category ?? existing.category,
      location: data.location ?? existing.location,
      condition: data.condition !== undefined ? data.condition : existing.condition,
      quantity: data.quantity ?? existing.quantity,
      barcode: data.barcode ?? existing.barcode,
      photoUrl: data.photoUrl !== undefined ? data.photoUrl : existing.photoUrl,
      photoUrls: data.photoUrls !== undefined ? JSON.stringify(data.photoUrls) : existing.photoUrls,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      boxNumber: data.boxNumber !== undefined ? data.boxNumber : existing.boxNumber,
      estimatedValue: data.estimatedValue !== undefined ? data.estimatedValue : existing.estimatedValue,
      tags: data.tags !== undefined ? JSON.stringify(data.tags) : existing.tags,
    },
  });

  // Build change description
  const changes: string[] = [];
  if (data.location && data.location !== existing.location) {
    changes.push(`Moved from ${existing.location} to ${data.location}`);
  }
  if (data.name && data.name !== existing.name) {
    changes.push(`Renamed from "${existing.name}" to "${data.name}"`);
  }
  if (data.estimatedValue !== undefined && data.estimatedValue !== existing.estimatedValue) {
    changes.push(`Value updated to $${data.estimatedValue ?? 0}`);
  }
  if (data.tags !== undefined) {
    changes.push(`Tags updated`);
  }

  const action = data.location && data.location !== existing.location ? "moved" : "updated";
  const details = changes.length > 0 ? changes.join("; ") : `Updated item "${item.name}"`;

  await prisma.activityLog.create({
    data: {
      itemId: item.id,
      action,
      details,
      user: getUsername(session),
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError, session } = await requireAuth();
  if (authError) return authError;

  const existing = await prisma.item.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Log before deleting (cascade will remove logs too, but we want a record)
  await prisma.activityLog.create({
    data: {
      itemId: existing.id,
      action: "deleted",
      details: `Deleted item "${existing.name}" from ${existing.location}`,
      user: getUsername(session),
    },
  });

  await prisma.item.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
