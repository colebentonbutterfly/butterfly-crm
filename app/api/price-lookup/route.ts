import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";

const EBAY_APP_ID = process.env.EBAY_APP_ID || "";
const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";

let cachedToken: { token: string; expires: number } | null = null;

async function getEbayToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  const EBAY_CERT_ID = process.env.EBAY_CERT_ID || "";
  const credentials = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString("base64");

  const res = await fetch(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  });

  if (!res.ok) throw new Error("Failed to get eBay token");

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  if (!rateLimit(`price-lookup-${ip}`, 20, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const query = req.nextUrl.searchParams.get("q")?.slice(0, 200) || "";
  if (!query.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  if (!EBAY_APP_ID) {
    return NextResponse.json({
      error: "eBay API not configured",
      configured: false,
    }, { status: 503 });
  }

  try {
    const token = await getEbayToken();

    const searchRes = await fetch(
      `${EBAY_SEARCH_URL}?q=${encodeURIComponent(query)}&limit=10&sort=price`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!searchRes.ok) {
      return NextResponse.json({ error: "eBay search failed" }, { status: 502 });
    }

    const data = await searchRes.json();
    const items = (data.itemSummaries || []).map((item: Record<string, unknown>) => ({
      title: item.title,
      price: item.price,
      condition: item.condition,
      image: item.image ? (item.image as Record<string, string>).imageUrl : null,
      url: item.itemWebUrl,
      seller: item.seller ? (item.seller as Record<string, string>).username : null,
    }));

    const prices = items
      .map((i: { price?: { value?: string } }) => parseFloat(i.price?.value || "0"))
      .filter((p: number) => p > 0);

    const priceStats = prices.length > 0 ? {
      low: Math.min(...prices),
      high: Math.max(...prices),
      average: Math.round((prices.reduce((a: number, b: number) => a + b, 0) / prices.length) * 100) / 100,
      count: prices.length,
      currency: (items[0]?.price as { currency?: string })?.currency || "USD",
    } : null;

    return NextResponse.json({
      configured: true,
      query,
      priceStats,
      items,
      total: data.total || 0,
    });
  } catch {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
