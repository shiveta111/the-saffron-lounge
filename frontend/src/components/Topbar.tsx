"use client";

import { useLanguage } from '../lib/language';

export default function Topbar() {
  const { t } = useLanguage();

  return (
    <div className="w-full bg-[#F0681D] text-white py-2 px-4 text-center text-sm font-medium" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
      <div className="max-w-screen-2xl mx-auto">
        <span className="hidden sm:inline">
          {t('Welcome to The Saffron Lounge - Experience Authentic Indian Cuisine & Premium Cocktails')}
        </span>
        <span className="sm:hidden">
          {t('Welcome to The Saffron Lounge')}
        </span>
      </div>
    </div>
  );
}