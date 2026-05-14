"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Breadcrumb from '../../../components/Common/Breadcrumb';
import AllergenNote from '../../../components/AllergenNote';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { queryKeys } from '../../../lib/query-client';
import { getImageUrl } from '../../../lib/image-utils';
import { getMenuItemAllergens } from '../../../lib/allergenUtils';
import { ProductDetailsModal } from '../../../components/ProductDetailsModal';

export default function ExploreMenuPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeType, setActiveType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // ── Fetch DB items ────────────────────────────────────────────────────────────

  const { data: menuResponse, isLoading } = useQuery({
    queryKey: queryKeys.menuItems,
    queryFn: () => apiClient.getMenuItems({}),
    refetchInterval: 30000,
  });

  const dbItems: any[] = useMemo(() => {
    if (!menuResponse) return [];
    if (Array.isArray(menuResponse?.data)) return menuResponse.data;
    if (Array.isArray(menuResponse?.data?.items)) return menuResponse.data.items;
    if (Array.isArray(menuResponse?.items)) return menuResponse.items;
    if (Array.isArray(menuResponse)) return menuResponse;
    return [];
  }, [menuResponse]);

  // ── Derived display data ──────────────────────────────────────────────────────

  const displayItems = useMemo(() =>
    dbItems.map((item: any) => {
      const categoryName =
        typeof item.category === 'string' && item.category
          ? item.category
          : item.categoryRef?.name || item.category?.name || 'Uncategorized';
      const priceValue = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      const dietaryNotes = Array.isArray(item.dietaryNotes) ? item.dietaryNotes : [];
      const primaryType =
        item.type && item.type !== 'All'
          ? item.type
          : dietaryNotes.find((n: string) =>
              n === 'Vegetarian' || n === 'Non-Vegetarian' || n === 'Vegan'
            ) || null;
      return {
        ...item,
        categoryName,
        priceFormatted: `€${priceValue.toFixed(2)}`,
        priceValue,
        imageResolved: item.imageUrl
          ? getImageUrl(item.imageUrl) || '/assets-main/menu/coming-soon.png'
          : '/assets-main/menu/coming-soon.png',
        dietaryNotes,
        allergenCodes: Array.isArray(item.allergenCodes) ? item.allergenCodes : [],
        isComboPack:
          (item.menuProducts && item.menuProducts.length > 0) ||
          (item.products && item.products.length > 0),
        primaryType,
      };
    }),
  [dbItems]);

  const typeOptions = ['All', 'Vegetarian', 'Non-Vegetarian', 'Vegan'];

  const categoryList = useMemo(() => {
    const names = new Set<string>();
    displayItems.forEach((item) => names.add(item.categoryName));
    return ['All', ...Array.from(names)];
  }, [displayItems]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return displayItems.filter((item) => {
      if (activeCategory !== 'All' && item.categoryName !== activeCategory) return false;
      if (activeType !== 'All') {
        const matches = item.primaryType === activeType || item.dietaryNotes.includes(activeType);
        if (!matches) return false;
      }
      if (q && !item.name?.toLowerCase().includes(q) && !item.description?.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [displayItems, activeCategory, activeType, searchQuery]);

  const groupedItems = useMemo(() =>
    filtered.reduce((acc: Record<string, any[]>, item) => {
      if (!acc[item.categoryName]) acc[item.categoryName] = [];
      acc[item.categoryName].push(item);
      return acc;
    }, {}),
  [filtered]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <Breadcrumb pathname="/menu/explore-menu" title="Explore Menu" />

      <section className="md:py-10 py-10 bg-[#111115] font-lato">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* Search bar */}
          <div className="flex justify-center mb-8">
            <div className="relative w-full max-w-2xl">
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-3 rounded-full bg-[#18181c] border border-[#23232a] text-white placeholder-[#666] focus:outline-none focus:border-[#f36b24] transition-colors duration-300"
                style={{ fontFamily: 'var(--font-lato), sans-serif' }}
              />
              <svg
                className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]"
                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-3.5-3.5" />
              </svg>
            </div>
          </div>

          {/* Dietary type filter */}
          <div className="mb-6">
            <div className="flex flex-wrap justify-center gap-3">
              {typeOptions.map((type) => (
                <button key={type} onClick={() => setActiveType(type)}
                  className={`px-6 py-1.5 rounded-full md:text-md text-sm font-medium transition-all duration-300 ${
                    activeType === type
                      ? 'bg-[#f36b24] text-white'
                      : 'bg-[#18181c] text-[#bdbdbd] hover:bg-[#23232a] hover:text-white'
                  }`}
                  style={{ fontFamily: 'var(--font-lato), sans-serif' }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div className="mb-12">
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {categoryList.map((category) => (
                <button key={category} onClick={() => setActiveCategory(category)}
                  className={`px-6 py-1.5 rounded-full md:text-md text-sm font-medium transition-all duration-300 ${
                    activeCategory === category
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

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#f36b24] mx-auto mb-4" />
                <p className="text-white text-lg">Loading menu...</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && displayItems.length === 0 && (
            <div className="text-center py-20">
              <p className="text-[#bdbdbd] text-lg">No menu items available yet.</p>
            </div>
          )}

          {/* No filter match */}
          {!isLoading && displayItems.length > 0 && filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-[#bdbdbd] text-lg">No items match your filters.</p>
            </div>
          )}

          {/* Items grouped by category */}
          {!isLoading && filtered.length > 0 && (
            <div className="space-y-12">
              {Object.entries(groupedItems).map(([categoryName, items]) => (
                <div key={categoryName} className="mb-16">
                  <h3
                    className="text-3xl font-bold text-white mb-6 text-center"
                    style={{ fontFamily: 'var(--font-el-messiri)' }}
                  >
                    {categoryName}
                  </h3>

                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="group cursor-pointer"
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <div className="flex gap-6 p-6 bg-[#18181c] rounded-lg border border-[#23232a] hover:border-[#f36b24] transition-all duration-300">

                          {/* Thumbnail */}
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0">
                            <Image
                              src={item.imageResolved}
                              alt={item.name}
                              fill unoptimized
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/assets-main/menu/coming-soon.png';
                              }}
                            />
                            {item.isComboPack && (
                              <div className="absolute top-1 right-1 bg-[#f36b24] text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                Combo
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                              <h4
                                className="text-xl font-bold text-white group-hover:text-[#f36b24] transition-colors duration-300 pr-2"
                                style={{ fontFamily: 'var(--font-el-messiri)' }}
                              >
                                {item.name}
                              </h4>
                              <span className="text-xl font-bold text-[#f36b24] shrink-0">{item.priceFormatted}</span>
                            </div>
                            <p className="text-[#bdbdbd] mb-3 text-md line-clamp-2">{item.description}</p>

                            <div className="flex flex-wrap gap-1 mb-1">
                              {item.dietaryNotes.map((note: string, i: number) => (
                                <div key={i} className="flex items-center gap-1">
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                    note === 'Vegetarian' ? 'bg-green-500' :
                                    note === 'Non-Vegetarian' ? 'bg-red-500' :
                                    note === 'Vegan' ? 'bg-purple-500' :
                                    note === 'Gluten-Free' ? 'bg-blue-500' : 'bg-gray-500'
                                  }`}>
                                    <div className="w-1 h-1 bg-white rounded-sm" />
                                  </div>
                                  <span className="text-xs text-[#bdbdbd]">({note})</span>
                                </div>
                              ))}
                            </div>

                            {getMenuItemAllergens(item) && (
                              <span className="text-sm text-[#888] font-medium" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                                Allergens: {getMenuItemAllergens(item)?.codes.join(', ')}
                              </span>
                            )}

                            <p className="text-xs text-[#f36b24] mt-2 font-medium">Click to view details →</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <AllergenNote />
        </div>
      </section>

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={selectedItemId !== null}
        onClose={() => setSelectedItemId(null)}
        productId={selectedItemId ?? undefined}
        entityType="menu"
      />
    </>
  );
}
