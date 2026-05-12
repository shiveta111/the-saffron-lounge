import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { theme } from '../../app/theme';
import { etarBellotaFont } from '../../app/etarBellotaFont';
import { useLanguage } from '../../lib/language';

const AboutSection = () => {
  const { t } = useLanguage();
  return (
    <section className={` bg-[#111115] ${etarBellotaFont.variable} relative overflow-hidden`}>
      {/* Background Shape */}
      <div className="absolute right-0 top-1/3 w-40 h-48 opacity-20 z-0 hidden lg:block">
        <Image
          src="/assets-main/shape-6.webp"
          alt="Decorative leafy branch"
          width={160}
          height={192}
          className="object-contain w-full h-full"
        />
      </div>

      <div className="max-w-full mx-auto relative z-10 about-gap-reduce">
        <div className="bg-lines grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Text content - First on mobile, second on desktop */}
          <div className="relative px-4 lg:py-6 lg:pr-16 order-1 lg:order-2 p-8">

            {/* Decorative green leafy branch - Hidden on mobile */}
            <div className="leaf-about absolute -right-4 top-0 w-24 sm:w-32 h-32 sm:h-40 opacity-90 hidden sm:block">
              <Image
                src="/assets-main/shape-6.webp"
                alt="Decorative leafy branch"
                width={128}
                height={160}
                className="object-contain w-full h-full"
              />
            </div>

            {/* Heading */}
       <h2
         className="font-bold text-white"
         style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}
       >
         <span className="block mb-1 text-[1.5rem] w-full sm:text-[1.5rem] md:text-[1.5rem] md:w-[65%]">
           {t('WELCOME TO THE SAFFRON LOUNGE')}
         </span>
         <span className="block mb-1 text-[#F0681D] text-2xl sm:text-3xl md:text-5xl">
           {t('Where Flavor Meets Elegance')}
         </span>
       </h2>

            {/* Paragraphs */}
            <div className="space-y-4 mb-8">
              <p className="text-md text-white leading-relaxed max-w-lg" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                {t("At The Saffron Lounge, we bring you a celebration of India's culinary heritage—timeless recipes reimagined with flair, tradition served with a touch of luxury. Every dish on our menu tells a story, carefully crafted with hand-ground spices, fresh ingredients, and authentic passion. From vibrant street-style starters to regal curries and tandoori feasts, prepare yourself for an experience that delights the senses and warms the soul.")}
              </p>
              <p className="text-md text-white leading-relaxed max-w-lg" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                {t("Whether you're here to savor a quick bite or to indulge in a grand feast, we welcome you to sit back, unwind, and let the flavors of India take you on a journey.")}
              </p>
            </div>

            {/* Button */}
            <Link href="/about" className="btn-sweep inline-block px-8 sm:px-10 py-1.5 bg-[#f36b24] text-white font-bold text-md sm:text-md  hover:bg-[#e55a1a] hover:translate-x-2 transition-all duration-300" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
             {t('Read More')}
            </Link>
          </div>

          {/* Image Section - Second on mobile, first on desktop */}
          <div className="relative order-2 lg:order-1 h-full">
            <div className="relative md:h-[600px]  h-[300px] rounded-lg overflow-hidden">
              <Image
                src="/assets/img/blog/about_img.png"
                alt="Master Chef at The Saffron Lounge"
                width={2560}
                height={1440}
                quality={100}
                className="w-full h-full object-cover shadow-2xl border-[2px] border-[#18171d] hidden md:block"
                priority
                unoptimized={true}
                style={{ 
                  objectPosition: '50% 50%',
                  transform: 'scale(1.02)'
                }}
                loading="eager"
              />

<Image
                src="/assets/img/blog/about_img.png"
                alt={t("Master Chef at The Saffron Lounge")}
                width={2560}
                height={1440}
                quality={100}
                className="w-full tt md:h-full h-[300px] object-cover shadow-2xl border-[2px] border-[#18171d] block md:hidden"
                priority
                unoptimized={true}
                style={{ 
                  objectPosition: '50% 50%',
                  transform: 'scale(1.02)'
                }}
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
