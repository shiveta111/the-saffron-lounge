'use client';

import { Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FavoritesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Favorites</h1>
        <p className="text-gray-600 mt-2">Your favorite menu items</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5" />
            <span>Favorite Items</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Favorites page coming soon
            </h3>
            <p className="text-gray-600">
              This page will display your favorite menu items for quick reordering.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
