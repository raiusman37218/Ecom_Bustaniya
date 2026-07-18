import { NextResponse } from "next/server";

// Product prices do not include delivery. A single Rs. 200 fee is charged
// once per order, regardless of the cart total or number of products.
export async function POST(request) {
  try {
    const { items = [] } = await request.json();
    const hasItems = Array.isArray(items) && items.length > 0;
    return NextResponse.json({ delivery: hasItems ? 200 : 0 });
  } catch {
    return NextResponse.json({ delivery: 200 });
  }
}
