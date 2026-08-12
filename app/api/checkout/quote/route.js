import { NextResponse } from "next/server";
import { getStoreSettings } from "../../../../lib/storeSettings";
import { calculatePaymentAmounts } from "../../../../lib/paymentRules";

// Kept for external clients. Checkout itself uses the authoritative order API.
export async function POST(request) {
  try {
    const { items = [], paymentMethod = "cod" } = await request.json();
    const hasItems = Array.isArray(items) && items.some((item) => Number(item?.quantity || 0) > 0);
    const settings = await getStoreSettings();
    const amounts = calculatePaymentAmounts({ subtotal: 0, paymentMethod, paymentSettings: settings.paymentSettings });
    return NextResponse.json({ delivery: hasItems ? amounts.deliveryCharges : 0, paymentMethod: amounts.paymentMethod });
  } catch {
    return NextResponse.json({ delivery: 0 });
  }
}
