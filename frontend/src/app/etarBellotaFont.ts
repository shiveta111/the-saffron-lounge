import { Bellota } from "next/font/google";

export const etarBellotaFont = Bellota({
  weight: ["700"],
  subsets: ["latin"],
  variable: "--font-etar-bellota",
  display: "swap",
  preload: false, // Load on demand
});
