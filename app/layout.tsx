import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liceo Social",
  description: "Social media content management and approval for Liceo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
