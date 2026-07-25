import { NextResponse } from "next/server";
import { getCourierAdapter } from "../../../../lib/courierAdapters";

export async function GET() {
  try {
    const courier = await getCourierAdapter("postex");
    return NextResponse.json({ cities: await courier.getCities(), courier: courier.accountName });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Unable to load delivery cities." },
      { status: error?.status === 503 ? 503 : 502 }
    );
  }
}
