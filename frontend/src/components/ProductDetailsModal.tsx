'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Clock, ShoppingCart } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { getMenuItemAllergens } from '../lib/allergenUtils';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth-context';
import { useRouter } from 'next/navigation';
import { LoginRequiredModal } from './LoginRequiredModal';
import { getImageUrl } from '../lib/image-utils';
import { useLanguage } from '../lib/language';

interface ProductDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId?: number;
    entityType?: 'auto' | 'product' | 'menu';
}

interface Product {
    id: number;
    name: string;
    price: number;
    description: string;
    category: string;
    rating: string;
    reviews: number;
    imageUrl?: string;
    images: string[];
    tags: string[];
    allergenCodes?: number[];
    preparationTime?: number;
    nutritionalInfo?: string;
    availability?: number;
    menuProducts?: any[]; // For combo packs
    isMenuItem?: boolean; // Flag to identify combo packs
}

export function ProductDetailsModal({
    isOpen,
    onClose,
    productId,
    entityType = 'auto',
}: ProductDetailsModalProps) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { t } = useLanguage();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState(0);
    const [addingToCart, setAddingToCart] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Fetch product data when modal opens
    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setQuantity(1);
            setSelectedImage(0);
            setError(null);
            return;
        }

        async function fetchProduct() {
            if (!productId) {
                setError(t('No product identifier provided'));
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Resolve fetch order by caller intent to avoid ID collisions
                // where the same numeric ID exists in both menu and product tables.
                let productData: any = null;
                let isMenuItem = false;

                if (entityType === 'product') {
                    try {
                        const productResponse = await apiClient.getProduct(productId);
                        productData = productResponse?.data;
                        isMenuItem = false;
                    } catch (productError) {
                        // Fallback to menu for compatibility
                        const menuResponse = await apiClient.getMenuItem(productId);
                        if (menuResponse?.data) {
                            productData = menuResponse.data;
                            isMenuItem = true;
                        }
                    }
                } else if (entityType === 'menu') {
                    try {
                        const menuResponse = await apiClient.getMenuItem(productId);
                        if (menuResponse?.data) {
                            productData = menuResponse.data;
                            isMenuItem = true;
                        }
                    } catch (menuError) {
                        // Fallback to product for compatibility
                        const productResponse = await apiClient.getProduct(productId);
                        productData = productResponse?.data;
                        isMenuItem = false;
                    }
                } else {
                    // Auto mode: keep legacy behavior
                    try {
                        const menuResponse = await apiClient.getMenuItem(productId);
                        if (menuResponse?.data) {
                            productData = menuResponse.data;
                            isMenuItem = true;
                        }
                    } catch (menuError) {
                        const productResponse = await apiClient.getProduct(productId);
                        productData = productResponse?.data;
                        isMenuItem = false;
                    }
                }

                if (productData) {
                    // Handle menu item (combo pack) structure
                    // Backend can return either:
                    // 1. menuProducts array: [{ product: {...}, quantity: 1 }, ...]
                    // 2. products array: [{ id, name, price, ... }, ...]
                    let menuProducts: any[] = [];
                    if (isMenuItem) {
                        if (productData.menuProducts && Array.isArray(productData.menuProducts)) {
                            // Format 1: menuProducts with nested product objects
                            menuProducts = productData.menuProducts;
                        } else if (productData.products && Array.isArray(productData.products)) {
                            // Format 2: flat products array - convert to menuProducts format
                            menuProducts = productData.products.map((p: any) => ({
                                product: p,
                                quantity: 1,
                            }));
                        }
                    }
                    
                    setProduct({
                        id: productData.id,
                        name: productData.name,
                        price: productData.price,
                        description: productData.description || '',
                        category: typeof productData.category === 'string' 
                            ? productData.category 
                            : productData.category?.name || productData.categoryRef?.name || t('Uncategorized'),
                        rating: (4.0 + (productData.id * 0.1) % 1).toFixed(1),
                        reviews: Math.floor((productData.id * 7) % 50) + 10,
                        images: [productData.imageUrl 
                            ? (getImageUrl(productData.imageUrl) || '/assets-main/menu/coming-soon.png')
                            : '/assets-main/menu/coming-soon.png'],
                        tags: Array.isArray(productData.dietaryNotes) ? productData.dietaryNotes : [],
                        allergenCodes: Array.isArray(productData.allergenCodes) ? productData.allergenCodes : [],
                        preparationTime: productData.preparationTime,
                        nutritionalInfo: productData.nutritionalInfo,
                        availability: productData.availability || (productData.isAvailable ? 10 : 0),
                        // Store menu item data for combo pack display
                        menuProducts: menuProducts,
                        isMenuItem: isMenuItem,
                    });
                } else {
                    setError(t('Product not found'));
                }
            } catch (err: any) {
                console.error('Failed to fetch product:', err);
                setError(err.message || t('Failed to load product'));
            } finally {
                setLoading(false);
            }
        }

        fetchProduct();
    }, [isOpen, productId, entityType, t]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleAddToCart = async () => {
        if (!product) return;

        if (!isAuthenticated) {
            setShowLoginModal(true);
            return;
        }

        if (!product.availability || product.availability <= 0) {
            toast.error(t('This item is out of stock'));
            return;
        }

        try {
            setAddingToCart(true);

            // Check if this is a menu item or product
            if (product.isMenuItem) {
                await apiClient.addMenuToCart({
                    menuId: product.id,
                    quantity: quantity,
                });
            } else {
                await apiClient.addToCart({
                    productId: product.id,
                    quantity: quantity,
                });
            }

            toast.success(t('Added to cart successfully'));
            window.dispatchEvent(new CustomEvent('cartUpdated'));

            // Close modal after successful add
            setTimeout(() => {
                onClose();
            }, 800);
        } catch (error: any) {
            console.error('Failed to add to cart:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
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
            setAddingToCart(false);
        }
    };

    const incrementQuantity = () => setQuantity((prev) => prev + 1);
    const decrementQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

    if (!isOpen) return null;

    return (
        <>
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pb-4 pt-20 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-[#18181c] border border-[#23232a] rounded-lg flex flex-col overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 text-[#bdbdbd] hover:text-white transition-colors bg-[#111115]/80 backdrop-blur-sm rounded-full p-2"
                    aria-label={t('Close')}
                >
                    <X className="h-6 w-6" />
                </button>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-[#f36b24] scrollbar-track-transparent">
                    {loading ? (
                        <div className="flex items-center justify-center py-32">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#f36b24]"></div>
                        </div>
                    ) : error || !product ? (
                        <div className="flex flex-col items-center justify-center py-32 px-4">
                            <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                                {error || t('Product Not Found')}
                            </h2>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-[#f36b24] text-white rounded-lg hover:bg-[#d65a18] transition-colors"
                            >
                                {t('Close')}
                            </button>
                        </div>
                    ) : (
                        <div className="p-6 md:p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Product Images */}
                                <div>
                                    <div className="relative aspect-square rounded-lg overflow-hidden mb-4">
                                        {/* <Image
                                        
                                            src={product.images[selectedImage]}
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                        /> */}

<img
                                src={getImageUrl(product.images[selectedImage]) || ''}
                                alt={product.name}
                                className="h-80 w-100 rounded object-cover"
                                onError={(e) => {
                                  // Hide broken images
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                                    </div>
                                    {product.images.length > 1 && (
                                        <div className="grid grid-cols-4 gap-2">
                                            {product.images.map((image, index) => (
                                                <div
                                                    key={index}
                                                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 ${selectedImage === index
                                                        ? 'border-[#f36b24]'
                                                        : 'border-[#23232a] hover:border-[#f36b24]/50'
                                                        }`}
                                                    onClick={() => setSelectedImage(index)}
                                                >
                                                    <Image
                                                        src={image}
                                                        alt={`${product.name} ${index + 1}`}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Product Details */}
                                <div className="flex flex-col">
                                    <div className="mb-4">
                                        <span className="text-[#f36b24] font-bold text-sm" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                                            {t(product.category)}
                                        </span>
                                        <h1 className="text-3xl font-bold text-white mt-2 mb-3" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                                            {t(product.name)}
                                        </h1>
                                        <div className="flex items-center mb-3">
                                            <div className="flex text-[#f36b24] mr-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <svg
                                                        key={i}
                                                        className={`w-5 h-5 ${i < Math.floor(parseFloat(product.rating))
                                                            ? 'fill-current'
                                                            : 'fill-none'
                                                            }`}
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                                        />
                                                    </svg>
                                                ))}
                                            </div>
                                            <span className="text-[#bdbdbd] text-sm">
                                                {product.rating} ({product.reviews} {t('reviews')})
                                            </span>
                                        </div>
                                        <p className="text-3xl font-bold text-[#f36b24]">
                                            €{(product.price * quantity).toFixed(2)}
                                        </p>
                                    </div>

                                    <p className="text-[#bdbdbd] text-sm mb-6" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                                        {t(product.description)}
                                    </p>

                                    {/* Dietary Info */}
                                    {product.tags.length > 0 && (
                                        <div className="mb-4">
                                            <h3 className="text-md font-bold text-white mb-2" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                                                {t('Dietary Information')}
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {product.tags.map((tag, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-1 bg-[#111115] px-3 py-1 rounded-full border border-[#23232a]"
                                                    >
                                                        <div
                                                            className={`w-2 h-2 rounded-full ${tag === 'Vegetarian'
                                                                ? 'bg-green-500'
                                                                : tag === 'Non-Vegetarian'
                                                                    ? 'bg-red-500'
                                                                    : tag === 'Vegan'
                                                                        ? 'bg-purple-500'
                                                                        : tag === 'Gluten-Free'
                                                                            ? 'bg-blue-500'
                                                                            : 'bg-gray-500'
                                                                }`}
                                                        ></div>
                                                        <span className="text-sm text-[#bdbdbd]">{t(tag)}</span>
                                                    </div>
                                                ))}
                                                {getMenuItemAllergens(product) && (
                                                    <div className="flex items-center gap-1 bg-[#111115] px-3 py-1 rounded-full border border-[#23232a]">
                                                        <span className="text-sm text-[#bdbdbd]">
                                                            {t('Allergens:')} {getMenuItemAllergens(product)?.codes.join(', ')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Preparation Time */}
                                    {product.preparationTime && (
                                        <div className="mb-4">
                                            <h3 className="text-md font-bold text-white mb-2" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                                                {t('Preparation Time')}
                                            </h3>
                                            <p className="text-[#bdbdbd] text-sm flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                {product.preparationTime} {t('minutes')}
                                            </p>
                                        </div>
                                    )}

                                    {/* Combo Pack Products */}
                                    {product.isMenuItem && product.menuProducts && product.menuProducts.length > 0 && (
                                        <div className="mb-6">
                                            <h3 className="text-md font-bold text-white mb-3" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                                                {t('Included Products')}
                                            </h3>
                                            <div className="space-y-2">
                                                {product.menuProducts.map((mp: any, index: number) => {
                                                    const includedProduct = mp.product || mp;
                                                    return (
                                                        <div
                                                            key={includedProduct.id || index}
                                                            className="bg-[#111115] p-3 rounded-lg border border-[#23232a] flex items-center justify-between"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {includedProduct.imageUrl && (
                                                                    <img
                                                                        src={getImageUrl(includedProduct.imageUrl) || ''}
                                                                        alt={includedProduct.name}
                                                                        className="w-12 h-12 rounded-lg object-cover"
                                                                        onError={(e) => {
                                                                            // Hide broken images
                                                                            e.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                )}
                                                                <div>
                                                                    <p className="text-white font-medium">{t(includedProduct.name)}</p>
                                                                    {includedProduct.description && (
                                                                        <p className="text-xs text-[#bdbdbd] line-clamp-1">
                                                                            {t(includedProduct.description)}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                {includedProduct.price && (
                                                                    <p className="text-[#f36b24] font-semibold">
                                                                        €{includedProduct.price.toFixed(2)}
                                                                    </p>
                                                                )}
                                                                {mp.quantity && mp.quantity > 1 && (
                                                                    <p className="text-xs text-[#bdbdbd]">{t('Qty:')} {mp.quantity}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Nutritional Info */}
                                    {product.nutritionalInfo && (
                                        <div className="mb-6">
                                            <h3 className="text-md font-bold text-white mb-2" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                                                {t('Nutritional Information')}
                                            </h3>
                                            <div className="bg-[#111115] p-3 rounded-lg border border-[#23232a]">
                                                <p className="text-[#bdbdbd] text-sm whitespace-pre-wrap">
                                                    {typeof product.nutritionalInfo === 'string'
                                                        ? product.nutritionalInfo
                                                        : JSON.stringify(product.nutritionalInfo, null, 2)}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Quantity & Add to Cart */}
                                    <div className="mt-auto">
                                        <div className="flex flex-wrap gap-4 items-center">
                                            <div className="flex items-center border border-[#23232a] rounded-lg">
                                                <button
                                                    onClick={decrementQuantity}
                                                    className="w-10 h-10 flex items-center justify-center text-[#f36b24] hover:bg-[#23232a] transition-colors"
                                                    aria-label={t('Decrease quantity')}
                                                >
                                                    <Minus className="w-5 h-5" />
                                                </button>
                                                <span className="w-12 text-center text-white font-bold">{quantity}</span>
                                                <button
                                                    onClick={incrementQuantity}
                                                    className="w-10 h-10 flex items-center justify-center text-[#f36b24] hover:bg-[#23232a] transition-colors"
                                                    aria-label={t('Increase quantity')}
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <button
                                                onClick={handleAddToCart}
                                                disabled={addingToCart || !product.availability || product.availability <= 0}
                                                className={`flex-1 min-w-[200px] py-3 px-6 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-2 ${addingToCart || !product.availability || product.availability <= 0
                                                    ? 'bg-gray-600 cursor-not-allowed text-white'
                                                    : 'bg-[#f36b24] text-white hover:bg-[#d65a18] hover:shadow-lg'
                                                    }`}
                                            >
                                                {addingToCart ? (
                                                    <>
                                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                            <circle
                                                                className="opacity-25"
                                                                cx="12"
                                                                cy="12"
                                                                r="10"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                            ></circle>
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                            ></path>
                                                        </svg>
                                                        {t('Adding...')}
                                                    </>
                                                ) : !product.availability || product.availability <= 0 ? (
                                                    t('Out of Stock')
                                                ) : (
                                                    <>
                                                        <ShoppingCart className="w-5 h-5" />
                                                        {t('Add to Cart')}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Login Required Modal */}
        <LoginRequiredModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            message={t('Please Login / Register to continue')}
            returnUrl={typeof window !== 'undefined' ? window.location.pathname : '/menu/restaurant'}
        />
        </>
    );
}
