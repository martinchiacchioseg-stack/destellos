import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PieRolf } from "@/components/PieRolf";

export const metadata: Metadata = {
  title: "Destellos — Un clic familiar",
  description: "Una foto por día, un juego y mucho cariño. Destellos, by Rolφ.",
  icons: { icon: "/logos/rolf.jpg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#070b16", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="flex min-h-dvh flex-col">
        <div className="flex-1">{children}</div>
        <PieRolf />
      </body>
    </html>
  );
}
