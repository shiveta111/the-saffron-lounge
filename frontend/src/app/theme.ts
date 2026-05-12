// Centralized theme configuration - Updated to remove golden colors
// Cocoa Brown #241c1b for body background
// Flamingo #f36b24 for all links hover/active states and buttons backgrounds
export const theme = {
  colors: {
    primary: '#F0681D', // Updated accent color - for buttons, links hover/active and secondary accent
    primaryDark: '#e55a1a', // Slightly darker for hover states
    background: {
      dark: '#241c1b', // Cocoa Brown - body background
      darkSecondary: '#18181c',
      darkTertiary: '#23232a',
    },
    text: {
      light: '#ffffff',
      dark: '#171717',
      gray: '#bdbdbd',
    },
    border: '#444444',
  },
  fonts: {
    bellota: 'var(--font-lato), sans-serif',
    pacifico: 'var(--font-etar-pacifico), cursive',
    quicksand: 'var(--font-etar-menu-quicksand), sans-serif',
  },
  spacing: {
    sectionPadding: 'w-full py-16 md:py-24',
    containerPadding: 'px-4 sm:px-6',
  },
};
