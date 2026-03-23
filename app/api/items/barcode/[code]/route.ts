import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const code = params.code.slice(0, 100);
  if (!code) return NextResponse.json({ error: "Barcode required" }, { status: 400 });

  try {
    const item = await prisma.item.findUnique({ where: { barcode: code } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to look up barcode" }, { status: 500 });
  }
}
