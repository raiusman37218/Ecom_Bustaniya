import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import {
  getPostexSettlementSnapshot,
  savePostexCprBatch,
  syncPostexPayments,
  voidPostexCprBatch,
} from "../../../../lib/postexSettlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error, fallback) {
  if (error?.status === 401 || error?.status === 403) {
    const auth = adminAuthErrorResponse(error);
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const status = [400, 404, 422, 503].includes(error?.status) ? error.status : 500;
  if (status === 500) console.error(fallback, { message: error?.message, details: error?.details });
  return NextResponse.json(
    { error: status === 500 ? fallback : error.message },
    { status }
  );
}

export async function GET(request) {
  try {
    const { user } = await authorizeAdminSession(request, "finance");
    return NextResponse.json(await getPostexSettlementSnapshot());
  } catch (error) {
    return errorResponse(error, "Unable to load PostEx settlements.");
  }
}

export async function POST(request) {
  try {
    await authorizeAdminSession(request, "finance");
    const body = await request.json().catch(() => ({}));
    if (body.action === "sync") {
      return NextResponse.json({ success: true, ...(await syncPostexPayments()) });
    }
    if (body.action === "save_batch") {
      return NextResponse.json({
        success: true,
        snapshot: await savePostexCprBatch(body),
      });
    }
    if (body.action === "void_batch") {
      return NextResponse.json({
        success: true,
        snapshot: await voidPostexCprBatch(body, user),
      });
    }
    return NextResponse.json({ error: "Unsupported settlement action." }, { status: 400 });
  } catch (error) {
    return errorResponse(error, "Unable to save PostEx settlement.");
  }
}
