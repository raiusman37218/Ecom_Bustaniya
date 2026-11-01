import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../lib/adminAuth";
import { supabaseAdminRequest } from "../../../../lib/supabaseRest";

export async function GET(request) {
  try {
    await authorizeAdminRequest(request);
  } catch (authError) {
    return NextResponse.json(
      { error: authError.message || "Unauthorized" },
      { status: authError.status || 401 }
    );
  }

  try {
    const rows = await supabaseAdminRequest("newsletter_subscribers?select=*&order=created_at.desc");
    return NextResponse.json({ subscribers: rows || [] });
  } catch (error) {
    console.error("Admin fetch subscribers error:", error);
    return NextResponse.json(
      { error: error.message || "Unable to fetch subscribers." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    await authorizeAdminRequest(request);
  } catch (authError) {
    return NextResponse.json(
      { error: authError.message || "Unauthorized" },
      { status: authError.status || 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Subscriber ID is required." }, { status: 400 });
    }

    await supabaseAdminRequest(`newsletter_subscribers?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin delete subscriber error:", error);
    return NextResponse.json(
      { error: error.message || "Unable to delete subscriber." },
      { status: 500 }
    );
  }
}
