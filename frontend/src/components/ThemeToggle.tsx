"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		const stored = localStorage.getItem("theme");
		const initial = stored ? stored === "dark" : window.matchMedia('(prefers-color-scheme: dark)').matches;
		setIsDark(initial);
	}, []);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", isDark);
		localStorage.setItem("theme", isDark ? "dark" : "light");
	}, [isDark]);

	return (
		<button
			onClick={() => setIsDark(d => !d)}
			className="fixed bottom-4 right-4 z-[100] rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-md h-10 px-4 bg-white/80 dark:bg-black/40 backdrop-blur"
			title={isDark ? "Switch to light mode" : "Switch to dark mode"}
		>
			{isDark ? "Light" : "Dark"} mode
		</button>
	);
} 
