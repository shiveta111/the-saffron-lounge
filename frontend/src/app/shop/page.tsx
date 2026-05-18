"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import AllergenNote from '../../components/AllergenNote';
import { Clock, Eye } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { getMenuItemAllergens } from '../../lib/allergenUtils';
import Breadcrumb from '../../components/Common/Breadcrumb';
import { isMobileScreen } from '../../lib/mobileDetection';
import { useAuth } from '../../lib/auth-context';
import { ProductDetailsModal } from '../../components/ProductDetailsModal';
import { LoginRequiredModal } from '../../components/LoginRequiredModal';
import { getImageUrl } from '../../lib/image-utils';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { useLanguage } from '../../lib/language';

interface ShopItem {
  id: number;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string;
  category: string;
  rating: string;
  tags: string[];
  description: string;
  availability?: number;
  allergenCodes?: number[];
  preparationTime?: number;
  variants?: any[];
}

const ALL_CATEGORY = 'All Items';

const ShopPage = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [sortBy, setSortBy] = useState('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistItem, setWishlistItem] = useState<ShopItem | null>(null);
  const [addedToCart, setAddedToCart] = useState<Set<number>>(new Set());
  const [isAddingToCart, setIsAddingToCart] = useState<number | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Load added items from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('addedToCart');
    if (saved) {
      setAddedToCart(new Set(JSON.parse(saved)));
    }
  }, []);

  // Save added items to localStorage
  const saveAddedToCart = (newSet: Set<number>) => {
    setAddedToCart(newSet);
    localStorage.setItem('addedToCart', JSON.stringify([...newSet]));
  };

  // Add to cart function using API
  const addToCart = async (item: ShopItem) => {
    // Check authentication
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    // Check availability
    if (!item.availability || item.availability <= 0) {
      toast.error(t('This item is out of stock'));
      return;
    }

    try {
      setIsAddingToCart(item.id);

      // Find the original product data to check if it's a menu item
      const originalItem = products.find((p: any) => p.id === item.id);
      // Check if it's a menu item using the marker or by checking for menuProducts
      const isMenuItem = originalItem && (
        originalItem._isMenuItem === true ||
        (originalItem.menuProducts && Array.isArray(originalItem.menuProducts) && originalItem.menuProducts.length > 0) ||
        (originalItem.products && Array.isArray(originalItem.products) && originalItem.products.length > 0)
      );

      let addSuccess = false;
      let lastError = null;

      // Try the most likely endpoint first, then fallback to the other
      if (isMenuItem) {
        try {
          await apiClient.addMenuToCart({
            menuId: item.id,
            quantity: 1,
          });
          addSuccess = true;
        } catch (err: any) {
          lastError = err;
          // If menu item not found, try as product
          if (err.response?.data?.error?.includes('not found')) {
            try {
              await apiClient.addToCart({
                productId: item.id,
                quantity: 1,
              });
              addSuccess = true;
            } catch (productErr) {
              lastError = productErr;
            }
          }
        }
      } else {
        try {
          await apiClient.addToCart({
            productId: item.id,
            quantity: 1,
          });
          addSuccess = true;
        } catch (err: any) {
          lastError = err;
          // If product not found, try as menu item
          if (err.response?.data?.error?.includes('not found')) {
            try {
              await apiClient.addMenuToCart({
                menuId: item.id,
                quantity: 1,
              });
              addSuccess = true;
            } catch (menuErr) {
              lastError = menuErr;
            }
          }
        }
      }

      if (!addSuccess) {
        throw lastError;
      }

      // Update local state
      saveAddedToCart(new Set([...addedToCart, item.id]));

      // Show success message
      toast.success(t('Added to cart successfully'));

      // Trigger cart update event for header
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (error: any) {
      console.error('Failed to add item to cart:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        itemId: item.id,
      });

      // Handle specific errors
      if (error.response?.data?.requiresAuth || error.response?.status === 401) {
        toast.error(t('Please login to add items to cart'));
        setTimeout(() => router.push('/auth/login'), 1500);
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error(t('Failed to add to cart. Please try again.'));
      }
    } finally {
      setIsAddingToCart(null);
    }
  };

  // Pull to refresh function
  const handleRefresh = async () => {
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  // State for products from API
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch products from API (product records only)
  // Optimized with caching and non-blocking loading
  useEffect(() => {
    const CACHE_KEY = 'shop_products_cache_products_only_v2';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    let isMounted = true; // Track if component is still mounted
    let abortController: AbortController | null = null;

    async function fetchProducts() {

      
      // Create abort controller for this fetch
      abortController = new AbortController();
      // Try to load from cache first for instant display
      if (typeof window !== 'undefined') {
        try {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            if (age < CACHE_DURATION) {
              setProducts(data);
              setIsLoadingProducts(false);
              // Continue fetching fresh data in background
            }
          }
        } catch (e) {
          // Ignore cache errors
        }
      }

      try {
        const fetchPromise = apiClient.getProducts({}).catch(err => {
          if (!isMounted) return { data: [] };
          console.warn('Failed to fetch products:', err);
          return { data: [] };
        });

        // Add timeout to prevent hanging
        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Request timeout')), 8000);
        });

        let productsResponse: any;
        try {
          const result = await Promise.race([
            fetchPromise,
            timeoutPromise
          ]);
          productsResponse = result as any;
          if (timeoutId) clearTimeout(timeoutId);
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          // If timeout or other error, use empty arrays
          productsResponse = { data: [] };
          console.warn('Request timeout or error, using cached data if available:', error);
        }

        // Extract products - handle both success and error responses
        const productsData = productsResponse?.success !== false
          ? (Array.isArray(productsResponse?.data)
              ? productsResponse.data
              : Array.isArray(productsResponse?.data?.items)
              ? productsResponse.data.items
              : [])
          : [];

        // Mark products for identification
        const finalProducts = productsData.map((item: any) => ({
          ...item,
          _isProduct: true,
          _isMenuItem: false,
        }));
        
        console.log('📥 Shop page - Products loaded:', finalProducts.length);
        console.log('📥 Shop page - Total items:', finalProducts.length);
        
        // Only update state if component is still mounted
        if (isMounted) {
          setProducts(finalProducts);
          
          // Cache the result
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                data: finalProducts,
                timestamp: Date.now()
              }));
            } catch (e) {
              // Ignore cache errors (quota exceeded, etc.)
            }
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to fetch products:', error);
        // Don't clear existing products if we have cached data
        if (products.length === 0) {
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    }
    
    // Use setTimeout for non-blocking fetch - allows page to render first
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 100);
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (abortController) {
        abortController.abort();
      }
    };
  }, []);

  // Transform product data to shop format
  const getShopItems = (): ShopItem[] => {
    return products.map((item: any) => {
      // Handle different category formats
      const categoryName = typeof item.category === 'string' 
        ? item.category 
        : item.category?.name || item.menuCategory?.name || item.categoryRef?.name || 'Uncategorized';
      
      // Convert relative image URL to absolute backend URL
      const imageUrl = item.imageUrl 
        ? getImageUrl(item.imageUrl) || '/assets-main/menu/coming-soon.png'
        : '/assets-main/menu/coming-soon.png';
      
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        originalPrice: null,
        image: imageUrl,
        category: categoryName,
        rating: (4.0 + (item.id * 0.1) % 1).toFixed(1),
        tags: Array.isArray(item.dietaryNotes) ? item.dietaryNotes : [],
        description: item.description || '',
        availability: item.availability || (item.isAvailable ? 10 : 0),
        allergenCodes: Array.isArray(item.allergenCodes) ? item.allergenCodes : [],
        preparationTime: item.preparationTime,
        variants: Array.isArray(item.products) ? item.products : (Array.isArray(item.menuProducts) ? item.menuProducts.map((mp: any) => mp.product).filter(Boolean) : []),
        // Store original item data for cart detection
        _originalData: item,
        // Mark item type for easier identification
        _isProduct: item._isProduct === true,
        _isMenuItem: item._isMenuItem === true,
      };
    });
  };

  const shopItems = getShopItems();
  const maxPrice = Math.max(
    1,
    ...shopItems.map((item) => Math.ceil(Number(item.price) || 0))
  );

  useEffect(() => {
    if (shopItems.length === 0) return;
    setPriceRange((prev) => {
      if (prev[0] === 0 && prev[1] === maxPrice) return prev;
      return [0, maxPrice];
    });
  }, [shopItems.length, maxPrice]);

  // Get categories from menu data
  const getCategories = () => {
    const cats = [{ id: 'all', name: ALL_CATEGORY, count: shopItems.length }];
    const categoryCounts: { [key: string]: number } = {};
    shopItems.forEach(item => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });

    // Get unique categories from shop items
    const uniqueCategories = Array.from(new Set(shopItems.map(item => item.category)));
    uniqueCategories.forEach((categoryName) => {
      cats.push({
        id: categoryName.toLowerCase().replace(/\s+/g, '-'),
        name: categoryName,
        count: categoryCounts[categoryName] || 0
      });
    });
    return cats;
  };

  // Get all unique tags
  const getAllTags = () => {
    const tags = new Set<string>();
    shopItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags);
  };

  const categories = getCategories();
  const tags = getAllTags();

  const itemsPerPage = 12;

  // Filter items based on active category, search, tags, and price
  const filteredItems = shopItems.filter(item => {
    const isAllCategory = activeCategory === ALL_CATEGORY || activeCategory === 'All';
    const matchesCategory = isAllCategory || item.category === activeCategory;
    const matchesSearch = searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase()) || item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => item.tags.includes(tag));
    const matchesPrice = item.price >= priceRange[0] && item.price <= priceRange[1];

    // If searching, ignore category filter to show results from all categories
    if (searchQuery !== '') {
      return matchesSearch && matchesTags && matchesPrice;
    } else {
      return matchesCategory && matchesTags && matchesPrice;
    }
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return parseFloat(b.rating) - parseFloat(a.rating);
      default:
        return 0;
    }
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery, selectedTags, priceRange, sortBy]);

  // Keep active category valid when category list changes after API refresh.
  useEffect(() => {
    if (categories.length === 0) {
      if (activeCategory !== ALL_CATEGORY) {
        setActiveCategory(ALL_CATEGORY);
      }
      return;
    }

    const hasActiveCategory = categories.some((category) => category.name === activeCategory);
    if (!hasActiveCategory) {
      setActiveCategory(ALL_CATEGORY);
    }
  }, [activeCategory, categories]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of items
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Swipe handlers for category navigation and pull-to-refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-category-strip="true"]')) {
      return;
    }

    const touch = e.targetTouches[0];
    setTouchEndX(null);
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    setIsPulling(false);
    setPullDistance(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-category-strip="true"]')) {
      return;
    }

    const touch = e.targetTouches[0];
    setTouchEndX(touch.clientX);

    if (touchStartX === null || touchStartY === null) {
      return;
    }

    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const isDownwardPull = deltaY > 0;
    const isVerticalGesture = Math.abs(deltaY) > Math.abs(deltaX);

    if (isMobile && window.scrollY === 0 && isDownwardPull && isVerticalGesture) {
      setIsPulling(true);
      setPullDistance(Math.min(deltaY * 0.5, 100)); // Dampen and limit
    } else if (isPulling) {
      setIsPulling(false);
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) {
      setIsPulling(false);
      setPullDistance(0);
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }

    if (isPulling && pullDistance > 50) {
      // Trigger refresh
      handleRefresh();
    }

    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if ((isLeftSwipe || isRightSwipe) && categories.length === 0) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    if (isLeftSwipe && !isPulling) {
      // Swipe left - next category
      const currentIndex = categories.findIndex(cat => cat.name === activeCategory);
      const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = (safeCurrentIndex + 1) % categories.length;
      setActiveCategory(categories[nextIndex].name);
      setCurrentPage(1);
    } else if (isRightSwipe && !isPulling) {
      // Swipe right - previous category
      const currentIndex = categories.findIndex(cat => cat.name === activeCategory);
      const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
      const prevIndex = safeCurrentIndex === 0 ? categories.length - 1 : safeCurrentIndex - 1;
      setActiveCategory(categories[prevIndex].name);
      setCurrentPage(1);
    }

    setIsPulling(false);
    setPullDistance(0);
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const isMobile = isMobileScreen();

  return (
    <>
      <Breadcrumb pathname="/shop" title={t('Our Menu')} />

      <section className="min-h-screen bg-[#111115] md:py-10 py-10 pb-24">
        {/* Pull to Refresh Indicator */}
        {isMobile && isPulling && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-[#111115] flex items-center justify-center py-4 transition-transform duration-200" style={{ transform: `translateY(${pullDistance - 100}px)` }}>
            <div className="flex items-center gap-2 text-[#f36b24]">
              <svg className={`w-6 h-6 transition-transform duration-200 ${pullDistance > 50 ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm font-medium">{t('Pull to refresh')}</span>
            </div>
          </div>
        )}

        <div
          className="max-w-screen-2xl mx-auto px-4 sm:px-6"
          style={{ transform: isMobile && isPulling ? `translateY(${pullDistance}px)` : 'translateY(0)', transition: isPulling ? 'none' : 'transform 0.3s ease-out' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* <p className="text-md text-[#bdbdbd] max-w-3xl mx-auto text-center mb-16" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
            Explore our carefully crafted dishes made with the finest ingredients
          </p> */}

          {/* Mobile search and categories - visible on small screens */}
          <div className="lg:hidden mb-8">
            <div className="mb-6">
              <input
                type="text"
                placeholder={t('Search dishes...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-[#111115] border border-[#23232a] text-white placeholder:text-sm placeholder-[#666] focus:outline-none focus:border-[#f36b24] transition-colors duration-300 rounded-lg"
              />
            </div>
            <div
              data-category-strip="true"
              className="flex overflow-x-auto gap-3 scrollbar-thin scrollbar-thumb-[#f36b24] scrollbar-track-transparent"
            >
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setActiveCategory(category.name);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-full text-md font-medium whitespace-nowrap transition-all duration-300 touch-manipulation min-h-10 shrink-0 ${activeCategory === category.name
                    ? 'bg-[#f36b24] text-white'
                    : 'bg-[#111115] text-[#bdbdbd] hover:bg-[#23232a]'
                    }`}
                >
                  {t(category.name)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Sidebar - hidden on small screens */}
            <div className="lg:w-1/4 hidden lg:block">
              <div className="bg-[#18181c] rounded-lg p-6 border border-[#23232a] mb-8">
                <h3 className="text-lg font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  {t('Categories')}
                </h3>
                <ul className="space-y-3">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <button
                        onClick={() => {
                          setActiveCategory(category.name);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-md flex justify-between items-center py-2 px-3 rounded-lg text-left transition-all duration-300 ${activeCategory === category.name
                          ? 'bg-[#f36b24] text-white'
                          : 'text-[#bdbdbd] hover:bg-[#23232a]'
                          }`}
                      >
                        <span>{t(category.name)}</span>
                        <span className="text-md">
                          {category.name === ALL_CATEGORY ? shopItems.length : category.count}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Search */}
              <div className="bg-[#18181c] rounded-lg p-6 border border-[#23232a] mb-8">
                <h3 className="text-lg font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  {t('Search')}
                </h3>
                <input
                  type="text"
                  placeholder={t('Search dishes...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111115] border border-[#23232a] text-white placeholder:text-sm placeholder-[#666] focus:outline-none focus:border-[#f36b24] transition-colors duration-300 rounded-lg"
                />
              </div>

              <div className="bg-[#18181c] rounded-lg p-6 border border-[#23232a] mb-8">
                <h3 className="text-lg font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  {t('Filter by Price')}
                </h3>
                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full accent-[#f36b24]"
                  />
                </div>
                <div className="flex justify-between text-[#bdbdbd] text-md">
                  <span>€0</span>
                  <span>€{priceRange[1]}</span>
                </div>
              </div>

              <div className="bg-[#18181c] rounded-lg p-6 border border-[#23232a]">
                <h3 className="text-lg font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  {t('Popular Tags')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedTags(prev =>
                          prev.includes(tag)
                            ? prev.filter(t => t !== tag)
                            : [...prev, tag]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-md border transition-colors duration-300 ${selectedTags.includes(tag)
                        ? 'bg-[#f36b24] text-white border-[#f36b24]'
                        : 'bg-[#111115] text-[#bdbdbd] border-[#23232a] hover:border-[#f36b24]'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:w-3/4">
              {/* Shop Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <p className="text-[#bdbdbd]">
                  {t('Showing')} {startIndex + 1}-{Math.min(endIndex, sortedItems.length)} {t('of')} {sortedItems.length} {t('results')}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-[#bdbdbd]">{t('Sort by:')}</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 bg-[#18181c] border border-[#23232a] text-white rounded-lg focus:outline-none focus:border-[#f36b24] transition-colors duration-300"
                  >
                    <option value="featured" className="bg-[#18181c] text-sm text-gray-500">{t('Featured')}</option>
                    <option value="price-low" className="bg-[#18181c] text-sm text-gray-500">{t('Price: Low to High')}</option>
                    <option value="price-high" className="bg-[#18181c] text-sm text-gray-500">{t('Price: High to Low')}</option>
                    <option value="rating" className="bg-[#18181c] text-sm text-gray-500">{t('Rating')}</option>
                  </select>
                </div>
              </div>

              {/* Shop Items Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`rounded-lg overflow-hidden ${isMobile ? '' : 'transition-all duration-300'} cursor-pointer touch-manipulation min-h-80 flex flex-col ${isMobile ? '' : 'animate-fade-in'}`}
                    style={isMobile ? {} : { animationDelay: `${index * 0.1}s` }}
                    onClick={() => {
                      setSelectedProductId(item.id);
                      setShowProductModal(true);
                    }}
                  >
                    <div className={`relative aspect-5/4 ${isMobile ? '' : 'group'}`}>
                      <img
                        src={getImageUrl(item.image) || ''}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full rounded object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      {item.originalPrice && (
                        <div className="absolute top-2 left-2 bg-[#f36b24] text-[#241c1b] px-2 py-1 rounded-full text-xs font-bold z-10">
                          {t('Sale')}
                        </div>
                      )}

                      {/* Mobile Eye Icon */}
                      {isMobile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductId(item.id);
                            setShowProductModal(true);
                          }}
                          className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm z-10"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      )}

                      {!isMobile && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center transform -translate-x-full group-hover:translate-x-0 transition-transform duration-700 gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductId(item.id);
                              setShowProductModal(true);
                            }}
                            className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full font-medium transition-all duration-300 shadow-lg"
                            aria-label={`${t('View')} ${t(item.name)} ${t('details')}`}
                            title={`${t('View')} ${t(item.name)} ${t('details')}`}
                          >
                            <Eye className="w-6 h-6" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add to wishlist
                              setWishlistItem(item);
                              setShowWishlistModal(true);
                            }}
                            className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full font-medium transition-all duration-300 shadow-lg"
                            aria-label={`${t('Add')} ${t(item.name)} ${t('to wishlist')}`}
                            title={`${t('Add')} ${t(item.name)} ${t('to wishlist')}`}
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(item);
                            }}
                            disabled={isAddingToCart === item.id || !item.availability || item.availability <= 0}
                            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-lg ${isAddingToCart === item.id
                              ? 'bg-gray-500 cursor-wait'
                              : !item.availability || item.availability <= 0
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-[#f36b24] hover:bg-[#e55a1a]'
                              } text-white`}
                            aria-label={`${t('Add')} ${t(item.name)} ${t('to cart')}`}
                            title={`${t('Add')} ${t(item.name)} ${t('to your cart')}`}
                          >
                            {isAddingToCart === item.id ? (
                              <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t('Adding...')}
                              </span>
                            ) : !item.availability || item.availability <= 0 ? (
                              t('Out of Stock')
                            ) : (
                              t('Add to Cart')
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="mb-2">
                        <div className="flex items-start gap-2 mb-1">
                          <h3 className={`${isMobile ? 'text-sm line-clamp-1' : 'text-md line-clamp-2'} font-bold text-white shrink-0 flex-1`}>{t(item.name)}</h3>
                          {(item as any)._isMenuItem && (
                            <span className="px-2 py-0.5 bg-[#f36b24]/20 text-[#f36b24] text-xs rounded-full border border-[#f36b24]/30 whitespace-nowrap shrink-0">
                              Combo
                            </span>
                          )}
                        </div>
                        <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-normal text-[#f36b24]`}>€{item.price.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-[#bdbdbd] mb-2 line-clamp-2 shrink-0" title={t(item.description)} style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                        {t(item.description).length > 40 ? `${t(item.description).substring(0, 40)}...` : t(item.description)}
                      </p>
                      <div className="flex flex-col gap-1 mb-3 shrink-0">
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag, index) => (
                            <div key={index} className="flex items-center gap-1">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${tag === 'Vegetarian' ? 'bg-green-500' :
                                tag === 'Non-Vegetarian' ? 'bg-red-500' :
                                  tag === 'Vegan' ? 'bg-purple-500' :
                                    tag === 'Gluten-Free' ? 'bg-blue-500' :
                                      'bg-gray-500'
                                }`}>
                                <div className="w-1 h-1 bg-white rounded-sm"></div>
                              </div>
                              <span className="text-xs text-[#bdbdbd]">({t(tag)})</span>
                            </div>
                          ))}
                        </div>
                        {getMenuItemAllergens(item) && (
                          <span className="text-xs text-[#888] font-medium">
                            {t('Allergens:')} {getMenuItemAllergens(item)?.codes.join(', ')}
                          </span>
                        )}

                        {item.preparationTime && (
                          <div className="flex items-center gap-1 text-xs text-[#bdbdbd] mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{item.preparationTime} min</span>
                          </div>
                        )}

                        {item.variants && item.variants.length > 0 && (
                          <div className="mt-2 w-full">
                            <p className="text-xs font-semibold text-[#bdbdbd] mb-1">{t('Options:')}</p>
                            <div className="space-y-1">
                              {item.variants.map((v: any) => (
                                <div key={v.id} className="flex justify-between text-xs text-[#888]">
                                  <span>{t(v.name)}</span>
                                  <span>€{v.price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {isMobile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                          disabled={isAddingToCart === item.id || !item.availability || item.availability <= 0}
                          className={`w-full py-2.5 rounded-lg text-white text-sm font-medium shadow-xl ${isAddingToCart === item.id
                            ? 'bg-gray-500 cursor-wait'
                            : !item.availability || item.availability <= 0
                              ? 'bg-gray-600 cursor-not-allowed'
                              : 'bg-[#f36b24] hover:bg-[#e55a1a] hover:shadow-2xl hover:scale-105 active:scale-95'
                            }`}
                          aria-label={`${t('Add')} ${t(item.name)} ${t('to cart')}`}
                          title={`${t('Add')} ${t(item.name)} ${t('to your cart')}`}
                        >
                          {isAddingToCart === item.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {t('Adding...')}
                            </span>
                          ) : !item.availability || item.availability <= 0 ? (
                            t('Out of Stock')
                          ) : (
                            t('Add to Cart')
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${currentPage === 1
                      ? 'bg-[#18181c] text-[#666] cursor-not-allowed'
                      : 'bg-[#18181c] text-white hover:bg-[#f36b24] hover:scale-105'
                      }`}
                    aria-label="Previous page"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);

                    // Show ellipsis
                    const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                    const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                    if (showEllipsisBefore || showEllipsisAfter) {
                      return (
                        <span key={page} className="px-2 text-[#666]">
                          ...
                        </span>
                      );
                    }

                    if (!showPage) return null;

                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${currentPage === page
                          ? 'bg-[#f36b24] text-white scale-110'
                          : 'bg-[#18181c] text-white hover:bg-[#23232a] hover:scale-105'
                          }`}
                        aria-label={`Go to page ${page}`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    );
                  })}

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${currentPage === totalPages
                      ? 'bg-[#18181c] text-[#666] cursor-not-allowed'
                      : 'bg-[#18181c] text-white hover:bg-[#f36b24] hover:scale-105'
                      }`}
                    aria-label="Next page"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          <AllergenNote />
        </div>
      </section>

      {/* Bottom Navigation for App-like Experience */}
      <div className={`${isMobile ? 'fixed bottom-0 left-0 right-0 bg-[#18181c] border-t border-[#23232a] z-50' : 'hidden'}`}>
        <div className="flex justify-around items-center py-3">
          <Link href="/" className="flex flex-col items-center text-[#bdbdbd] hover:text-[#f36b24] transition-colors duration-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">{t('Home')}</span>
          </Link>
          <Link href="/shop" className="flex flex-col items-center text-[#f36b24]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-xs mt-1">{t('Shop')}</span>
          </Link>
          <Link href="/cart" className="flex flex-col items-center text-[#bdbdbd] hover:text-[#f36b24] transition-colors duration-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h7.72a2 2 0 002-1.61L23 6H6" />
            </svg>
            <span className="text-xs mt-1">{t('Cart')}</span>
          </Link>
          <Link href="/contact" className="flex flex-col items-center text-[#bdbdbd] hover:text-[#f36b24] transition-colors duration-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs mt-1">{t('Contact')}</span>
          </Link>
        </div>
      </div>

      {/* Wishlist Modal */}
      {showWishlistModal && wishlistItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181c] rounded-lg p-6 max-w-md w-full border border-[#23232a]">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden mr-4 relative">
                <ImageWithFallback
                  src={wishlistItem.image}
                  alt={wishlistItem.name}
                  fill
                  className="object-cover"
                  fallbackSrc="/assets-main/menu/coming-soon.png"
                />
              </div>
              <div>
                <h3 className="text-md font-bold text-white">{t(wishlistItem.name)}</h3>
                <p className="text-[#bdbdbd]">{t('Added to Wishlist')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWishlistModal(false)}
                className="flex-1 py-1.5 bg-[#f36b24] text-white font-bold rounded-lg hover:bg-[#e55a1a] transition-colors duration-300"
              >
                {t('Continue Shopping')}
              </button>
              <button
                onClick={() => setShowWishlistModal(false)}
                className="px-4 py-1.5 border border-[#23232a] text-white rounded-lg hover:bg-[#23232a] transition-colors duration-300"
              >
                {t('Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setSelectedProductId(null);
        }}
        productId={selectedProductId || undefined}
        entityType="product"
      />

      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={t('Please Login / Register to continue')}
        returnUrl="/shop"
      />
    </>
  );
};

export default ShopPage;
