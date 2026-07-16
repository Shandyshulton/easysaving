import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/query-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const siteName = "EasySaving";
const siteDescription =
  "EasySaving membantu mencatat pemasukan, pengeluaran, rekening, kategori, dan laporan keuangan pribadi dalam satu dashboard yang rapi.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: "EasySaving | Dashboard Keuangan Pribadi",
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  keywords: [
    "EasySaving",
    "aplikasi keuangan",
    "catatan keuangan",
    "manajemen keuangan pribadi",
    "budgeting",
    "pengeluaran",
    "pemasukan",
    "laporan keuangan"
  ],
  authors: [{ name: "EasySaving" }],
  creator: "EasySaving",
  publisher: "EasySaving",
  category: "finance",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName,
    title: "EasySaving | Dashboard Keuangan Pribadi",
    description: siteDescription,
    images: [
      {
        url: "/tab-easysaving.png",
        alt: "Logo EasySaving"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "EasySaving | Dashboard Keuangan Pribadi",
    description: siteDescription,
    images: ["/tab-easysaving.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/x-icon"
      },
      {
        url: "/tab-easysaving.png",
        type: "image/png"
      }
    ],
    shortcut: "/tab-easysaving.png",
    apple: "/tab-easysaving.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning className={inter.variable}>
      <body suppressHydrationWarning>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
