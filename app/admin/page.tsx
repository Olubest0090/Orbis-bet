import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  if (!(await requireAdmin())) redirect("/");
  return <AdminDashboard />;
}
