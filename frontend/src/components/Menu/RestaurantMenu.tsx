"use client";

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import ResponsiveContainer from '../Home/ResponsiveContainer';
import AllergenNote from '../AllergenNote';
import { MenuItemDTO, CategoryDTO } from '../../services/menuService';
import menuData from '../../data/menu.json';
import { getMenuItemAllergens } from '../../lib/allergenUtils';
import { ProductDetailsModal } from '../ProductDetailsModal';
import { useAuth } from '../../lib/auth-context';
import { LoginRequiredModal } from '../LoginRequiredModal';
import { getImageUrl } from '../../lib/image-utils';

interface MenuItem {
  id: number;
  slug?: string;
  name: string;
  price: string;
  image: string;
  description: string;
  category: string;
  categoryType: string;
  dietaryNotes: string[];
  allergenCodes?: number[];
}

const RestaurantMenu = () => {
  const { isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItemDTO[]>([]);
  // CRITICAL: Initialize categories as empty array and ensure it stays an array
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Wrapper function to safely set categories - ensures it's always an array
  const setCategoriesSafe = (newCategories: any) => {
    if (Array.isArray(newCategories)) {
      setCategories(newCategories);
    } else {
      console.error('Attempted to set categories to non-array:', newCategories);
      setCategories([]);
    }
  };

  // Ensure categories is always an array using useMemo
  // This is critical - categories MUST be an array at all times
  const safeCategories = useMemo(() => {
    // Strict validation: ensure categories is actually an array
    if (!categories) {
      return [];
    }
    if (!Array.isArray(categories)) {
      console.error('CRITICAL: categories is not an array:', typeof categories, categories);
      // Force convert to array if possible, otherwise return empty array
      if (categories && typeof categories === 'object' && 'categories' in categories) {
        const extracted = (categories as any).categories;
        return Array.isArray(extracted) ? extracted : [];
      }
      return [];
    }
    // Filter out any invalid entries
    try {
      return categories.filter((cat: any) => 
        cat && typeof cat === 'object' && 'name' in cat
      );
    } catch (error) {
      console.error('Error filtering categories:', error);
      return [];
    }
  }, [categories]);

  // Helper function to safely get category description
  const getCategoryDescription = (categoryName: string): string | null => {
    if (!Array.isArray(safeCategories) || safeCategories.length === 0) {
      return null;
    }
    const category = safeCategories.find(cat => cat && cat.name === categoryName);
    return category?.description || null;
  };

  // Load menu data from static menu.json
  useEffect(() => {
    try {
      setLoading(true);
      setError(null);

      let idCounter = 1;
      const seenCatNames = new Set<string>();
      const seenItemNames = new Set<string>();
      const jsonCats: CategoryDTO[] = [];
      const jsonItems: MenuItemDTO[] = [];

      (menuData.categories as any[]).forEach((cat, idx) => {
        const displayName = cat.type && cat.type !== 'All'
          ? `${cat.name} (${cat.type})`
          : cat.name;
        if (!seenCatNames.has(displayName)) {
          seenCatNames.add(displayName);
          jsonCats.push({
            id: idx + 1,
            name: displayName,
            type: cat.type || null,
            description: cat.description || null,
            imageUrl: null,
            sortOrder: idx,
          });
        }
        (cat.items as any[]).forEach((item) => {
          const itemKey = `${item.name?.toLowerCase().trim()}`;
          if (seenItemNames.has(itemKey)) return;
          seenItemNames.add(itemKey);
          const primary = (item.dietaryNotes || []).find(
            (n: string) => n === 'Vegetarian' || n === 'Non-Vegetarian' || n === 'Vegan'
          );
          jsonItems.push({
            id: idCounter++,
            name: item.name,
            description: item.description || null,
            price: parseFloat((item.price || '0').replace(/[^0-9.]/g, '')) || 0,
            category: displayName,
            type: primary || (cat.type !== 'All' ? cat.type : null) || null,
            dietaryNotes: item.dietaryNotes || [],
            imageUrl: item.image || null,
            allergenCodes: item.allergenCodes || [],
            isAvailable: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });
      });

      setCategoriesSafe(jsonCats);
      setMenuItems(jsonItems);
    } catch (err) {
      console.error('Failed to load menu data:', err);
      setError('Failed to load menu. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);


  // Transform API data to match component structure
  const getAllMenuItems = (): MenuItem[] => {
    return menuItems.map((item: any) => {
      // Handle different category formats
      const categoryName = typeof item.category === 'string' 
        ? item.category 
        : item.category?.name || item.categoryRef?.name || 'Uncategorized';
      
      // Convert relative image URL to absolute backend URL
      const imageUrl = item.imageUrl 
        ? (getImageUrl(item.imageUrl) || '/assets-main/menu/coming-soon.png')
        : '/assets-main/menu/coming-soon.png';
      
      // Safely handle price - ensure it's a number
      const priceValue = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      const formattedPrice = `€${priceValue.toFixed(2)}`;
      
      return {
        id: item.id,
        slug: item.slug,
        name: item.name || 'Unnamed Item',
        price: formattedPrice,
        image: imageUrl,
        description: item.description || '',
        category: categoryName,
        categoryType: item.type || 'All',
        dietaryNotes: Array.isArray(item.dietaryNotes) ? item.dietaryNotes : [],
        allergenCodes: Array.isArray(item.allergenCodes) ? item.allergenCodes : [],
        // Store original data for combo pack detection
        menuProducts: item.menuProducts || item.products || [],
      };
    });
  };

  const allMenuItems = getAllMenuItems();

  // Get unique categories for filtering
  const getUniqueCategories = () => {
    const uniqueCategories = ['All'];
    const seen = new Set<string>();

    menuItems.forEach((item: any) => {
      // Handle different category formats
      const categoryName = typeof item.category === 'string' 
        ? item.category 
        : item.category?.name || item.categoryRef?.name || 'Uncategorized';
      
      if (!seen.has(categoryName)) {
        seen.add(categoryName);
        uniqueCategories.push(categoryName);
      }
    });

    return uniqueCategories;
  };

  const categoryList = getUniqueCategories();

  // Filter items based on active category and search
  const filteredItems = allMenuItems.filter(item => {
    // Category filter
    if (activeCategory !== 'All' && item.category !== activeCategory) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Group filtered items by category for display
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  // Loading state
  if (loading) {
    return (
      <section className="md:py-10 py-10 bg-[#111115] font-lato">
        <ResponsiveContainer>
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#f36b24] mx-auto mb-4"></div>
              <p className="text-white text-lg">Loading menu...</p>
            </div>
          </div>
        </ResponsiveContainer>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="md:py-10 py-10 bg-[#111115] font-lato">
        <ResponsiveContainer>
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-500 text-lg mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-[#f36b24] text-white rounded-lg hover:bg-[#d45a1f] transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </ResponsiveContainer>
      </section>
    );
  }

  return (
    <section className="md:py-10 py-10 bg-[#111115] font-lato">
      <ResponsiveContainer>
        {/* Search Bar */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-3 bg-[#18181c] text-white rounded-lg border border-[#23232a] focus:border-[#f36b24] focus:outline-none transition-colors"
              style={{ fontFamily: 'var(--font-lato), sans-serif' }}
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="mb-12">
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {categoryList.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-1.5 rounded-full md:text-md text-sm font-medium transition-all duration-300 ${activeCategory === category
                  ? 'bg-[#f36b24] text-white'
                  : 'bg-[#18181c] text-[#bdbdbd] hover:bg-[#23232a] hover:text-white'
                  }`}
                style={{ fontFamily: 'var(--font-lato), sans-serif' }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Filtered Menu Items */}
        <div className="space-y-12">
          {Object.entries(groupedItems).map(([categoryName, items]) => (
            <div key={categoryName} className="mb-16">
              <h3 className="text-3xl font-bold text-white mb-6 text-center" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                {categoryName}
              </h3>

              {/* Category Description */}
              {(() => {
                const description = getCategoryDescription(categoryName);
                return description ? (
                  <div className="text-center mb-8 max-w-4xl mx-auto">
                    <p className="text-md text-[#bdbdbd] leading-relaxed" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                      {description}
                    </p>
                    <div className="w-16 h-0.5 bg-[#f36b24] mx-auto mt-6"></div>
                  </div>
                ) : null;
              })()}

              {/* Menu Items Grid */}
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {items.map((item) => {
                  const isComboPack = (item as any).menuProducts && (item as any).menuProducts.length > 0;
                  return (
                    <div key={item.id}>
                      <div 
                        className="flex gap-6 p-6 bg-[#18181c] rounded-lg border border-[#23232a] hover:border-[#f36b24] transition-all duration-300 group cursor-pointer"
                        onClick={() => {
                          if (!isAuthenticated) {
                            setShowLoginModal(true);
                            return;
                          }
                          setSelectedProductId(item.id);
                          setShowProductModal(true);
                        }}
                      >
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0">
                          <Image
                            src={getImageUrl(item.image) || '/assets-main/menu/coming-soon.png'}
                            alt={item.name}
                            fill
                            unoptimized
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.src = '/assets-main/menu/coming-soon.png';
                            }}
                          />
                          {isComboPack && (
                            <div className="absolute top-1 right-1 bg-[#f36b24] text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                              Combo
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-xl font-bold text-white group-hover:text-[#f36b24] transition-colors duration-300" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                              {item.name}
                            </h4>
                            <span className="text-xl font-bold text-[#f36b24]">{item.price}</span>
                          </div>
                          <p className="text-[#bdbdbd] mb-3 text-md line-clamp-2">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap gap-1">
                                {item.dietaryNotes.map((note, index) => (
                                  <div key={index} className="flex items-center gap-1">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${note === 'Vegetarian' ? 'bg-green-500' :
                                      note === 'Non-Vegetarian' ? 'bg-red-500' :
                                        note === 'Vegan' ? 'bg-purple-500' :
                                          note === 'Gluten-Free' ? 'bg-blue-500' :
                                            'bg-gray-500'
                                      }`}>
                                      <div className="w-1 h-1 bg-white rounded-sm"></div>
                                    </div>
                                    <span className="text-xs text-[#bdbdbd]">({note})</span>
                                  </div>
                                ))}
                              </div>
                              {getMenuItemAllergens(item) && (
                                <span className="text-md text-[#888] font-medium py-1" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                                  Allergens: {getMenuItemAllergens(item)?.codes.join(', ')}
                                </span>
                              )}
                              {isComboPack && (
                                <span className="text-xs text-[#f36b24] font-medium mt-1">
                                  Click to view included products
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <AllergenNote />
        </ResponsiveContainer>

        {/* Product Details Modal */}
        <ProductDetailsModal
          isOpen={showProductModal}
          onClose={() => {
            setShowProductModal(false);
            setSelectedProductId(null);
          }}
          productId={selectedProductId || undefined}
          entityType="menu"
        />

        {/* Login Required Modal */}
        <LoginRequiredModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          message="Please Login / Register to continue"
          returnUrl="/menu/restaurant"
        />
      </section>
    );
  };

  export default RestaurantMenu;
