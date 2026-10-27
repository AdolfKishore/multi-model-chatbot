
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi-Model AI Chatbot",
  description: "Compare AI models and manage users.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
