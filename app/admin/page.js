import AdminDashboard from "../../components/AdminDashboard";
import AdminLogin from "../../components/AdminLogin";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminSessionValue } from "../../lib/adminAuth";

export const metadata = {
  title: "Bustaniya Admin",
  description: "Bustaniya store management dashboard"
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthenticated = verifyAdminSessionValue(
    cookieStore.get(ADMIN_COOKIE_NAME)?.value
  );

  if (!isAuthenticated) return <AdminLogin />;

  return <AdminDashboard />;
}
