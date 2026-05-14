import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import { theme } from '../../app/theme';
import ResponsiveContainer from './ResponsiveContainer';
import { getImageUrl } from '../../lib/image-utils';
import { env } from '../../lib/env';
import { useLanguage } from '../../lib/language';
import { AutoTranslate } from '../Translate';

// Types based on API response
interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  categoryId: number;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
  type: string;
  isSpecial: boolean;
  preparationTime: number | null;
  dietaryNotes: string[] | string;
  allergenCodes: string[] | string;
  nutritionalInfo: any;
  sku: string;
  availability: number;
}

interface CategoryRef {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  type: string | null;
}

interface MenuItem {
  id: number;
  name: string;
  slug: string | null;
  description: string;
  price: number;
  category: string;
  categoryId: number;
  type: string;
  imageUrl: string;
  isAvailable: boolean;
  isSpecial: boolean;
  preparationTime: number | null;
  dietaryNotes: string[];
  allergenCodes: string[];
  nutritionalInfo: any;
  createdAt: string;
  updatedAt: string;
  categoryRef: CategoryRef;
  products: Product[];
}

interface ApiResponse {
  success: boolean;
  data: MenuItem[];
  count: number;
}

const MenuShowcase = () => {
  //const { language } = useLanguage();
    const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [categoriesWithProducts, setCategoriesWithProducts] = useState<{category: string, products: Product[]}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch menu data from API using axios
  useEffect(() => {
    async function fetchMenuData() {
      try {
        setLoading(true);
        setError(null);
        
        // Use axios to fetch menu items from API
        const response = await axios.get<ApiResponse>(`${env.apiUrl}/menus`);
        
        if (response.data.success && response.data.data) {
          // Extract all products from all menu items
          const allProducts: Product[] = [];
          
          response.data.data.forEach((menuItem: MenuItem) => {
            if (menuItem.products && Array.isArray(menuItem.products)) {
              menuItem.products.forEach((product: Product) => {
                // Use product's category, fallback to menuItem category
                const productCategory = product.category || menuItem.category;
                allProducts.push({
                  ...product,
                  category: productCategory
                });
              });
            }
          });
          
          // Group products by category
          const groupedByCategory: {[key: string]: Product[]} = {};
          
          allProducts.forEach((product: Product) => {
            const category = product.category;
            if (!groupedByCategory[category]) {
              groupedByCategory[category] = [];
            }
            // Avoid duplicate products
            if (!groupedByCategory[category].some(p => p.id === product.id)) {
              groupedByCategory[category].push(product);
            }
          });
          
          // Convert to array and take first 4 categories that have products
          const categoriesArray = Object.keys(groupedByCategory)
            .map(category => ({
              category,
              products: groupedByCategory[category].slice(0, 3) // First 3 products per category
            }))
            .filter(item => item.products.length > 0) // Only keep categories with products
            .slice(0, 4); // Take first 4 categories
          
          setCategoriesWithProducts(categoriesArray);
          
          // Set first category as active
          if (categoriesArray.length > 0) {
            setActiveCategory(categoriesArray[0].category);
          }
        } else {
          throw new Error('Invalid API response format');
        }
      } catch (err: any) {
        console.error('Failed to fetch menu data:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load menu data from API.');
      } finally {
        setLoading(false);
      }
    }

    fetchMenuData();
  }, []);

  // Get current active category products
  const getActiveCategoryProducts = () => {
    const categoryData = categoriesWithProducts.find(cat => cat.category === activeCategory);
    return categoryData ? categoryData.products : [];
  };

  // Format price with € symbol
  const formatPrice = (price: number | string): string => {
    const priceNum = typeof price === 'number' ? price : parseFloat(String(price)) || 0;
    return `€${priceNum.toFixed(2)}`;
  };

  // Get categories from API data
  const getCategoriesFromAPI = () => {
    return categoriesWithProducts.map(cat => cat.category);
  };

  // Get products from API data
  const getProductsFromAPI = () => {
    return getActiveCategoryProducts();
  };

  return (
    <section className={`${theme.spacing.sectionPadding} bg-[#111115] font-lato relative overflow-hidden min-h-[600px]`}>
      
      {/* Background shapes */}
      <div className="absolute left-0 top-1/4 z-0 hidden lg:block w-52 h-128">
        <Image src="/assets-main/shape-6.webp" alt="Left shape" width={208} height={512} className="object-contain w-full h-full" />
      </div>
      <div className="absolute right-0 bottom-1/4 z-0 hidden lg:block w-48 h-96">
        <Image src="/assets-main/shape-9.webp" alt="Right shape" width={192} height={384} className="object-contain w-full h-full" />
      </div>

      <ResponsiveContainer>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 lg:gap-20 items-start">

          {/* Left Side - Banner */}
          <div className="relative flex justify-center lg:justify-start mb-12 lg:mb-0">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight" style={{ fontFamily: 'var(--font-el-messiri)' }}>
              <span className="block mb-2">{t('From Our')}</span>
                <span className="block">{t('Restaurant Menu')}</span>
              </h2>
              <div className="relative rounded-lg overflow-hidden transform rotate-1 sm:rotate-2 w-[300px] sm:w-[400px] lg:w-[500px]">
                <Image
                  src="/assets-main/showcasemenu/showcaserecipe.png"
                  alt={t('Main dish')}
                  width={500}
                  height={500}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Right Side - Menu Items */}
          <div className="relative flex flex-col justify-start">
            {/* Categories - ONLY from API */}
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-8">
              {getCategoriesFromAPI().map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full text-sm sm:text-base font-bold transition-all duration-300 ${
                    activeCategory === category
                      ? 'bg-[#f36b24] text-white'
                      : 'bg-[#18181c] text-white hover:bg-[#23232a]'
                  }`}
                  style={{ fontFamily: 'var(--font-lato), sans-serif' }}
                >
                  <AutoTranslate as="span">{category}</AutoTranslate>
                </button>
              ))}
              <Link
                href="/menu/restaurant"
                className="px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full text-sm sm:text-base font-bold bg-transparent text-white border border-white hover:bg-white hover:text-[#111115] transition-all duration-300"
                style={{ fontFamily: 'var(--font-lato), sans-serif' }}
              >
                {t('View All Menu')}
              </Link>
            </div>

            {/* Menu Items - ONLY from API */}
            <div className="space-y-6 sm:space-y-8">
              {loading ? (
                <div className="text-white text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f36b24] mx-auto mb-4"></div>
                  <p>{t('Loading menu from API...')}</p>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center py-8">
                  <p>{t(error)}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-[#f36b24] text-white rounded-lg hover:bg-[#d45a1f] transition-colors"
                  >
                    {t('Retry')}
                  </button>
                </div>
              ) : getProductsFromAPI().length > 0 ? (
                getProductsFromAPI().map((product: Product) => (
                  <div key={product.id} className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex-shrink-0">
                      <div className="relative overflow-hidden rounded-lg w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40">
                        {(() => {
                          const imageUrl = getImageUrl(product.imageUrl) || '/assets-main/menu/coming-soon.png';
                          return (
                            <Image
                              src={imageUrl}
                              alt={product.name}
                              width={160}
                              height={160}
                              className="object-cover w-full h-full"
                              unoptimized
                              onError={(e) => { 
                                const target = e.target as HTMLImageElement;
                                target.src = '/assets-main/menu/coming-soon.png';
                              }}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex-grow">
                      <div className="flex items-center mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-[#f36b24] hover:text-white transition-colors duration-300" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                          <AutoTranslate as="span">{product.name}</AutoTranslate>
                        </h3>
                        <div className="flex-1 border-b border-dotted border-white mx-2"></div>
                        <span className="text-base sm:text-lg font-normal text-[#f36b24]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      <p className="text-white text-md leading-relaxed mb-2" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                        <AutoTranslate as="span">{product.description}</AutoTranslate>
                      </p>
                      {product.dietaryNotes && (
                        <p className="text-gray-400 text-sm italic" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                          <AutoTranslate as="span">
                            {Array.isArray(product.dietaryNotes) 
                              ? product.dietaryNotes.join(', ')
                              : typeof product.dietaryNotes === 'string'
                                ? product.dietaryNotes.replace(/[\[\]"]/g, '')
                                : ''}
                          </AutoTranslate>
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white text-center py-8">
                  <p>{t('No menu items available from API.')}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-[#f36b24] text-white rounded-lg hover:bg-[#d45a1f] transition-colors"
                  >
                    {t('Refresh')}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
};

export default MenuShowcase;