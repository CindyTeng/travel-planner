import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "旅伴 Tripmate｜下一站，照你的方式玩",
  description: "輸入目的地、旅行天數、預算與喜好，快速規劃每日行程。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
