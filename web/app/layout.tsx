import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ComplaintIQ — AI Complaint Intelligence Engine",
  description:
    "AI-powered complaint classification, priority assignment, fake detection, and resolution recommendations for wellness businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex" style={{ background: "#ffffff", color: "#111827" }}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
