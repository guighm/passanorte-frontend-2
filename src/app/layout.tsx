import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// ÚNICO PONTO DE DECISÃO da família tipográfica do painel (SPE-002, FR-001/
// FR-003): trocar de família/editar pesos/subsets acontece SOMENTE aqui —
// nunca em telas, componentes ou tokens de escala. Fallback declarado no
// @theme de globals.css (--font-sans/--font-mono → system-ui chains);
// adjustFontFallback segue no default (fallback métrico anti-CLS).
// Spe002: decisão ratificada em specs/002-typography-foundation (research D1).

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PassaNorte",
  description: "Painel administrativo PassaNorte",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
