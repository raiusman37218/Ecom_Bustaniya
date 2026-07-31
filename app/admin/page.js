import AdminDashboard from "../../components/AdminDashboard";

export const metadata = {
  title: "Lisette Admin",
  description: "Lisette store management dashboard"
};

export default async function AdminPage() {
  return <AdminDashboard />;
}
