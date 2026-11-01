import { NextResponse } from "next/server";
import { supabaseAdminRequest } from "../../../lib/supabaseRest";

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const source = String(body?.source || "homepage_newsletter").trim().slice(0, 50);

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Check if already subscribed
    try {
      const existing = await supabaseAdminRequest(
        `newsletter_subscribers?select=id,email,discount_code,status&email=eq.${encodeURIComponent(email)}&limit=1`
      );

      if (Array.isArray(existing) && existing.length > 0) {
        return NextResponse.json({
          ok: true,
          alreadySubscribed: true,
          discountCode: existing[0]?.discount_code || "WELCOME10",
          message: "You are already subscribed to the Bustaniya Circle! Use code WELCOME10 for 10% off.",
        });
      }

      // Insert new subscriber
      await supabaseAdminRequest("newsletter_subscribers", {
        method: "POST",
        body: {
          email,
          source,
          discount_code: "WELCOME10",
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        ok: true,
        isNew: true,
        discountCode: "WELCOME10",
        message: "Welcome to the Bustaniya Circle! Enjoy 10% off your first order.",
      });
    } catch (dbError) {
      console.error("Newsletter database save error:", dbError);
      // Even if DB has a transient issue, return the discount code so customer isn't blocked
      return NextResponse.json({
        ok: true,
        isNew: true,
        discountCode: "WELCOME10",
        message: "Welcome to the Bustaniya Circle! Enjoy 10% off your first order.",
      });
    }
  } catch (error) {
    console.error("Newsletter API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
