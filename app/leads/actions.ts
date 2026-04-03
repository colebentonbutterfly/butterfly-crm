"use server";

import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";
import { z } from "zod";

const LeadCreate = z.object({
  sellerName: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address1: z.string().min(4),
  city: z.string().min(2),
  state: z.string().min(2),
  zip: z.string().min(4),
  source: z.string().optional(),
  foreclosureFlag: z.string().optional(),
  noticeReceived: z.string().optional(),
  urgency: z.string().optional(),
  saleDate: z.string().optional(),
});

export async function createLead(formData: FormData) {
  const parsed = LeadCreate.parse({
    sellerName: formData.get("sellerName"),
    phone: formData.get("phone") || undefined,
    email: (formData.get("email") as string) || undefined,
    address1: formData.get("address1"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    source: (formData.get("source") as string) || undefined,
    foreclosureFlag: formData.get("foreclosureFlag") as string,
    noticeReceived: formData.get("noticeReceived") as string,
    urgency: formData.get("urgency") as string,
    saleDate: (formData.get("saleDate") as string) || undefined,
  });

  const urgency = Math.max(1, Math.min(5, Number(parsed.urgency || 3)));
  const foreclosureFlag = parsed.foreclosureFlag === "on";
  const noticeReceived = parsed.noticeReceived === "on";
  const saleDate = parsed.saleDate ? new Date(parsed.saleDate) : null;

  const seller = await prisma.seller.create({
    data: { fullName: parsed.sellerName, phone: parsed.phone || null, email: parsed.email || null },
  });

  const property = await prisma.property.create({
    data: { address1: parsed.address1, city: parsed.city, state: parsed.state, zip: parsed.zip },
  });

  await prisma.lead.create({
    data: {
      source: parsed.source || null,
      foreclosureFlag,
      noticeReceived,
      saleDate,
      urgency,
      status: LeadStatus.NEW,
      sellerId: seller.id,
      propertyId: property.id,
    },
  });
}
