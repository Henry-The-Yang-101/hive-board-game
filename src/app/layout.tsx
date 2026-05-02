import "@/styles/theme.css";
import { Montserrat } from "next/font/google";
import type { ReactNode } from "react";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={montserrat.className}>
      <body>{children}</body>
    </html>
  );
}
