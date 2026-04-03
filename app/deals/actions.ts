"use server";

import { prisma } from "@/lib/prisma";
import { DealType, LeadStatus } from "@prisma/client";
import { z } from "zod";

const DealCreate = z.object({
  sellerId: z.string().min(1),
  propertyId: z.string().min(1),
  dealType: z.enum(["SUBJECT_TO", "CASH", "HYBRID"]),
  purchasePrice: z.string().optional(),
  loanBalance: z.string().optional(),
  monthlyPayment: z.string().optional(),
  exitStrategy: z.string().optional(),
});

export async function createDeal(formData: FormData) {
  const parsed = DealCreate.parse({
    sellerId: formData.get("sellerId"),
    propertyId: formData.get("propertyId"),
    dealType: formData.get("dealType"),
    purchasePrice: formData.get("purchasePrice") || undefined,
    loanBalance: formData.get("loanBalance") || undefined,
    monthlyPayment: formData.get("monthlyPayment") || undefined,
    exitStrategy: formData.get("exitStrategy") || undefined,
  });

  const deal = await prisma.deal.create({
    data: {
      sellerId: parsed.sellerId,
      propertyId: parsed.propertyId,
      dealType: parsed.dealType as DealType,
      status: LeadStatus.QUALIFIED,
      purchasePrice: parsed.purchasePrice ? Number(parsed.purchasePrice) : null,
      loanBalance: parsed.loanBalance ? Number(parsed.loanBalance) : null,
      monthlyPayment: parsed.monthlyPayment ? Number(parsed.monthlyPayment) : null,
      exitStrategy: parsed.exitStrategy || null,
    },
  });

  // Create required compliance tasks (minimum set)
  const requiredTasks = [
    { title: "Investor Status Disclosure delivered & signed", stage: LeadStatus.CONTACTED },
    { title: "SC Attorney Disclosure delivered & signed", stage: LeadStatus.CONTACTED },
    { title: "Subject-To Disclosure delivered & signed (if applicable)", stage: LeadStatus.UNDER_CONTRACT },
    { title: "Due-On-Sale Clause Explainer delivered & initialed", stage: LeadStatus.UNDER_CONTRACT },
    { title: "Executed Purchase Agreement uploaded", stage: LeadStatus.UNDER_CONTRACT },
    { title: "Settlement Statement uploaded (HUD/CD)", stage: LeadStatus.CLOSING_SCHEDULED },
    { title: "Insurance binder uploaded", stage: LeadStatus.CLOSING_SCHEDULED },
    { title: "First payment verified (post-close)", stage: LeadStatus.CLOSED_POST_CLOSE },
  ];

  await prisma.task.createMany({
    data: requiredTasks.map(t => ({ ...t, dealId: deal.id, required: true })),
  });
}
