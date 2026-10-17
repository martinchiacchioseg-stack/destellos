import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PieRolf } from "@/components/PieRolf";

export const metadata: Metadata = {
  title: "SINCERICIDIO — El Club de los Tarambanas",
  description: "Juego social privado: Flash Grupal con IA, Ronda de Tarareos, Trivia 3D y Trazo Loco.",
  icons: {
    icon: "/logos/sincericidio-logo.jpg",
    apple: "/logos/sincericidio-logo.jpg",
    shortcut: "/logos/sincericidio-logo.jpg",
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
