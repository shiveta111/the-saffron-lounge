import React from 'react';
import { theme } from '../../app/theme';
import { etarBellotaFont } from '../../app/etarBellotaFont';

const FeatureHighlights = () => {
  const features = [
    {
      title: "Fresh Products",
      description: "We use only the finest and freshest ingredients in our dishes.",
      icon: (
        <svg className="w-16 h-16 text-[#F36B24]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )
    },
    {
      title: "Skilled Chefs",
      description: "Our team of expert chefs brings years of experience to your plate.",
      icon: (
        <svg className="w-16 h-16 text-[#F36B24]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-3m0 0v-3m0 3h3m-3 0h-3" />
        </svg>
      )
    },
    {
      title: "Best Bar",
      description: "Our bar offers an extensive selection of cocktails and fine wines.",
      icon: (
        <svg className="w-16 h-16 text-[#F36B24]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-3-12V4.5a2.25 2.25 0 0 1 2.25-2.25h3a2.25 2.25 0 0 1 2.25 2.25V6m-6 12V6m-3 12V6m-6 0V4.5A2.25 2.25 0 0 1 4.5 2.25H7.5a2.25 2.25 0 0 1 2.25 2.25V6" />
        </svg>
      )
    },
    {
      title: "Vegan Cuisine",
      description: "Delicious plant-based options for health-conscious diners.",
      icon: (
        <svg className="w-16 h-16 text-[#F36B24]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      )
    }
  ];

  return (
    <section className={`${theme.spacing.sectionPadding} bg-[#18181c] ${etarBellotaFont.variable}`}>
      <div className="max-w-full mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-[#111115] p-8 rounded-lg text-center hover:bg-[#1a1a1f] transition-all duration-300 border border-[#23232a] group"
            >
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-full bg-[#1a1a1f] group-hover:bg-[#23232a] transition-all duration-300">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}>{feature.title}</h3>
              <p className="text-[#bdbdbd] text-lg leading-relaxed" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureHighlights;
