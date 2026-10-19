import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PieRolf } from "@/components/PieRolf";

export const metadata: Metadata = {
  title: "TRIBOO — Jugá. Compartí. Tribu.",
  description: "Tu tribu en un solo lugar: El Picado de la semana, Prode, Flash Grupal con IA, Trivia y Juegos.",
  icons: {
    icon: "/logos/triboo-logo.jpg",
    apple: "/logos/triboo-logo.jpg",
    shortcut: "/logos/triboo-logo.jpg",
  },
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
