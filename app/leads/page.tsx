import Shell from "@/components/Shell";
import { prisma } from "@/lib/prisma";
import { createLead } from "./actions";

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 50,
    include: { seller: true, property: true },
  });

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-butterflyPurple">Leads</h1>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="text-sm font-semibold">New Lead</div>
          <form action={createLead} className="mt-3 grid gap-3">
            <input name="sellerName" className="w-full rounded border px-3 py-2 text-sm" placeholder="Seller Full Name" required />
            <div className="grid gap-3 md:grid-cols-2">
              <input name="phone" className="w-full rounded border px-3 py-2 text-sm" placeholder="Phone" />
              <input name="email" className="w-full rounded border px-3 py-2 text-sm" placeholder="Email (optional)" />
            </div>
            <input name="address1" className="w-full rounded border px-3 py-2 text-sm" placeholder="Property Address" required />
            <div className="grid gap-3 md:grid-cols-3">
              <input name="city" className="w-full rounded border px-3 py-2 text-sm" placeholder="City" required />
              <input name="state" className="w-full rounded border px-3 py-2 text-sm" placeholder="State" required defaultValue="SC" />
              <input name="zip" className="w-full rounded border px-3 py-2 text-sm" placeholder="ZIP" required />
            </div>
            <div className="grid gap-3 md:grid-cols-3 items-center">
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" name="foreclosureFlag" /> Foreclosure
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" name="noticeReceived" /> Notice Received
              </label>
              <input name="urgency" className="w-full rounded border px-3 py-2 text-sm" placeholder="Urgency 1-5" defaultValue="3" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input name="saleDate" type="date" className="w-full rounded border px-3 py-2 text-sm" />
              <input name="source" className="w-full rounded border px-3 py-2 text-sm" placeholder="Lead Source (e.g., Flyer, Call, Referral)" />
            </div>

            <button className="rounded bg-butterflyPurple px-3 py-2 text-sm font-semibold text-white">
              Create Lead
            </button>
            <p className="text-xs text-gray-500">
              After creation, move the lead through stages in Deals (conversion flow is next iteration).
            </p>
          </form>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-sm font-semibold">Recent Leads</div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-600">
              <tr>
                <th className="p-2 text-left">Seller</th>
                <th className="p-2 text-left">Property</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Urgency</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2">{l.seller.fullName}</td>
                  <td className="p-2">{l.property.address1}</td>
                  <td className="p-2">{l.status}</td>
                  <td className="p-2">{l.urgency}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={4}>No leads yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
