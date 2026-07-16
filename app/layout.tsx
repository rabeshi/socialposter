import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Poster",
  description: "Generate, review, schedule, and publish social media content.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
