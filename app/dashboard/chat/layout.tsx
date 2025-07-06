import { ContentLayout } from "@/components/admin-panel/content-layout";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return 
  <ContentLayout title="Strategies">
    {children}
  </ContentLayout>;
}
