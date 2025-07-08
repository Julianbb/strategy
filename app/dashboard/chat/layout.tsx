import { Navbar } from "@/components/admin-panel/navbar";

export default function ChatLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
    <Navbar title={"Strategies"} />
    <div className="md:container md:p-8">{children}</div>
  </div>
  )
}
