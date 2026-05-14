import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { theme } from '../../app/theme';
import { etarBellotaFont } from '../../app/etarBellotaFont';
import ResponsiveContainer from './ResponsiveContainer';
import { getImageUrl } from '../../lib/image-utils';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  image: string;
  bio?: string;
}

interface TeamProfilesProps {
  members: TeamMember[];
  title?: string;
  description?: string;
}

const TeamProfiles = ({
  members = [], // Default to empty array
  title = "Meet Our Culinary Team",
  description = "Meet the talented chefs and hospitality professionals who bring The Saffron Lounge to life",
}: TeamProfilesProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(3);

  // Safely ensure members is an array
  const safeMembers = Array.isArray(members) ? members : [];

  useEffect(() => {
    const updateItemsPerView = () => {
      if (typeof window === 'undefined') return; // SSR safety
      
      if (window.innerWidth < 768) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    updateItemsPerView();
    window.addEventListener('resize', updateItemsPerView);
    return () => window.removeEventListener('resize', updateItemsPerView);
  }, []);

  const maxIndex = Math.max(0, safeMembers.length - itemsPerView);
  
  // If no members, show empty state
  if (safeMembers.length === 0) {
    return (
      <section className={`py-16 relative bg-[#18171d] bg-lines ${etarBellotaFont.variable}`}>
        <ResponsiveContainer>
          <div className="text-center text-white">
            <h2 
              className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4" 
              style={{ fontFamily: 'var(--font-el-messiri)' }}
            >
              {title}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#bdbdbd]">
              Our team information will be available soon.
            </p>
          </div>
        </ResponsiveContainer>
      </section>
    );
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <section className={`py-16 relative bg-[#18171d] bg-lines  ${etarBellotaFont.variable}`}>
      {/* Background Shapes */}
      <div className="absolute left-0 top-1/4 w-32 h-32 opacity-10 hidden lg:block">
        <Image
          src="/assets-main/shape-9.webp"
          alt="Decorative shape"
          width={128}
          height={128}
          className="object-contain w-full h-full"
        />
      </div>
      <div className="absolute right-0 bottom-1/4 w-32 h-32 opacity-10 hidden lg:block">
        <Image
          src="/assets-main/shape-12.webp"
          alt="Decorative shape"
          width={128}
          height={128}
          className="object-contain w-full h-full"
        />
      </div>

      <ResponsiveContainer>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 sm:mb-8 lg:mb-10">
          <div className="mb-6 lg:mb-0">
            <h2 
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2" 
              style={{ fontFamily: 'var(--font-el-messiri)' }}
            >
              {title}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#bdbdbd]">{description}</p>
          </div>
        </div>

        {/* Slider Container */}
        <div className="relative px-8">
          {/* Team Members Slider */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${(currentIndex * 100) / itemsPerView}%)` }}
            >
              {safeMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex-shrink-0"
                  style={{ width: `${100 / itemsPerView}%` }}
                >
                  <div className="text-center">
                    <div className="relative w-64 h-64 mx-auto rounded-lg overflow-hidden border-4 border-[#18181c] shadow-lg">
                      {(() => {
                        const imageUrl = getImageUrl(member?.image) || '/assets/img/team/default-avatar.jpg';
                        const isExternalUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
                        return (
                          <Image
                            src={imageUrl}
                            alt={member?.name || 'Team member'}
                            fill
                            className="object-cover"
                            loading="lazy"
                            unoptimized={isExternalUrl}
                            onError={(e) => {
                              // Fallback to default image on error
                              const target = e.target as HTMLImageElement;
                              target.src = '/assets/img/team/default-avatar.jpg';
                            }}
                          />
                        );
                      })()}
                    </div>
                    <h3 className="mt-2 text-xl font-semibold text-white">{member?.name || 'Team Member'}</h3>
                    <p className="text-md text-gray-400">{member?.role || 'Staff'}</p>
                    {member?.bio && (
                      <p className="mt-2 text-md text-gray-500 px-4">{member.bio}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons - Hidden */}
          {/* <div className="absolute inset-y-0 left-0 flex items-center">
            <button
              onClick={prevSlide}
              className="p-3 rounded-full bg-[#18181c] text-white hover:bg-[#f36b24] transition-colors duration-300 text-xl border-2 border-[#f36b24]"
            >
              ‹
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center">
            <button
              onClick={nextSlide}
              className="p-3 rounded-full bg-[#18181c] text-white hover:bg-[#f36b24] transition-colors duration-300 text-xl border-2 border-[#f36b24]"
            >
              ›
            </button>
          </div> */}

          {/* Dots */}
          <div className="flex justify-center mt-4 space-x-2">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`w-3 h-3 rounded-full ${i === currentIndex ? 'bg-[#f36b24]' : 'bg-[#444]'} hover:bg-[#f36b24] transition-colors duration-300`}
              />
            ))}
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
};

export default TeamProfiles;
