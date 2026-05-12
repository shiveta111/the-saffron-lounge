import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { theme } from '../../app/theme';
import { etarBellotaFont } from '../../app/etarBellotaFont';

const FoodCategories = () => {
  const categories = [
    { id: 1, name: 'Salad Bowl', image: '/assets-main/cat-1.webp' },
    { id: 2, name: 'Chakan Roll', image: '/assets-main/cat-2.webp' },
    { id: 3, name: 'Lobsters', image: '/assets-main/cat-3.webp' },
    { id: 4, name: 'Italian Burger', image: '/assets-main/cat-4.webp' },
    { id: 5, name: 'Cappuccino Arabica', image: '/assets-main/cat-5.webp' },
  ];

  return (
    <section className={`${theme.spacing.sectionPadding} bg-lines relative overflow-hidden bg-[#111115]`}>
      {/* Background Shape */}
      {/* <div className="absolute right-0 top-1/4 w-32 h-32 hidden lg:block">
        <Image
          src="/assets-main/cat-shape.webp"
          alt="Decorative category shape"
          width={128}
          height={128}
          className="object-contain w-full h-full"
        />
      </div> */}

      <div className="relative z-20 max-w-screen-2xl mx-auto px-4 sm:px-6">

        {/* Heading */}
        <div className="text-center sm:mb-8 md:mb-20">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight"
            style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}
          >
            Choose Your Best Food <br className="hidden sm:block" />
            From Categories
          </h2>
        </div>

        {/* Category Items */}
        <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
          {categories.map((category) => (
            <Link
              key={category.id}
              href="/shop"
              className="text-center group w-[120px] sm:w-[140px] md:w-[160px]"
            >
              {/* Circular Image with Background Shape */}
              <div className="mb-4 flex justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src="/assets-main/cat-shape.webp"
                    alt=""
                    width={944}
                    height={944}
                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain"
                    style={{ width: '59rem', height: '59rem' }}
                  />
                </div>
                <Image
                  src={category.image}
                  alt={category.name}
                  width={160}
                  height={160}
                  className="rounded-full object-cover w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 border-4 border-transparent group-hover:border-[#f36b24] transition-all duration-300 relative z-10"
                />
              </div>

              {/* Name */}
              <h3
                className="font-lato text-white text-base sm:text-lg font-semibold"
              >
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FoodCategories;
