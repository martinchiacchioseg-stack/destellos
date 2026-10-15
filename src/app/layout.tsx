import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Destellos ✨ | un clic familiar",
  description: "Una app para familias y amigos. Cada miembro sube una foto o video por día y la IA elige el destello del día.",
  applicationName: "Destellos",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Destellos",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FF7043",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${nunito.variable} h-full`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('destellos_theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-[#F3EDE2] dark:bg-[#0E0C10] flex justify-center items-center">
        {/* Contenedor mobile-first centrado para máxima calidad tanto en celulares como en desktop */}
        <div className="w-full max-w-md min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col relative shadow-2xl border-x border-[var(--border-soft)]">
          {children}
        </div>
      </body>
    </html>
  );
}
