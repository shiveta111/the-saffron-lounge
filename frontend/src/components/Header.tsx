"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from 'next/image';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../lib/auth-context';
import { useLanguage } from '../lib/language';
import { apiClient } from '../lib/api-client';
import { useRealtime } from '../lib/realtime';
import { getImageUrl } from '../lib/image-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { User, LogOut, ShoppingBag, Settings } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();


  // Memoized helper to generate slug from product name
  const generateSlug = useCallback((name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }, []);

  const { subscribe, unsubscribe } = useRealtime();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMenuAccordionOpen, setIsMenuAccordionOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [_cartTotal, setCartTotal] = useState(0);
  const [menuData, setMenuData] = useState<any>(null);
  
  // Refs for debouncing
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Theme initialization
  useEffect(() => {
    try {
      const isAdmin = window.location.pathname.startsWith('/admin');
      if (isAdmin) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        return;
      }
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
      document.documentElement.classList.toggle('dark', isDark);
    } catch (e) {
      // Ignore errors
    }
  }, []);

  

  // Debounced scroll handler for header
  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolled(window.scrollY > 10);
      }, 10); // Small delay to batch scroll events
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Debounced resize handler
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        if (window.innerWidth >= 768) {
          setIsMobileMenuOpen(false);
        }
      }, 150); // Debounce resize events
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Lazy load menu data only when search is opened
  useEffect(() => {
    if (isSearchOpen && !menuData) {
      import('../data/menu.json').then((module) => {
        setMenuData(module.default);
      });
    }
  }, [isSearchOpen, menuData]);

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // Memoized search functionality with debouncing
  const searchResultsMemo = useMemo(() => {
    if (searchQuery.trim() === '' || !menuData) {
      return [];
    }

    const query = searchQuery.toLowerCase();
    const results: any[] = [];

    menuData.categories.forEach((category: any, catIndex: number) => {
      category.items.forEach((item: any, itemIndex: number) => {
        if (
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          category.name.toLowerCase().includes(query) ||
          item.dietaryNotes.some((note: string) => note.toLowerCase().includes(query))
        ) {
          results.push({
            ...item,
            category: category.name,
            categoryType: category.type,
            id: catIndex * 100 + itemIndex + 1
          });
        }
      });
    });

    return results.slice(0, 8); // Limit to 8 results
  }, [searchQuery, menuData]);

  // Update search results with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchResults(searchResultsMemo);
    }, 150); // Debounce search input

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchResultsMemo]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isSearchOpen && target && !target.closest('.search-container')) {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);

  // Cart fetch debounce ref
  const cartFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized cart count fetcher with caching
  const fetchCartCount = useCallback(async (skipCache = false) => {
    if (!isAuthenticated) {
      setCartCount(0);
      setCartTotal(0);
      // Clear cache when logged out
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('cartCount');
        sessionStorage.removeItem('cartTotal');
      }
      return;
    }

    // Check cache first (unless skipCache is true)
    if (!skipCache && typeof window !== 'undefined') {
      const cachedCount = sessionStorage.getItem('cartCount');
      const cachedTotal = sessionStorage.getItem('cartTotal');
      if (cachedCount !== null && cachedTotal !== null) {
        setCartCount(parseInt(cachedCount, 10));
        setCartTotal(parseFloat(cachedTotal));
        // Still fetch in background to update cache
      }
    }

    try {
      const response = await apiClient.getCart();
      const cart = response?.data?.cart || response?.cart || response?.data || response;
      const itemCount = typeof cart?.itemCount === 'number'
        ? cart.itemCount
        : Array.isArray(cart?.items)
          ? cart.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
          : 0;
      const total = typeof cart?.total === 'number' ? cart.total : 0;
      
      setCartCount(itemCount);
      setCartTotal(total);
      
      // Cache the result
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('cartCount', itemCount.toString());
        sessionStorage.setItem('cartTotal', total.toString());
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      // Don't show error to user, just keep current count
    }
  }, [isAuthenticated]);

  // Debounced cart fetch helper
  const debouncedFetchCart = useCallback(() => {
    if (cartFetchTimeoutRef.current) {
      clearTimeout(cartFetchTimeoutRef.current);
    }
    cartFetchTimeoutRef.current = setTimeout(() => {
      fetchCartCount(false);
    }, 300); // 300ms debounce
  }, [fetchCartCount]);

  // Update cart count on mount and when authentication changes
  useEffect(() => {
    // Load from cache immediately, then fetch fresh data
    fetchCartCount(false);
  }, [fetchCartCount]);

  // Combined effect for cart update listeners (custom events + WebSocket)
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true; // Track if component is still mounted

    // Handle custom cart update events (from shop page)
    const handleCartUpdate = (event: Event) => {
      if (isMounted) {
        const customEvent = event as CustomEvent<{ itemCount?: number; cartCount?: number; delta?: number; total?: number }>;
        const detail = customEvent.detail;

        // Apply optimistic badge update instantly, then sync from API.
        if (detail) {
          if (typeof detail.itemCount === 'number' || typeof detail.cartCount === 'number') {
            const nextCount = detail.itemCount ?? detail.cartCount ?? 0;
            setCartCount(Math.max(0, nextCount));
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('cartCount', Math.max(0, nextCount).toString());
            }
          } else if (typeof detail.delta === 'number') {
            setCartCount((prev) => {
              const next = Math.max(0, prev + detail.delta!);
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('cartCount', next.toString());
              }
              return next;
            });
          }

          if (typeof detail.total === 'number') {
            setCartTotal(detail.total);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('cartTotal', detail.total.toString());
            }
          }
        }

        debouncedFetchCart();
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);

    // Lazy WebSocket subscription - only subscribe when needed
    let cartUpdatedSub: string | null = null;
    let cartClearedSub: string | null = null;

    // Subscribe to WebSocket events with a small delay to avoid blocking
    const subscribeTimeout = setTimeout(() => {
      if (!isMounted) return;
      try {
        cartUpdatedSub = subscribe('CART_UPDATED', (event) => {
          if (isMounted) {
            console.log('Cart updated via WebSocket:', event);
            debouncedFetchCart();
          }
        });

        cartClearedSub = subscribe('CART_CLEARED', (event) => {
          if (isMounted) {
            console.log('Cart cleared via WebSocket:', event);
            setCartCount(0);
            setCartTotal(0);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('cartCount', '0');
              sessionStorage.setItem('cartTotal', '0');
            }
          }
        });
      } catch (error) {
        if (isMounted) {
          console.warn('WebSocket subscription failed, using fallback:', error);
        }
      }
    }, 100); // Small delay to avoid blocking initial render

    return () => {
      isMounted = false;
      window.removeEventListener('cartUpdated', handleCartUpdate);
      clearTimeout(subscribeTimeout);
      if (cartUpdatedSub) unsubscribe(cartUpdatedSub);
      if (cartClearedSub) unsubscribe(cartClearedSub);
      if (cartFetchTimeoutRef.current) {
        clearTimeout(cartFetchTimeoutRef.current);
      }
    };
  }, [isAuthenticated, subscribe, unsubscribe, debouncedFetchCart]);

  return (
    <header
      className={`w-full bg-[#111115] text-white shadow-none fixed top-0 left-0 right-0 z-1200 border-b border-[#23232a] transition-all duration-300 ${isScrolled ? 'py-1' : 'py-1'
        }`}
    >
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between px-4 md:px-8 relative">
        {/* Logo */}
        <Link href="/" className="flex items-center select-none min-w-60">
          <Image
            src="/assets-main/logo/saffron-logo.png"
            alt="The Saffron Lounge"
            width={80}
            height={80}
            className="h-24 w-24 object-cover "
            priority
            onError={(e) => {
              const target = e.currentTarget;
              target.src = '/assets/img/logo-white.webp';
            }}
          />
          <span className="text-white font-bold text-sm md:hidden ml-2" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
            {t('Indian Restaurant')} <br />& {t('Cocktails')}
          </span>
          <span className="text-white font-bold text-md hidden md:block ml-2" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
            {t('Indian Restaurant')} <br />& {t('Cocktails')}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className={`hidden lg:flex gap-8 lg:gap-10 md:gap-4 items-center font-lato capitalize`} style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
          <Link
            href="/"
            prefetch={true}
            className={`transition font-normal flex items-center text-[17px] leading-none min-w-[70px] h-8 tracking-wide ${pathname === '/' ? 'text-[#F0681D]' : 'text-white hover:text-[#F0681D]'}`}
            style={{ fontFamily: 'var(--font-lato), sans-serif', letterSpacing: '0.02em' }}
          >
            {t("home")}
          </Link>

          <Link
            href="/about"
            prefetch={true}
            className={`transition font-normal flex items-center text-[17px] leading-none min-w-[70px] h-8 tracking-wide ${pathname === '/about' ? 'text-[#F0681D]' : 'text-white hover:text-[#F0681D]'}`}
            style={{ fontFamily: 'var(--font-lato), sans-serif', letterSpacing: '0.02em' }}
          >
            {t("about")}
          </Link>

          {/* Menu dropdown */}
          <div className="relative group flex items-center min-w-[70px] h-8">
            <button
              className={`transition font-normal flex items-center gap-1 text-[17px] leading-none focus:outline-none tracking-wide ${pathname.startsWith('/menu') ? 'text-[#F0681D]' : 'text-white hover:text-[#F0681D]'}`}
              style={{ fontFamily: 'var(--font-lato), sans-serif', letterSpacing: '0.02em' }}
            >
              {t("Menu")}
              <svg className="w-3 h-3 mt-0.5 transition-transform duration-200 group-hover:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute left-0 top-full pt-2 w-52 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-50">
              <div className="bg-[#18181c] rounded-lg shadow-xl border border-[#23232a] overflow-hidden">
                <Link
                  href="/menu/restaurant"
                  prefetch={true}
                  className={`flex items-center gap-3 px-5 py-3 text-[15px] border-b border-[#23232a] transition-colors duration-200 ${pathname === '/menu/restaurant' ? 'text-[#F0681D] bg-[#1f1f24]' : 'text-white hover:text-[#F0681D] hover:bg-[#1f1f24]'}`}
                  style={{ fontFamily: 'var(--font-lato), sans-serif' }}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {t("Restaurant Menu")}
                </Link>
                <Link
                  href="/menu/explore-menu"
                  prefetch={true}
                  className={`flex items-center gap-3 px-5 py-3 text-[15px] transition-colors duration-200 ${pathname === '/menu/explore-menu' ? 'text-[#F0681D] bg-[#1f1f24]' : 'text-white hover:text-[#F0681D] hover:bg-[#1f1f24]'}`}
                  style={{ fontFamily: 'var(--font-lato), sans-serif' }}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  {t("Explore Menu")}
                </Link>
              </div>
            </div>
          </div>

          <Link
            href="/shop"
            prefetch={true}
            className={`transition font-normal flex items-center text-[17px] leading-none min-w-[70px] h-8 tracking-wide ${pathname === '/shop' ? 'text-[#F0681D]' : 'text-white hover:text-[#F0681D]'}`}
            style={{ fontFamily: 'var(--font-lato), sans-serif', letterSpacing: '0.02em' }}
          >
            {t("Place Order")}          
          </Link>

          {/* Portfolio with submenu
          <div className="relative group flex items-center min-w-[70px] h-8">
            <button className="hover:text-[#F0681D] transition font-normal flex items-center text-[17px] leading-none focus:outline-none tracking-wide" style={{ fontFamily: 'var(--font-lato), sans-serif', letterSpacing: '0.02em' }}>
              Portfolio <span className="ml-1 text-md">&#x25BC;</span>
            </button>
            <div className="absolute left-0 top-full mt-3 w-48 bg-[#18181c] rounded shadow-lg opacity-0 group-hover:opacity-100 group-hover:visible invisible transition-all duration-200 z-50 border border-[#23232a]">
              <Link href="/portfolio" className="block px-6 py-3 text-white hover:text-[#F0681D] text-[16px] border-b border-[#23232a] last:border-b-0 transition" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>Portfolio Grid</Link>
              <Link href="/portfolio/1" className="block px-6 py-3 text-white hover:text-[#F0681D] text-[16px] transition" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>Portfolio Details</Link>
            </div>
          </div> */}

          {/* Blog with submenu */}
          {/* <div className="relative group flex items-center min-w-[70px] h-8">
            <button className="hover:text-[#F0681D] transition font-normal flex items-center text-[17px] leading-none focus:outline-none tracking-wide" style={{ fontFamily: 'var(--font-lato), sans-serif', letterSpacing: '0.02em' }}>
              Blog <span className="ml-1 text-md">&#x25BC;</span>
            </button>
            <div className="absolute left-0 top-full mt-3 w-48 bg-[#18181c] rounded shadow-lg opacity-0 group-hover:opacity-100 group-hover:visible invisible transition-all duration-200 z-50 border border-[#23232a]">
              <Link href="/blog" className="block px-6 py-3 text-white hover:text-[#F0681D] text-[16px] border-b border-[#23232a] last:border-b-0 transition" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>Blog Grid</Link>
              <Link href="/blog/1" className="block px-6 py-3 text-white hover:text-[#F0681D] text-[16px] transition" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>Blog Details</Link>
            </div>
          </div> */}

          <Link
            href="/reserve-table"
            prefetch={true}
            className={`transition font-normal flex items-center text-[17px] leading-none min-w-[70px] h-8 tracking-wide ${pathname === '/reserve-table' ? 'text-[#F0681D]' : 'text-white hover:text-[#F0681D]'}`}
            style={{ fontFamily: 'var(--font-lato), sans-serif', letterSpacing: '0.02em' }}
          >
            {t("reserve table")}
          </Link>

          <Link
            href="/contact"
            prefetch={true}
            className={`transition font-normal flex items-center text-[17px] leading-none min-w-[70px] h-8 tracking-wide ${pathname === '/contact' ? 'text-[#F0681D]' : 'text-white hover:text-[#F0681D]'}`}
            style={{ fontFamily: 'var(--font-lato), sans-serif', letterSpacing: '0.02em' }}
          >
            {t("contact")}
          </Link>
        </nav>

        {/* Right icons */}
        <div className="hidden lg:flex items-center gap-6 ml-6">
          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            className="w-10 h-10 rounded-full border border-[#444] flex items-center justify-center hover:border-[#F0681D] transition group relative"
            title={language === 'en' ? t('Switch to Spanish') : t('Switch to English')}
          >
            <span className="text-white font-medium text-sm uppercase">
              {language}
            </span>
            <span className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-[#18181c] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[#23232a]">
              {language === 'en' ? t('Spanish') : t('English')}
            </span>
          </button>
          
          {/* Search */}
          <div className="relative search-container">
            <button
              onClick={toggleSearch}
              className="w-10 h-10 rounded-full border border-[#444] flex items-center justify-center hover:border-[#F0681D] transition"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-3.5-3.5" /></svg>
            </button>

            {/* Search Modal */}
            {isSearchOpen && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-[#18181c] rounded-lg shadow-lg border border-[#23232a] z-50">
                <div className="p-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('Search menu items...')}
              
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 bg-[#111115] border border-[#23232a] text-white placeholder:text-sm placeholder-[#666] focus:outline-none focus:border-[#F0681D] transition-colors duration-300 rounded-md pr-10"
                    />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#666]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" /><path d="M21 21l-3.5-3.5" />
                    </svg>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="mt-4 max-h-80 overflow-y-auto">
                      <div className="space-y-2">
                        {searchResults.map((item, index) => (
                          <Link
                            key={index}
                            href={`/shop/${generateSlug(item.name)}`}
                            prefetch={true}
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                            className="block p-3 bg-[#111115] rounded-md hover:bg-[#23232a] transition-colors duration-300 border border-[#23232a] hover:border-[#F0681D]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0">
                                <Image
                                  src={getImageUrl(item.image) || '/assets-main/menu/coming-soon.png'}
                                  alt={item.name}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.src = '/assets-main/menu/coming-soon.png';
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-medium text-md truncate">{item.name}</h4>
                                <p className="text-[#bdbdbd] text-xs truncate">{item.category.replace('-', ' ')} {item.categoryType !== 'All' ? `(${item.categoryType})` : ''}</p>
                                <p className="text-[#F0681D] text-md font-medium">{item.price}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchQuery && searchResults.length === 0 && (
                    <div className="mt-4 text-center text-[#666] py-8">
                      {t('No results found for')} "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* User/Login */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#444] hover:border-[#F0681D] transition text-white">
                  <span className="text-sm font-medium">{t('Hi,')} {user.name || user.email?.split('@')[0] || t('User')}</span>
                  <User className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-56 bg-[#18181c] border-[#23232a] text-white z-1300 shadow-xl"
              >
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" prefetch={true} className="flex items-center gap-2 cursor-pointer">
                    <Settings className="w-4 h-4" />
                    {t('My Profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/orders" prefetch={true} className="flex items-center gap-2 cursor-pointer">
                    <ShoppingBag className="w-4 h-4" />
                    {t('My Orders')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#23232a]" />
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await logout();
                      router.push('/');
                    } catch (error) {
                      console.error('Logout failed:', error);
                    }
                  }}
                  className="flex items-center gap-2 cursor-pointer text-red-400 hover:text-red-300"
                >
                  <LogOut className="w-4 h-4" />
                  {t('Logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/auth/login"
              prefetch={true}
              className="w-10 h-10 rounded-full border border-[#444] flex items-center justify-center hover:border-[#F0681D] transition"
              title={t('Login')}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 8-4 8-4s8 0 8 4" /></svg>
            </Link>
          )}
          {/* Cart - Only show for authenticated users */}
          {isAuthenticated && (
            <Link href="/cart" prefetch={true} className="relative w-10 h-10 rounded-full border border-[#444] flex items-center justify-center hover:border-[#F0681D] transition">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
        </div>

        {/* Mobile nav toggle */}
        <div className="lg:hidden flex items-center absolute right-4 top-1/2 -translate-y-1/2 z-1210">
          <button
            onClick={toggleMobileMenu}
            className="w-10 h-10 flex flex-col items-center justify-center focus:outline-none"
          >
            <span className={`block w-7 h-0.5 bg-[#F0681D] mb-1.5 rounded transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`block w-7 h-0.5 bg-[#F0681D] mb-1.5 rounded transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
            <span className={`block w-7 h-0.5 bg-[#F0681D] rounded transition-transform duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`fixed inset-0 bg-[#111115] z-1205 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
        >
          <div className="flex flex-col h-full pt-20 pb-10 z-1210">
            <nav className={`flex-1 overflow-y-auto px-8 font-lato`} style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}>
              <div className="space-y-6">
                <Link href="/" prefetch={true} className="text-[#F0681D] font-bold text-2xl block py-3 border-b border-[#23232a]" onClick={toggleMobileMenu}>
                  {t("home")}
                </Link>

                <Link href="/about" prefetch={true} className="text-white font-bold text-2xl block py-3 border-b border-[#23232a] hover:text-[#F0681D]" onClick={toggleMobileMenu}>
                  {t("about")}
                </Link>

                {/* Mobile Menu accordion */}
                <div className="border-b border-[#23232a]">
                  <button
                    onClick={() => setIsMenuAccordionOpen(prev => !prev)}
                    className={`w-full flex items-center justify-between py-3 font-bold text-2xl ${pathname.startsWith('/menu') ? 'text-[#F0681D]' : 'text-white hover:text-[#F0681D]'}`}
                  >
                    {t("Menu")}
                    <svg className={`w-5 h-5 transition-transform duration-200 ${isMenuAccordionOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isMenuAccordionOpen && (
                    <div className="pl-4 pb-3 space-y-3">
                      <Link href="/menu/restaurant" prefetch={true} className={`flex items-center gap-2 text-lg py-1 ${pathname === '/menu/restaurant' ? 'text-[#F0681D]' : 'text-[#bdbdbd] hover:text-[#F0681D]'}`} onClick={() => { setIsMenuAccordionOpen(false); toggleMobileMenu(); }}>
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        {t("Restaurant Menu")}
                      </Link>
                      <Link href="/menu/explore-menu" prefetch={true} className={`flex items-center gap-2 text-lg py-1 ${pathname === '/menu/explore-menu' ? 'text-[#F0681D]' : 'text-[#bdbdbd] hover:text-[#F0681D]'}`} onClick={() => { setIsMenuAccordionOpen(false); toggleMobileMenu(); }}>
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
                        {t("Explore Menu")}
                      </Link>
                    </div>
                  )}
                </div>

                <Link href="/shop" prefetch={true} className="text-white font-bold text-2xl block py-3 border-b border-[#23232a] hover:text-[#F0681D]" onClick={toggleMobileMenu}>
                  {t("Place Order")}
                </Link>

                {/* <div>
                  <button className="text-white font-bold text-2xl flex items-center w-full py-3 border-b border-[#23232a] hover:text-[#f36b24]">
                    Portfolio <span className="ml-2 text-lg">&#x25BC;</span>
                  </button>
                  <div className="pl-4 mt-4 space-y-4">
                    <Link href="/portfolio" className="block text-white text-lg py-2 hover:text-[#F0681D]" onClick={toggleMobileMenu}>Portfolio Grid</Link>
                    <Link href="/portfolio/1" className="block text-white text-lg py-2 hover:text-[#F0681D]" onClick={toggleMobileMenu}>Portfolio Details</Link>
                  </div>
                </div>

                <div>
                  <button className="text-white font-bold text-2xl flex items-center w-full py-3 border-b border-[#23232a] hover:text-[#F0681D]">
                    Blog <span className="ml-2 text-lg">&#x25BC;</span>
                  </button>
                  <div className="pl-4 mt-4 space-y-4">
                    <Link href="/blog" className="block text-white text-lg py-2 hover:text-[#F0681D]" onClick={toggleMobileMenu}>Blog Grid</Link>
                    <Link href="/blog/1" className="block text-white text-lg py-2 hover:text-[#F0681D]" onClick={toggleMobileMenu}>Blog Details</Link>
                  </div>
                </div> */}

                <Link href="/reserve-table" prefetch={true} className="text-white font-bold text-2xl block py-3 border-b border-[#23232a] hover:text-[#F0681D]" onClick={toggleMobileMenu}>
                  {t("reserve table")}
                </Link>

                <Link href="/contact" prefetch={true} className="text-white font-bold text-2xl block py-3 border-b border-[#23232a] hover:text-[#F0681D]" onClick={toggleMobileMenu}>
                  {t("contact")}
                </Link>
              </div>
            </nav>

            <div className="px-8 mt-8">
              <div className="flex gap-4 justify-center">
                {/* Language Switcher Mobile */}
                <button
                  onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                  className="w-12 h-12 rounded-full border border-[#444] flex items-center justify-center hover:border-[#F0681D] transition"
                  title={language === 'en' ? t('Switch to Spanish') : t('Switch to English')}
                >
                  <span className="text-white font-medium text-sm uppercase">
                    {language}
                  </span>
                </button>
                
                <Link href="/auth/login" prefetch={true} className="w-12 h-12 rounded-full border border-[#444] flex items-center justify-center hover:border-[#F0681D] transition">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 8-4 8-4s8 0 8 4" /></svg>
                </Link>
                {isAuthenticated && (
                  <Link href="/cart" prefetch={true} className="relative w-12 h-12 rounded-full border border-[#444] flex items-center justify-center hover:border-[#F0681D] transition">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Modal */}
        {isSearchOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-1220 md:hidden">
            <div className="absolute top-20 left-4 right-4 bg-[#18181c] rounded-lg shadow-lg border border-[#23232a]">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-lg">{t('Search Menu')}</h3>
                  <button
                    onClick={toggleSearch}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#666] hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder={t('Search menu items...')}

                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 bg-[#111115] border border-[#23232a] text-white placeholder:text-sm placeholder-[#666] focus:outline-none focus:border-[#F0681D] transition-colors duration-300 rounded-md pr-10"
                    autoFocus
                  />
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#666]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-3.5-3.5" />
                  </svg>
                </div>

                {searchResults.length > 0 && (
                  <div className="max-h-96 overflow-y-auto">
                    <div className="space-y-3">
                      {searchResults.map((item, index) => (
                        <Link
                          key={index}
                          href={`/shop/${generateSlug(item.name)}`}
                          prefetch={true}
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="block p-3 bg-[#111115] rounded-md hover:bg-[#23232a] transition-colors duration-300 border border-[#23232a] hover:border-[#F0681D]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0">
                              <Image
                                src={getImageUrl(item.image) || '/assets-main/menu/coming-soon.png'}
                                alt={item.name}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.src = '/assets-main/menu/coming-soon.png';
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium text-base truncate">{item.name}</h4>
                              <p className="text-[#bdbdbd] text-md truncate">{item.category.replace('-', ' ')} {item.categoryType !== 'All' ? `(${item.categoryType})` : ''}</p>
                              <p className="text-[#F0681D] text-base font-medium">{item.price}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && (
                  <div className="text-center text-[#666] py-8">
                    {t('No results found for')} "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
