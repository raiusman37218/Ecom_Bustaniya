import { NextResponse } from "next/server";
import { authorizeAdminSession } from "../../../../lib/adminAuth";
import { getCourierAdapter, POSTEX_FALLBACK_PICKUP_ADDRESSES } from "../../../../lib/courierAdapters";

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "orders");
  } catch (authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const courier = await getCourierAdapter("postex");
    const addresses = typeof courier.getPickupAddresses === "function"
      ? await courier.getPickupAddresses()
      : POSTEX_FALLBACK_PICKUP_ADDRESSES;

    const finalAddresses = Array.isArray(addresses) && addresses.length > 0
      ? addresses
      : POSTEX_FALLBACK_PICKUP_ADDRESSES;

    const defaultAddress = finalAddresses.find((a) => a.isDefault) || finalAddresses[0];

    return NextResponse.json({
      addresses: finalAddresses,
      defaultAddressCode: courier.pickupAddressCode || defaultAddress?.addressCode || "001",
      courier: courier.accountName || "PostEx",
      total: finalAddresses.length,
    });
  } catch (error) {
    console.warn("PostEx pickup addresses API route error, falling back to verified list:", error?.message);
    return NextResponse.json({
      addresses: POSTEX_FALLBACK_PICKUP_ADDRESSES,
      defaultAddressCode: "001",
      courier: "PostEx",
      total: POSTEX_FALLBACK_PICKUP_ADDRESSES.length,
      fallback: true,
    });
  }
}

