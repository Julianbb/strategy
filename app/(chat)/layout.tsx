import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminPanelLayout>{children}</AdminPanelLayout>;
}
