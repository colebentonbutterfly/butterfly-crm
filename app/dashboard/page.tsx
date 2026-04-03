import Shell from "@/components/Shell";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";

export default async function DashboardPage() {
  const [leadCount, dealCount, atRiskAssets] = await Promise.all([
    prisma.lead.count(),
    prisma.deal.count(),
    prisma.asset.count({ where: { status: "AT_RISK" } }),
  ]);

  const urgentLeads = await prisma.lead.findMany({
    where: { status: { in: [LeadStatus.NEW, LeadStatus.CONTACTED] } },
    orderBy: [{ urgency: "desc" }, { updatedAt: "desc" }],
    take: 8,
    include: { seller: true, property: true },
  });

  return (
    <Shell>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Leads" value={leadCount} />
        <Card title="Deals" value={dealCount} />
        <Card title="At-Risk Assets" value={atRiskAssets} />
      </div>

      <div className="mt-8">
        <div className="text-sm font-semibold">Urgent / Active Leads</div>
        <div className="mt-2 overflow-hidden rounded border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="p-2 text-left">Seller</th>
                <th className="p-2 text-left">Property</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Urgency</th>
                <th className="p-2 text-left">Sale Date</th>
              </tr>
            </thead>
            <tbody>
              {urgentLeads.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2">{l.seller.fullName}</td>
                  <td className="p-2">{l.property.address1}, {l.property.city}</td>
                  <td className="p-2">{l.status}</td>
                  <td className="p-2">{l.urgency}</td>
                  <td className="p-2">{l.saleDate ? new Date(l.saleDate).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {urgentLeads.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={5}>No active leads yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-gray-600">{title}</div>
      <div className="mt-2 text-2xl font-bold text-butterflyPurple">{value}</div>
    </div>
  );
}
