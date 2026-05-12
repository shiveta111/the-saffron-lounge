import type { Metadata } from "next";
import { El_Messiri, Lato } from "next/font/google";
import { etarBellotaFont } from "./etarBellotaFont";
import { etarFont } from "./etarFont";
import { etarMenuFont } from "./etarMenuFont";
import "./globals.css";
import ClientLayout from "../components/ClientLayout";
import { Providers } from "../components/providers";
import { Toaster } from "../components/ui/sonner";

// ✅ Essential fonts - loaded immediately with font-display swap
const elMessiri = El_Messiri({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-el-messiri",
  display: "swap",
  preload: true,
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
  preload: true,
});

// ✅ Non-critical fonts - loaded asynchronously with reduced weights
const rubik = {
  variable: "--font-rubik",
  className: "",
};

const oxygen = {
  variable: "--font-oxygen",
  className: "",
};

const playfair = {
  variable: "--font-playfair",
  className: "",
};

const bellota = {
  variable: "--font-bellota",
  className: "",
};

const exo = {
  variable: "--font-exo",
  className: "",
};

// ✅ Metadata
export const metadata: Metadata = {
  title: {
    default: "The Saffron Lounge | Authentic Indian Cuisine",
    template: "%s | The Saffron Lounge",
  },
  description:
    "Experience the finest Indian cuisine at The Saffron Lounge. Explore our menu, order online, and discover our story.",
  keywords: [
    "Indian restaurant",
    "Saffron Lounge",
    "authentic cuisine",
    "order online",
    "best Indian food",
    "restaurant near me",
  ],
  openGraph: {
    title: "The Saffron Lounge | Authentic Indian Cuisine",
    description:
      "Experience the finest Indian cuisine at The Saffron Lounge. Explore our menu, order online, and discover our story.",
    url: "https://thesaffronlounge.com/",
    siteName: "The Saffron Lounge",
    type: "website",
    images: [
      {
        url: "/assets/img/logo-white.webp",
        width: 1200,
        height: 630,
        alt: "The Saffron Lounge Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Saffron Lounge | Authentic Indian Cuisine",
    description:
      "Experience the finest Indian cuisine at The Saffron Lounge. Explore our menu, order online, and discover our story.",
    images: ["/assets/img/logo-white.webp"],
  },
  metadataBase: new URL("https://thesaffronlounge.com/"),
};

// ✅ Layout
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets-main/logo/saffron-logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/assets-main/logo/saffron-logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets-main/logo/saffron-logo.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        suppressHydrationWarning={true}
        className={`${elMessiri.variable} ${lato.variable} ${etarBellotaFont.variable} ${etarFont.variable} ${etarMenuFont.variable} antialiased`}
        style={{ fontFamily: "var(--font-lato), var(--font-el-messiri), sans-serif" }}
      >
        <Providers>
          <ClientLayout>{children}</ClientLayout>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
