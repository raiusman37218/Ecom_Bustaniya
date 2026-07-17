import { NextResponse } from "next/server";
import { authorizeAdminSession } from "../../../../lib/adminAuth";
import {
  ADMIN_PERMISSIONS,
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "../../../../lib/adminUsers";

function jsonError(error, fallback = "Unable to update admin users.") {
  const status = error?.status || 500;
  const message = error?.message || fallback;
  return NextResponse.json(
    { error: message },
    { status }
  );
}

export async function GET(request) {
  try {
    const { user } = await authorizeAdminSession(request, "users");
    return NextResponse.json({
      currentUser: user,
      permissions: ADMIN_PERMISSIONS,
      users: await listAdminUsers(),
    });
  } catch (error) {
    return jsonError(error, "Unable to load admin users.");
  }
}

export async function POST(request) {
  try {
    await authorizeAdminSession(request, "users");
    const body = await request.json().catch(() => ({}));
    const user = await createAdminUser(body);
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request) {
  try {
    await authorizeAdminSession(request, "users");
    const body = await request.json().catch(() => ({}));
    const user = await updateAdminUser(body.userId, body);
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request) {
  try {
    await authorizeAdminSession(request, "users");
    const body = await request.json().catch(() => ({}));
    const result = await deleteAdminUser(body.userId);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
