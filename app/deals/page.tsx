import Shell from "@/components/Shell";
import { prisma } from "@/lib/prisma";
import { createDeal } from "./actions";

export default async function DealsPage() {
  const [deals, sellers, properties] = await Promise.all([
    prisma.deal.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 50,
      include: { seller: true, property: true, tasks: true },
    }),
    prisma.seller.findMany({ orderBy: [{ createdAt: "desc" }], take: 100 }),
    prisma.property.findMany({ orderBy: [{ createdAt: "desc" }], take: 100 }),
  ]);

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-butterflyPurple">Deals</h1>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="text-sm font-semibold">Create Deal (from existing Seller + Property)</div>
          <form action={createDeal} className="mt-3 grid gap-3">
            <select name="sellerId" className="w-full rounded border px-3 py-2 text-sm" required>
              <option value="">Select Seller</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
            <select name="propertyId" className="w-full rounded border px-3 py-2 text-sm" required>
              <option value="">Select Property</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address1}, {p.city}</option>)}
            </select>
            <select name="dealType" className="w-full rounded border px-3 py-2 text-sm" required>
              <option value="SUBJECT_TO">Subject-To</option>
              <option value="CASH">Cash</option>
              <option value="HYBRID">Hybrid</option>
            </select>
            <div className="grid gap-3 md:grid-cols-3">
              <input name="purchasePrice" className="w-full rounded border px-3 py-2 text-sm" placeholder="Purchase Price" />
              <input name="loanBalance" className="w-full rounded border px-3 py-2 text-sm" placeholder="Loan Balance" />
              <input name="monthlyPayment" className="w-full rounded border px-3 py-2 text-sm" placeholder="Monthly Payment" />
            </div>
            <input name="exitStrategy" className="w-full rounded border px-3 py-2 text-sm" placeholder="Exit Strategy (Hold/Rent/Flip)" />

            <button className="rounded bg-butterflyPurple px-3 py-2 text-sm font-semibold text-white">
              Create Deal + Compliance Tasks
            </button>
            <p className="text-xs text-gray-500">
              This creates your deal plus the required compliance task stack automatically.
            </p>
          </form>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-sm font-semibold">Recent Deals</div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-600">
              <tr>
                <th className="p-2 text-left">Seller</th>
                <th className="p-2 text-left">Property</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Open Tasks</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const open = d.tasks.filter(t => !t.completed).length;
                return (
                  <tr key={d.id} className="border-t">
                    <td className="p-2">{d.seller.fullName}</td>
                    <td className="p-2">{d.property.address1}</td>
                    <td className="p-2">{d.dealType}</td>
                    <td className="p-2">{d.status}</td>
                    <td className="p-2">{open}</td>
                  </tr>
                );
              })}
              {deals.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={5}>No deals yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
