import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useLanguage} from "../../lib/language";

const InformativeSection = () => {
  const { t } = useLanguage();
  return (
    <section className="relative w-full md:min-h-screen min-h-0 flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/assets/img/blog/the_saffron.png"
          alt="Cakes Background"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/70" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col justify-center items-center flex-1 px-4 sm:px-6 md:px-8 lg:px-12 py-16 md:py-20">
        {/* Content Wrapper */}
        <div className="text-center mx-auto">
        <h2
  className="font-bold text-white mb-6 flex flex-col"
  style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}
>
  <span className="text-center block mb-1 md:mb-3 text-[1.2rem] sm:text-[1.5rem] tracking-wider text-[#F0681D]">
    {t('WELCOME TO')}
  </span>
  <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 md:mb-8 leading-tight capitalize">
  {t('The Saffron Lounge')}
  </span>
  <span className="block text-[#F0681D] text-2xl sm:text-3xl md:text-4xl font-light italic">
    {t('Modern India, Served Gracefully')}
  </span>
</h2>

<div className="space-y-6 md:mb-12 mb-5 max-w-3xl mx-auto">
  <p className="text-lg text-gray-300 leading-relaxed" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
    {t('Where contemporary design meets the spirit of Indian hospitality.')}
    <strong> {t('The Saffron Lounge')} </strong> {t('redefines fine dining through a perfect blend of rich flavours, elegant presentation, and soulful ambience.')}
  </p>
 
</div>

          

 

        

{/* CTA Buttons */}
<div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center w-full">
  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center w-[80%] sm:w-auto mx-auto">

    {/* View Menu Button */}
    <Link
      href="/menu/restaurant"
      className="flex items-center justify-center btn-sweep px-8 sm:px-10 py-1.5 bg-[#f36b24] text-white font-bold text-md sm:text-md rounded-full hover:bg-[#fff] hover:text-[#f36b24] hover:translate-x-2 transition-all duration-300"
      style={{ fontFamily: 'var(--font-lato), sans-serif' }}
    >
      {t('View Menu')}
    </Link>

    {/* Reserve Table Button */}
    <Link
      href="/reserve-table"
      className="flex items-center justify-center btn-sweep px-8 sm:px-10 py-1.5 bg-[#fff] text-[#f36b24] font-bold text-md sm:text-md rounded-full hover:text-[#fff] hover:bg-[#e55a1a] hover:translate-x-2 transition-all duration-300"
      style={{ fontFamily: 'var(--font-lato), sans-serif' }}
    >
      {t('Reserve Table')}
    </Link>
  </div>
</div>

        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="relative z-10 bg-gradient-to-r from-black/80 via-black/60 to-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="flex sm:flex-row justify-center gap-8 md:gap-12 items-center py-8 sm:py-6">
            {/* Contact Info */}
            <Link href={'/contact'} className="group transition-all duration-300">
              <div className="flex items-center gap-3 hover:scale-105 transition-transform duration-300">
                <div className="p-2 rounded-full bg-[#F0681D]/10 group-hover:bg-[#F0681D]/20 transition-colors duration-300">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={2} 
                    stroke="currentColor" 
                    className="w-5 h-5 md:w-6 md:h-6 text-[#F0681D]"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0-1.243 1.007-2.25 2.25-2.25h15a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75zm0 0l9.75 6.75 9.75-6.75" />
                  </svg>
                </div>
                <span className="text-white font-medium text-sm md:text-base group-hover:text-[#F0681D] transition-colors duration-300" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>{t('Contact us')}</span>
              </div>
            </Link>

            {/* Store Location */}
            <Link
              href='#'
              target='_blank'
              className="group transition-all duration-300"
            >
              <div className="flex items-center gap-3 hover:scale-105 transition-transform duration-300">
                <div className="p-2 rounded-full bg-[#F0681D]/10 group-hover:bg-[#F0681D]/20 transition-colors duration-300">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={2} 
                    stroke="currentColor" 
                    className="w-5 h-5 md:w-6 md:h-6 text-[#F0681D]"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 7.125 9.75 13.5 9.75 13.5s9.75-6.375 9.75-13.5c0-5.385-4.365-9.75-9.75-9.75zm0 12.75a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
                  </svg>
                </div>
                <span className="text-white font-medium text-sm md:text-base group-hover:text-[#F0681D] transition-colors duration-300" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>{t('Store Location')}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InformativeSection;
