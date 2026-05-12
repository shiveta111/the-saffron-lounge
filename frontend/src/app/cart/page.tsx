'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { CouponCodeInput } from '../../components/customer/CouponCodeInput';
import { ActivePromotionsDisplay } from '../../components/customer/ActivePromotionsDisplay';
import { OffersModal } from '../../components/customer/OffersModal';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getImageUrl } from '../../lib/image-utils';
import { useLanguage } from '../../lib/language';

export default function CartPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  // Listen for cart updates from other components
  useEffect(() => {
    const handleCartUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [queryClient]);

  // Fetch cart
  const { data: cartResponse, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await apiClient.getCart();
      return response;
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      apiClient.updateCartItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      toast.success(t('Cart updated'));
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.error || error.message || t('Failed to update cart');
      toast.error(errorMessage);
      console.error('Cart update error:', error);
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => apiClient.removeFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      toast.success(t('Item removed from cart'));
    },
    onError: (error: any) => {
      toast.error(error.error || t('Failed to remove item'));
    },
  });

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: () => apiClient.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      toast.success(t('Cart cleared'));
    },
    onError: (error: any) => {
      toast.error(error.error || t('Failed to clear cart'));
    },
  });

  const cart = cartResponse?.data?.cart || cartResponse?.data;
  const cartItems = cart?.items || [];
  const subtotal = cartItems.reduce(
    (sum: number, item: any) => {
      // Handle both products and menu items
      const itemPrice = item.menu ? (item.menu.price || item.price) : (item.product?.price || item.price);
      return sum + itemPrice * item.quantity;
    },
    0
  );
  const tax = subtotal * 0.08;
  const total = Math.max(0, subtotal + tax - appliedDiscount);

  const handleUpdateQuantity = (itemId: number, currentQuantity: number, delta: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity < 1) return;
    updateQuantityMutation.mutate({ itemId, quantity: newQuantity });
  };

  const handleRemoveItem = (itemId: number) => {
    if (confirm(t('Remove this item from cart?'))) {
      removeItemMutation.mutate(itemId);
    }
  };

  const handleClearCart = () => {
    if (confirm(t('Clear all items from cart?'))) {
      clearCartMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111115] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f36b24]"></div>
      </div>
    );
  }

  return (
    <div key={language} className="min-h-screen bg-[#111115] py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8 text-white" style={{ fontFamily: 'var(--font-el-messiri)' }}>{t('Shopping Cart')}</h1>

        {cartItems.length === 0 ? (
          <Card className="bg-[#18181c] border-[#23232a]">
            <CardContent className="py-24 text-center">
              <div className="w-24 h-24 bg-[#23232a] rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="h-12 w-12 text-[#f36b24]" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-white">{t('Your cart is empty')}</h2>
              <p className="text-[#bdbdbd] mb-8 max-w-md mx-auto">
                {t("Looks like you haven't added anything to your cart yet.")}
                {' '}
                {t('Explore our menu and find something delicious!')}
              </p>
              <Link href="/menu/restaurant">
                <Button className="bg-[#f36b24] hover:bg-[#d65a18] text-white font-bold px-8 py-6 text-lg">
                  {t('Browse Menu')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">
                  {cartItems.length} {t('Items')}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCart}
                  className="text-red-500 hover:text-red-400 hover:bg-[#23232a]"
                >
                  {t('Clear Cart')}
                </Button>
              </div>

              {cartItems.map((item: any) => {
                // Handle both products and menu items
                const isMenuItem = !!item.menuId && !!item.menu;
                const itemData = isMenuItem ? item.menu : item.product;
                const itemPrice = item.menu ? (item.menu.price || item.price) : (item.product?.price || item.price);
                const itemName = itemData?.name || t('Unknown Item');
                const translatedItemName = t(itemName);
                const itemDescription = itemData?.description || '';
                const itemImageUrl = getImageUrl(itemData?.imageUrl);
                const menuProducts = item.menu?.menuProducts || [];

                return (
                  <Card key={item.id} className="bg-[#18181c] border-[#23232a] overflow-hidden hover:border-[#f36b24] transition-colors">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-[#23232a]">
                          <img
                            src={itemImageUrl || '/assets-main/menu/coming-soon.png'}
                            alt={translatedItemName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.src.includes('coming-soon')) {
                                target.src = '/assets-main/menu/coming-soon.png';
                              }
                            }}
                          />
                        </div>

                        <div className="flex-1 p-6 flex flex-col justify-between">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                                  {translatedItemName}
                                </h3>
                                {isMenuItem && (
                                  <span className="px-2 py-0.5 bg-[#f36b24]/20 text-[#f36b24] text-xs rounded-full border border-[#f36b24]/30">
                                    {t('Combo Pack')}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[#bdbdbd] line-clamp-2 mb-2">
                                {t(itemDescription)}
                              </p>
                              {/* Show included products for combo packs */}
                              {isMenuItem && menuProducts.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs font-semibold text-[#bdbdbd]">{t('Includes:')}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {menuProducts.slice(0, 3).map((mp: any, idx: number) => {
                                      const product = mp.product || mp;
                                      return (
                                        <span key={product.id || idx} className="text-xs text-[#888] bg-[#111115] px-2 py-0.5 rounded">
                                          {t(product.name)}
                                        </span>
                                      );
                                    })}
                                    {menuProducts.length > 3 && (
                                      <span className="text-xs text-[#888]">+{menuProducts.length - 3} {t('more')}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-[#666] hover:text-red-500 hover:bg-transparent -mt-2 -mr-2"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center bg-[#111115] rounded-lg border border-[#23232a]">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleUpdateQuantity(item.id, item.quantity, -1)
                                }
                                disabled={item.quantity <= 1}
                                className="text-[#f36b24] hover:text-[#d65a18] hover:bg-transparent h-10 w-10"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-12 text-center font-bold text-white">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleUpdateQuantity(item.id, item.quantity, 1)
                                }
                                className="text-[#f36b24] hover:text-[#d65a18] hover:bg-transparent h-10 w-10"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="text-xl font-bold text-[#f36b24]">
                              €{(itemPrice * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24 bg-[#18181c] border-[#23232a]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-el-messiri)' }}>{t('Order Summary')}</h2>
                    <Button
                      onClick={() => setShowOffersModal(true)}
                      variant="outline"
                      size="sm"
                      className="border-[#f36b24] text-[#f36b24] hover:bg-[#f36b24] hover:text-white"
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      {t('View Offers')}
                    </Button>
                  </div>

                  {/* Active Promotions Display */}
                  <ActivePromotionsDisplay />

                  {/* Coupon Code Input */}
                  <div className="mb-6">
                    <CouponCodeInput
                      orderTotal={subtotal}
                      items={cartItems.map((item: any) => ({
                        productId: item.productId || item.product?.id,
                        quantity: item.quantity,
                      }))}
                      onCouponApplied={(discount) => {
                        setAppliedDiscount(discount);
                        window.dispatchEvent(new CustomEvent('couponApplied', { detail: { discount } }));
                      }}
                      onCouponRemoved={() => {
                        setAppliedDiscount(0);
                        window.dispatchEvent(new CustomEvent('couponRemoved'));
                      }}
                    />
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-[#bdbdbd]">{t('Subtotal')}</span>
                      <span className="font-semibold text-white">€{subtotal.toFixed(2)}</span>
                    </div>
                    {appliedDiscount > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span className="text-[#bdbdbd]">{t('Discount')}</span>
                        <span className="font-semibold">-€{appliedDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#bdbdbd]">{t('Tax (8%)')}</span>
                      <span className="font-semibold text-white">€{tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-[#23232a] pt-3 flex justify-between">
                      <span className="text-lg font-bold text-white">{t('Total')}</span>
                      <span className="text-2xl font-bold text-[#f36b24]">
                        €{total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-[#f36b24] hover:bg-[#d65a18] text-white font-bold py-6 mb-3 text-lg flex items-center justify-center gap-2"
                    onClick={() => router.push('/checkout')}
                  >
                    {t('Proceed to Checkout')}
                    <ArrowRight className="h-5 w-5" />
                  </Button>

                  <Link href="/menu/restaurant" className="w-full">
                    <Button 
                      variant="outline" 
                      className="w-full border-[#23232a] text-[#bdbdbd] hover:bg-[#23232a] hover:text-white bg-transparent hover:border-[#f36b24]/50 transition-colors"
                    >
                      {t('Continue Shopping')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Offers Modal */}
        <OffersModal open={showOffersModal} onClose={() => setShowOffersModal(false)} />
      </div>
    </div>
  );
}
