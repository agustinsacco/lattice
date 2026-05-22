import { createClient } from "@/server/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden print:h-auto print:overflow-visible">{children}</div>;
}
