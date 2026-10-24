"use client";

import dynamic from "next/dynamic";
import AdminLoadingShell from "./AdminLoadingShell";

const AdminDashboard = dynamic(() => import("./AdminDashboard"), {
  ssr: false,
  loading: () => <AdminLoadingShell />,
});

export default function AdminClientWrapper() {
  return <AdminDashboard />;
}
