import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "元都AI · 运营中台",
  description: "元都AI视觉资产生产平台运营后台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
