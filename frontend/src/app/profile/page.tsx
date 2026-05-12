"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '../../components/Common/Breadcrumb';

type User = {
  name: string;
  email: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Simulate fetching user info from localStorage or API
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        // Defensive: check for name and email
        if (parsed && typeof parsed === 'object' && 'name' in parsed && 'email' in parsed) {
          setUser({ name: parsed.name, email: parsed.email });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profile</h2>
          <p className="text-gray-600">You are not logged in.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb pathname="/profile" title="Profile" />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Profile</h1>
          </div>
        <div className="space-y-4">
          <div>
            <span className="font-semibold">Name:</span> {user.name}
          </div>
          <div>
            <span className="font-semibold">Email:</span> {user.email}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
