import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdminRequest } from "../../../../../lib/supabaseRest";

function validSignature(payload, secret, signature) {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const actual = String(signature).replace(/^sha256=/i, "");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
export async function POST(request, { params }) {
  const { provider } = await params; const payload = await request.text();
  try {
    const rows = await supabaseAdminRequest(`courier_accounts?select=id,credentials,status&provider=eq.${encodeURIComponent(provider)}&status=eq.active&limit=1`);
    const account = rows?.[0]; const signature = request.headers.get("x-courier-signature") || request.headers.get("x-signature");
    if (!account || !validSignature(payload, account.credentials?.webhookSecret, signature)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    // Provider-specific parsers intentionally register here only after verified API docs are available.
    return NextResponse.json({ accepted: true, provider, message: "Webhook verified; no provider parser is enabled yet." }, { status: 202 });
  } catch { return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 }); }
}
