import { Quicksand } from "next/font/google";

export const etarMenuFont = Quicksand({
  weight: ["700"],
  subsets: ["latin"],
  variable: "--font-etar-menu-quicksand",
  display: "swap",
  preload: false, // Load on demand
});
