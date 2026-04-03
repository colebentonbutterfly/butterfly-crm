import Link from "next/link";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold tracking-tight text-butterflyPurple">Butterfly Assets CRM</div>
            <div className="text-xs text-gray-500">Foreclosure • Subject-To • Portfolio</div>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link className="hover:underline" href="/dashboard">Dashboard</Link>
            <Link className="hover:underline" href="/leads">Leads</Link>
            <Link className="hover:underline" href="/deals">Deals</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-gray-500">
        Internal Use Only — Butterfly Assets LLC
      </footer>
    </div>
  );
}
