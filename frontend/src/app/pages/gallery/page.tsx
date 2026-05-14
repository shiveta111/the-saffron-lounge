"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Breadcrumb from '../../../components/Common/Breadcrumb';

export default function PagesGalleryPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  
  const categories = ['All', 'Food', 'Restaurant', 'Events', 'Chef'];
  
  const galleryItems = [
    { id: 1, category: 'Food', image: '/assets/img/gallery/gallery-1.webp' },
    { id: 2, category: 'Restaurant', image: '/assets/img/gallery/gallery-2.webp' },
    { id: 3, category: 'Food', image: '/assets/img/gallery/gallery-3.webp' },
    { id: 4, category: 'Restaurant', image: '/assets/img/gallery/gallery-4.webp' },
    { id: 5, category: 'Events', image: '/assets/img/gallery/gallery-5.webp' },
    { id: 6, category: 'Chef', image: '/assets/img/gallery/gallery-6.webp' },
    { id: 7, category: 'Food', image: '/assets/img/gallery/gallery-7.webp' },
    { id: 8, category: 'Events', image: '/assets/img/gallery/gallery-8.webp' },
  ];

  // Filter items based on active category
  const filteredItems = activeCategory === 'All' 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeCategory);

  return (
    <>
      <Breadcrumb pathname="/pages/gallery" title="Our Gallery" />
      <section className="min-h-screen bg-[#111115] md:py-10 py-10">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-xl text-[#bdbdbd] max-w-3xl mx-auto">
            Explore our culinary creations and restaurant ambiance through our gallery
          </p>
        </div>
        
        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-3 rounded-full text-lg font-bold transition-all duration-300 ${
                activeCategory === category
                  ? 'bg-[#F36B24] text-[#111115]'
                  : 'bg-[#18181c] text-white hover:bg-[#F36B24] hover:text-[#111115] border border-[#23232a]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="relative aspect-square rounded-lg overflow-hidden group"
            >
              <Image 
                src={item.image} 
                alt={`${item.category} Image`} 
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#F36B24] bg-opacity-0 group-hover:bg-opacity-100 flex items-center justify-center transition-all duration-300 transform scale-0 group-hover:scale-100">
                  <svg className="w-6 h-6 text-[#111115] opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}
