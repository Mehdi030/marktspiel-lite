import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marktspiel Lite — Wirtschaftssimulation",
  description: "Einfache Wirtschaftssimulation: Produktion, Handel, Markt.",
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
  openGraph: {
    title: 'MarketFlow',
    description: 'Baue eine Firma. Beherrsche den Markt.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
