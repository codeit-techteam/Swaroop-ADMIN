import type { Metadata } from "next";

import { Providers } from "@/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PolyStoreX OS Admin Portal",
    template: "%s | PolyStoreX OS",
  },
  description: "Industrial Procurement Operating System — Admin control center",
  icons: {
    icon: [{ url: "/favicon.png" }, { url: "/icon.png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
