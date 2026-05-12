"use client";

import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import Header from "./Header";
import Footer from "./Footer";
import { PromotionsMarquee } from "./customer/PromotionsMarquee";
import { isMobileScreen } from "../lib/mobileDetection";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading } = useAuth();
  const isMobile = isMobileScreen();
  const isShopPage = pathname === '/shop';

  // Hide header and footer for admin, dashboard, and seller routes
  const isAdminRoute = pathname.startsWith('/admin');
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isSellerRoute = pathname.startsWith('/seller');
  const hideHeaderFooter = isAdminRoute || isDashboardRoute || isSellerRoute;

  // Render page content immediately - auth check is non-blocking
  // Auth-dependent features will handle their own loading states
  return (
    <div id="__root_layout">
      {!hideHeaderFooter && (
        <>
          <PromotionsMarquee />
          <div id="__main_header">
            <Header />
          </div>
        </>
      )}
      {/* Render children immediately - don't wait for auth */}
      {children}
      {!hideHeaderFooter && (
        <div id="__main_footer">
          <Footer />
        </div>
      )}
    </div>
  );
}
