import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ravqen",
  description:
    "A mobile-first guided training product for commercial gym members who want structured solo workouts.",
  applicationName: "Ravqen",
  appleWebApp: {
    capable: true,
    title: "Ravqen",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/ravqen-logo.svg",
    shortcut: "/ravqen-logo.svg",
    apple: "/ravqen-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col bg-[#041014]">{children}</body>
    </html>
  );
}
