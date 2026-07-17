import { NextResponse } from "next/server";
import { authorizeAdminSession } from "../../../../lib/adminAuth";

export async function GET(request) {
  try {
    const { user } = await authorizeAdminSession(request);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Admin session is required." },
      { status: error?.status || 401 }
    );
  }
}
