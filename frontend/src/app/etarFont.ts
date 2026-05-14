import { Pacifico } from "next/font/google";

export const etarFont = Pacifico({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-etar-pacifico",
  display: "swap",
  preload: false, // Load on demand
});
