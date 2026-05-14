'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Clock className="h-12 w-12 text-blue-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Coming Soon</CardTitle>
          <CardDescription className="text-gray-600">
            The Settings module is currently under development and will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-500">
            This feature will include comprehensive system configuration options,
            security settings, and administrative controls.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}