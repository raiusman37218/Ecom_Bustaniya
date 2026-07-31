import AdminDashboard from "../../components/AdminDashboard";

export const metadata = {
  title: "Bustaniya Admin",
  description: "Bustaniya store management dashboard"
};

export default async function AdminPage() {
  return <AdminDashboard />;
}
