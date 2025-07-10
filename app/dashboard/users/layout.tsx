import { ContentLayout } from "@/components/admin-panel/content-layout";


export default function ChatLayout({
  children
}: {
  children: React.ReactNode;
}) {
    return (
        <ContentLayout title="Strategies">
            {children}
        </ContentLayout>
    );
}


