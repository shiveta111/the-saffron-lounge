"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

export default function ConditionalThemeToggle() {
	const pathname = usePathname();
	if (pathname?.startsWith("/admin")) return null;
	return <ThemeToggle />;
} 
