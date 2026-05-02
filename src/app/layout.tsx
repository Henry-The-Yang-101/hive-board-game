import "@/styles/theme.css";
import { Montserrat } from "next/font/google";
import type { Viewport } from "next";
import type { ReactNode } from "react";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={montserrat.className}>
      <body>{children}</body>
    </html>
  );
}
