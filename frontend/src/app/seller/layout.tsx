'use client';

import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={['SELLER']}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Seller Panel</h1>
              <nav className="flex space-x-4">
                <a href="/seller/dashboard" className="text-gray-600 hover:text-gray-900 font-medium">Dashboard</a>
                <a href="/seller/products" className="text-gray-600 hover:text-gray-900">Products</a>
                <a href="/seller/orders" className="text-gray-600 hover:text-gray-900">Orders</a>
                <a href="/seller/customers" className="text-gray-600 hover:text-gray-900">Customers</a>
              </nav>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}