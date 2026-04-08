import type { Metadata } from "next";
import ConditionalHeader from "@/components/ConditionalHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "우르르 (urr)",
  description: "단체 예약을 간편하게 진행하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <ConditionalHeader />
        {children}
      </body>
    </html>
  );
}
