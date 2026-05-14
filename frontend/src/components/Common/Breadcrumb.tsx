import React from 'react';
import Link from 'next/link';
import { generateBreadcrumbs } from '../../lib/breadcrumbUtils';
import { useLanguage } from '../../lib/language';

interface BreadcrumbProps {
  pathname: string;
  dynamicTitle?: string;
  title?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ pathname, dynamicTitle, title }) => {
  const { t } = useLanguage();
  // Safely handle undefined or null pathname
  const safePath = pathname || '/';
  const items = generateBreadcrumbs(safePath, dynamicTitle);

  if (!items || items.length === 0) return null;

  return (
    <div className="et-breadcrumb bg-[#18181c] py-16 md:py-20 pt-40 md:pt-52">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          {title && (
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
              {t(title)}
            </h1>
          )}
          <div className="flex flex-wrap items-center justify-center text-[#bdbdbd] text-md sm:text-base" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
            {items.map((item, index) => (
              <React.Fragment key={index}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="hover:text-[#f36b24] transition-colors duration-300 whitespace-nowrap"
                  >
                    {t(item.label)}
                  </Link>
                ) : (
                  <span className="text-[#F0681D] whitespace-nowrap">{t(item.label)}</span>
                )}
                {index < items.length - 1 && <span className="mx-2 sm:mx-3">/</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Breadcrumb;
