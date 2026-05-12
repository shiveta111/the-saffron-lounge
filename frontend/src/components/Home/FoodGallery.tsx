import React from 'react';
import Image from 'next/image';
import { theme } from '../../app/theme';
import { etarBellotaFont } from '../../app/etarBellotaFont';

const FoodGallery = () => {
  const galleryItems = [
    { id: 1, src: '/assets-main/recipe-5.webp', alt: 'Signature Seafood Platter at The Saffron Lounge' },
    { id: 2, src: '/assets-main/recipe-6.webp', alt: 'Grilled Steak with Herb Butter' },
    { id: 3, src: '/assets-main/recipe-7.webp', alt: 'Fresh Pasta with Truffle Sauce' },
    { id: 4, src: '/assets-main/recipe-5.webp', alt: 'Artisan Sushi Selection' },
    { id: 5, src: '/assets-main/recipe-5.webp', alt: 'Gourmet Dessert Platter' },
    { id: 6, src: '/assets-main/recipe-6.webp', alt: 'Seasonal Vegetable Medley' },
  ];

  return (
    <section className={`${theme.spacing.sectionPadding} relative overflow-hidden bg-[#111115]`}>
      {/* Background Shapes */}
      
      <div className="absolute left-0 top-1/3 w-40 h-48 opacity-10 z-0 hidden lg:block">
        <Image
          src="/assets-main/shape-13.webp"
          alt="Decorative background shape"
          width={160}
          height={192}
          className="object-contain w-full h-full"
        />
      </div>
      <div className="absolute right-0 bottom-1/3 w-40 h-48 opacity-10 z-0 hidden lg:block">
        <Image
          src="/assets-main/shape-9.webp"
          alt="Decorative background shape"
          width={160}
          height={192}
          className="object-contain w-full h-full"
        />
      </div>
      
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 md:mb-8 leading-tight" style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}>
            <span className="block mb-2 sm:mb-3">Culinary</span>
            <span className="block">Masterpieces</span>
          </h2>
          <p className="text-xl text-[#bdbdbd] max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
            Discover the artistry behind each dish at The Saffron Lounge - from farm to table excellence
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item) => (
            <div 
              key={item.id} 
              className="group relative overflow-hidden rounded-lg aspect-square"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-16 h-16 rounded-full bg-[#f36b24] flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FoodGallery;
