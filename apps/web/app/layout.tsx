import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/lib/query/providers";

export const metadata: Metadata = {
  title: "Reclaim",
  description: "AI-powered time management"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
