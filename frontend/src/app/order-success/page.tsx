'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { CheckCircle2, Package, Clock, MapPin, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  // Fetch order details if orderId is provided
  const { data: orderResponse, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const response = await apiClient.getOrder(Number(orderId));
      return response;
    },
    enabled: !!orderId,
  });

  const order = orderResponse?.data?.order || orderResponse?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111115] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f36b24]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111115] py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <Card className="bg-[#18181c] border-[#23232a]">
          <CardContent className="pt-16 pb-12">
            <div className="text-center mb-8">
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
              <h1 className="text-3xl font-bold mb-4 text-white" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                Order Confirmed!
              </h1>
              <p className="text-[#bdbdbd] mb-2">
                Thank you for your order. Your order number is:
              </p>
              <p className="text-2xl font-bold text-[#f36b24] mb-6">
                #{orderId || 'N/A'}
              </p>
            </div>

            {order && (
              <div className="space-y-6 mb-8">
                {/* Order Items */}
                {order.items && order.items.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                      Order Items
                    </h2>
                    <div className="space-y-3">
                      {order.items.map((item: any) => {
                        const itemName = item.product?.name || item.menu?.name || 'Unknown Item';
                        const itemPrice = item.price || 0;
                        const isMenuItem = !!item.menuId || !!item.menu;
                        
                        return (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-[#111115] rounded-lg border border-[#23232a]">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{itemName}</span>
                                {isMenuItem && (
                                  <span className="px-2 py-0.5 bg-[#f36b24]/20 text-[#f36b24] text-xs rounded border border-[#f36b24]/30">
                                    Combo
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-[#bdbdbd]">Quantity: {item.quantity}</span>
                            </div>
                            <span className="text-[#f36b24] font-semibold">
                              €{(itemPrice * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Order Summary */}
                <div className="border-t border-[#23232a] pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#bdbdbd]">Subtotal</span>
                      <span className="text-white font-semibold">
                        €{order.total ? (order.total / 1.08).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#bdbdbd]">Tax (8%)</span>
                      <span className="text-white font-semibold">
                        €{order.total ? (order.total * 0.08 / 1.08).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#23232a]">
                      <span className="text-lg font-bold text-white">Total</span>
                      <span className="text-2xl font-bold text-[#f36b24]">
                        €{order.total?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                {(order.customerName || order.customerEmail || order.customerPhone || order.deliveryAddress) && (
                  <div className="border-t border-[#23232a] pt-6">
                    <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                      Delivery Information
                    </h2>
                    <div className="space-y-2 text-[#bdbdbd]">
                      {order.customerName && (
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span>{order.customerName}</span>
                        </div>
                      )}
                      {order.customerEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>{order.customerEmail}</span>
                        </div>
                      )}
                      {order.customerPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{order.customerPhone}</span>
                        </div>
                      )}
                      {order.deliveryAddress && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5" />
                          <span>{order.deliveryAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Status */}
                <div className="border-t border-[#23232a] pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-md font-semibold text-white mb-1">Order Status</h3>
                      <p className="text-sm text-[#bdbdbd]">
                        {order.status || 'PENDING'}
                      </p>
                    </div>
                    {order.createdAt && (
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-[#bdbdbd] text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(order.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 mt-8">
              <Button
                className="w-full bg-[#f36b24] hover:bg-[#d65a18] text-white font-bold"
                onClick={() => router.push('/menu/restaurant')}
              >
                Continue Shopping
              </Button>
              <Button
                variant="outline"
                className="w-full border-[#23232a] text-white hover:bg-[#23232a]"
                onClick={() => router.push('/dashboard')}
              >
                View My Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#111115] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f36b24]"></div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}








