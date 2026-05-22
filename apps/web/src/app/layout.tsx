import type { Metadata } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/client/providers/client-providers";
import { Header } from "@/client/components/layout/header";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Lattice - AI-Powered 3D Modeler",
  description:
    "Build 3D models with AI. Stop fighting with complex CAD tools. Lattice's AI assistant guides you and builds real STLs through conversation.",
  icons: [{ rel: "icon", url: "/favicon.png" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${instrumentSans.variable} font-sans antialiased`}>
        <ClientProviders>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster
            richColors
            position="top-center"
            closeButton
            toastOptions={{
              style: {
                padding: "16px",
                fontSize: "16px",
              },
              classNames: {
                toast: "w-full max-w-md",
                title: "text-lg font-semibold",
                description: "text-base",
                actionButton: "bg-primary text-primary-foreground hover:bg-primary/90",
              },
            }}
          />
        </ClientProviders>
      </body>
    </html>
  );
}
