"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Breadcrumb from '../../components/Common/Breadcrumb';

const GalleryPage = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  
  const categories = ['All', 'Food', 'Drinks', 'Events', 'Restaurant'];
  
  // Gallery items with categories
  const galleryItems = [
    { id: 1, image: '/assets/img/gallery/gallery-1.webp', category: 'Food' },
    { id: 2, image: '/assets/img/gallery/gallery-2.webp', category: 'Food' },
    { id: 3, image: '/assets/img/gallery/gallery-3.webp', category: 'Drinks' },
    { id: 4, image: '/assets/img/gallery/gallery-4.webp', category: 'Restaurant' },
    { id: 5, image: '/assets/img/gallery/gallery-5.webp', category: 'Events' },
    { id: 6, image: '/assets/img/gallery/gallery-6.webp', category: 'Food' }
  ];

  // Filter items based on active category
  const filteredItems = activeCategory === 'All' 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeCategory);

  return (
    <>
      <Breadcrumb pathname="/gallery" title="Our Gallery" />
      
      <section className="min-h-screen bg-[#111115] md:py-10 py-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <p className="text-xl text-[#bdbdbd] max-w-3xl mx-auto text-center mb-16">
            Explore our culinary creations and restaurant ambiance through our gallery
          </p>
          
          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-3 rounded-full text-lg font-bold transition-all duration-300 ${
                  activeCategory === category
                    ? 'bg-[#F0681D] text-[#111115]'
                    : 'bg-[#18181c] text-white hover:bg-[#23232a]'
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
                className="group relative overflow-hidden rounded-lg aspect-square"
              >
                <Image
                  src={item.image}
                  alt={`Gallery item ${item.id}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = '/assets-main/recipe-5.webp';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-16 h-16 rounded-full bg-[#F0681D] flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#111115]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
};

export default GalleryPage;
