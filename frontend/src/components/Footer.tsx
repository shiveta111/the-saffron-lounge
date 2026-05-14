"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '../lib/language';
import BlogSection from './Home/BlogSection';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isBlogRoute = pathname === '/blog' || pathname.startsWith('/blog/');
  return (
    <>
{!isBlogRoute && <BlogSection />}
    <footer className={`w-full bg-[#111115] text-white pt-0 pb-0 font-lato`} style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
      {/* Top section: Logo and Newsletter */}
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center justify-between px-4 sm:px-6 pt-16 sm:pt-20 pb-12 sm:pb-16 border-b border-[#23232a] relative">
        <div className="flex-1 flex items-center justify-center sm:justify-start mb-8 sm:mb-0">
          <div className="flex items-center gap-4">
            {/* <div className="w-16 h-16 bg-[#f36b24] rounded-full flex items-center justify-center">
              <span className="text-[#241c1b] font-bold text-2xl">S</span>
            </div> */}

<Image
                src="/assets-main/footer/saffron-logo.svg"
                alt="The Saffron Lounge Logo"
                width={250}
                height={250}
                className="object-contain w-24 h-24"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = '/assets-main/logo/saffron-logo.png';
                }}
              />            <span className="text-white font-bold text-2xl" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
              {t('Indian Restaurant')} <br></br>& {t('Cocktails')}
            </span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center sm:items-end w-full">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-white text-center sm:text-right">{t('Join Our Newsletter')}</h2>
          <form className="flex w-full max-w-sm sm:max-w-xl flex-col sm:flex-row gap-3 sm:gap-0">
            <input type="email" placeholder={t('Your Email Address')} className="flex-1 rounded-full sm:rounded-l-full sm:rounded-r-none px-6 py-4 bg-[#18181c] text-white placeholder:text-sm placeholder-[#666] focus:outline-none text-base sm:text-lg focus:border-[#F0681D] transition-colors duration-300 border border-[#23232a]" />
            <button type="submit" className="btn-sweep rounded-full sm:rounded-r-full sm:rounded-l-none px-8 sm:px-10 py-4 bg-[#F0681D] text-white text-base sm:text-lg font-bold transition hover:bg-[#111115] hover:text-[#F0681D] hover:translate-x-2 shadow-lg mt-3 sm:mt-0 ml-0 sm:-ml-2 border-2 border-[#F0681D]">
              {t('Subscribe')}
            </button>
          </form>
        </div>
      </div>
      
      {/* Middle section: Links and Info */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-8 sm:gap-12 border-b border-[#23232a]">
        {/* Quick Link */}
        <div>
          <h3 className="text-2xl font-bold mb-6 text-[#F0681D]">{t('Quick Links')}</h3>
          <ul className="space-y-3 text-base">
            <li><Link href="/" className="hover:text-[#F0681D] transition-colors duration-300">{t('Home')}</Link></li>
            <li>
              <span className="text-white font-semibold">{t('Menu')}</span>
              <ul className="mt-1 ml-3 space-y-1">
                <li><Link href="/menu/restaurant" className="text-[#bdbdbd] hover:text-[#F0681D] transition-colors duration-300 text-sm">{t('Restaurant Menu')}</Link></li>
                <li><Link href="/menu/explore-menu" className="text-[#bdbdbd] hover:text-[#F0681D] transition-colors duration-300 text-sm">{t('Explore Menu')}</Link></li>
              </ul>
            </li>
            <li><Link href="/reserve-table" className="hover:text-[#F0681D] transition-colors duration-300">{t('Reserve Table')}</Link></li>
            <li><Link href="/contact" className="hover:text-[#F0681D] transition-colors duration-300">{t('Contact')}</Link></li>
          </ul>
        </div>

        {/* Company Link */}
        <div>
          <h3 className="text-2xl font-bold mb-6 text-[#F0681D]">{t('Informative Links')}</h3>
          <ul className="space-y-3 text-base">
            <li><Link href="/about" className="hover:text-[#F0681D] transition-colors duration-300">{t('About Us')}</Link></li>
            {/* <li><Link href="/careers" className="hover:text-[#F0681D] transition-colors duration-300">Careers</Link></li> */}
            <li><Link href="/blog" className="hover:text-[#F0681D] transition-colors duration-300">{t('Blog')}</Link></li>
            {/* <li><Link href="/contact" className="hover:text-[#F0681D] transition-colors duration-300">{t('Contact')}</Link></li> */}
            <li><Link href="/" className="hover:text-[#F0681D] transition-colors duration-300">{t('Privacy Policy')}</Link></li>
            <li><Link href="/" className="hover:text-[#F0681D] transition-colors duration-300">{t('Terms & Conditions')}</Link></li>
          </ul>
        </div>

        {/* Working Hours */}
        <div>
          <h3 className="text-2xl font-bold mb-6 text-[#F0681D]">{t('Working Hours')}</h3>
          <ul className="space-y-3 text-base">
            <li><span className="text-[#F0681D] font-bold">{t('Tuesday- Sunday')}</span><br />
            <span className="text-[#bdbdbd]">14:30pm - 23:00pm</span><br />
            </li>
            <li><span className="text-[#F0681D] font-bold">{t('Monday')}</span><br /><span className="text-[#bdbdbd]">{t('Closed')}</span></li>
          </ul>
        </div>

        {/* Contacts */}
        <div>
          <h3 className="text-2xl font-bold mb-6 text-[#F0681D]">{t('Contact Us')}</h3>
          <ul className="space-y-4 text-base">
            <li className="flex items-start gap-4 hover:text-[#F0681D] transition-colors duration-300">
              <span className="inline-flex items-center justify-center w-6 h-6 mt-1">
                <svg fill="none" stroke="#F0681D" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2A19.72 19.72 0 0 1 3.08 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.68 2.34a2 2 0 0 1-.45 2.11l-1.27 1.27a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 1 2.11-.45c.74.32 1.53.55 2.34.68A2 2 0 0 1 22 16.92z"/></svg>
              </span>
              <a href="tel:+34640315693" className="hover:text-[#F0681D] transition-colors duration-300">+34 640 315 693</a>
            </li>
            <li className="flex items-start gap-4 hover:text-[#F0681D] transition-colors duration-300">
              <span className="inline-flex items-center justify-center w-6 h-6 mt-1">
                <svg fill="none" stroke="#F0681D" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5"><rect width="20" height="16" x="2" y="4" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="m22 6-10 7L2 6"/></svg>
              </span>
              <a href="mailto:thesaffronloungebenidorm@gmail.com" className="hover:text-[#F0681D] transition-colors duration-300">thesaffronloungebenidorm@gmail.com</a>
            </li>
            <li className="flex items-start gap-4 hover:text-[#F0681D] transition-colors duration-300">
              <span className="inline-flex items-center justify-center w-6 h-6 mt-1">
                <svg fill="none" stroke="#F0681D" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>
              </span>
              <a href="https://www.thesaffronlounge.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#F0681D] transition-colors duration-300">www.thesaffronlounge.com</a>
            </li>
            <li className="flex items-start gap-4 hover:text-[#F0681D] transition-colors duration-300 cursor-pointer">
              <span className="inline-flex items-center justify-center w-6 h-6 mt-1">
                <svg fill="none" stroke="#F0681D" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 12.414a4 4 0 10-1.414 1.414l4.243 4.243a1 1 0 001.414-1.414z"/><circle cx="11" cy="11" r="8"/></svg>
              </span>
              <span>{t('Av. del Mediterraneo, 51, 03503 Benidorm, Alicante, Spain')}</span>
            </li>
          </ul>
        </div>
      </div>
      
     {/* Bottom section: Copyright & Socials */}
<div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-6 sm:py-8 gap-4 sm:gap-0">
  <div className="text-[#bdbdbd] text-base sm:text-lg text-center sm:text-left">
    <span className="mr-2">
      &copy; {new Date().getFullYear()}{" "}
      <span className="text-[#F0681D] font-bold">The Saffron Lounge</span>.<br></br> {t('All rights reserved.')}
    </span>
  </div>
  
  <div className="flex gap-3 mt-4 sm:mt-0 items-center">
    {/* Facebook */}
    <a
      href="https://www.facebook.com/thesaffronlounge"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('Facebook')}
      className="w-10 h-10 flex items-center justify-center rounded-full border border-[#F0681D] bg-transparent hover:bg-[#F0681D] hover:translate-x-2 group transition-all duration-300"
    >
      <svg
        className="w-5 h-5 text-[#F0681D] group-hover:text-[#111115] transition-all duration-300"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M22.675 0h-21.35C.595 0 0 .595 0 1.326v21.348C0 23.406.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.406 24 22.674V1.326C24 .592 23.406 0 22.675 0z" />
      </svg>
    </a>

    {/* X (Twitter) */}
    <a
      href="https://twitter.com/thesaffronlounge"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('X')}
      className="w-10 h-10 flex items-center justify-center rounded-full border border-[#F0681D] bg-transparent hover:bg-[#F0681D] hover:translate-x-2 group transition-all duration-300"
    >
      <svg
        className="w-5 h-5 text-[#F0681D] group-hover:text-[#111115] transition-all duration-300"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </a>

    {/* LinkedIn */}
    <a
      href="https://www.linkedin.com/company/the-saffron-lounge"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('LinkedIn')}
      className="w-10 h-10 flex items-center justify-center rounded-full border border-[#F0681D] bg-transparent hover:bg-[#F0681D] hover:translate-x-2 group transition-all duration-300"
    >
      <svg
        className="w-5 h-5 text-[#F0681D] group-hover:text-[#111115] transition-all duration-300"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8.5h4V24h-4V8.5zm7.5 0h3.8v2.1h.1c.5-1 1.8-2.1 3.7-2.1 4 0 4.7 2.6 4.7 6v9.5h-4v-8.4c0-2-.1-4.5-2.7-4.5-2.7 0-3.1 2.1-3.1 4.3v8.6h-4V8.5z" />
      </svg>
    </a>
  </div>
</div>
    </footer>
    </>
  );
}
