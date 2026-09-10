import type { Metadata } from "next";

import { Providers } from "@/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PetroTrade OS Admin Portal",
    template: "%s | PetroTrade OS",
  },
  description: "Industrial Procurement Operating System — Admin control center",
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
