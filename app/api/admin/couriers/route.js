import { NextResponse } from "next/server";
import { adminAuthErrorResponse, authorizeAdminSession } from "../../../../lib/adminAuth";
import { listCourierAccounts, saveCourierAccount } from "../../../../lib/couriers";

function errorResponse(error) {
  if (error?.status === 401 || error?.status === 403) {
    const auth = adminAuthErrorResponse(error); return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const status = [400, 404].includes(error?.status) ? error.status : 500;
  if (status === 500) console.error("Courier configuration failed", { message: error?.message, details: error?.details });
  return NextResponse.json({ error: status === 500 ? "Unable to manage courier configuration." : error.message }, { status });
}

export async function GET(request) {
  try { await authorizeAdminSession(request, "settings"); return NextResponse.json(await listCourierAccounts()); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request) {
  try { await authorizeAdminSession(request, "settings"); return NextResponse.json({ success: true, courier: await saveCourierAccount(await request.json()) }); }
  catch (error) { return errorResponse(error); }
}

export const PATCH = POST;
