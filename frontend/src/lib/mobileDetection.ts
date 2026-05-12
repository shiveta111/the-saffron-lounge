export const isMobileDevice = (): boolean => {
  // Check if we're in browser environment
  if (typeof window === 'undefined') return false;

  // Check user agent for mobile devices
  const userAgent = window.navigator.userAgent;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(userAgent);

  // Check screen width (mobile/tablet breakpoint)
  const isSmallScreen = window.innerWidth < 1024; // Increased from 768 to 1024 for better tablet support

  // Check touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Return true if user agent indicates mobile OR (small screen AND touch capability)
  return isMobileUA || (isSmallScreen && hasTouch);
};

export const isMobileScreen = (): boolean => {
  return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
};
