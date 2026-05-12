"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '../../components/Common/Breadcrumb';

const WineListPage = () => {
  const [activeCategory, setActiveCategory] = useState('Red Wines');
  
  const categories = ['Red Wines', 'White Wines', 'Sparkling', 'Dessert Wines'];
  
  const wineList = {
    'Red Wines': [
      { id: 1, name: 'Cabernet Sauvignon', year: '2019', region: 'Napa Valley, USA', price: '$85', description: 'Full-bodied with notes of blackcurrant and oak' },
      { id: 2, name: 'Pinot Noir', year: '2020', region: 'Burgundy, France', price: '$92', description: 'Elegant with cherry and spice notes' },
      { id: 3, name: 'Merlot', year: '2018', region: 'Bordeaux, France', price: '$78', description: 'Smooth and velvety with plum flavors' },
      { id: 4, name: 'Malbec', year: '2021', region: 'Mendoza, Argentina', price: '$65', description: 'Rich and fruity with dark berry notes' },
    ],
    'White Wines': [
      { id: 5, name: 'Chardonnay', year: '2020', region: 'Sonoma, USA', price: '$72', description: 'Buttery with vanilla and apple notes' },
      { id: 6, name: 'Sauvignon Blanc', year: '2021', region: 'Marlborough, New Zealand', price: '$68', description: 'Crisp and refreshing with citrus flavors' },
      { id: 7, name: 'Riesling', year: '2019', region: 'Mosel, Germany', price: '$75', description: 'Delicate with floral and mineral notes' },
      { id: 8, name: 'Pinot Grigio', year: '2021', region: 'Veneto, Italy', price: '$62', description: 'Light and crisp with pear and melon flavors' },
    ],
    'Sparkling': [
      { id: 9, name: 'Champagne', year: '2015', region: 'Reims, France', price: '$120', description: 'Classic brut with fine bubbles and toast notes' },
      { id: 10, name: 'Prosecco', year: '2021', region: 'Veneto, Italy', price: '$55', description: 'Light and fruity with apple and pear notes' },
      { id: 11, name: 'Cava', year: '2020', region: 'Catalonia, Spain', price: '$48', description: 'Traditional method with citrus and nutty flavors' },
    ],
    'Dessert Wines': [
      { id: 12, name: 'Port', year: '2010', region: 'Douro, Portugal', price: '$88', description: 'Rich and sweet with berry and chocolate notes' },
      { id: 13, name: 'Sauternes', year: '2016', region: 'Bordeaux, France', price: '$95', description: 'Lusciously sweet with honey and apricot flavors' },
    ]
  };

  return (
    <>
      <Breadcrumb pathname="/wine-list" title="Wine List" />
      
      <section className="min-h-screen bg-[#111115] md:py-10 py-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <p className="text-xl text-[#bdbdbd] max-w-3xl mx-auto text-center mb-16" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
            Discover our curated selection of premium wines from around the world
          </p>
          
          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-3 rounded-full text-lg font-bold transition-all duration-300 ${
                  activeCategory === category
                    ? 'bg-[#F36B24] text-[#111115]'
                    : 'bg-[#18181c] text-white hover:bg-[#23232a]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          
          {/* Wine List */}
          <div className="bg-[#18181c] rounded-lg border border-[#23232a] overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8">
              {wineList[activeCategory as keyof typeof wineList].map((wine) => (
                <div 
                  key={wine.id}
                  className="flex flex-col sm:flex-row gap-6 p-6 bg-[#111115] rounded-lg border border-[#23232a] hover:border-[#F36B24] transition-all duration-300"
                >
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-lg bg-[#23232a] flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#F36B24]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-el-messiri)' }}>{wine.name}</h3>
                      <span className="text-xl font-bold text-[#F36B24]">{wine.price}</span>
                    </div>
                    <p className="text-[#bdbdbd] mb-2" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>{wine.year} | {wine.region}</p>
                    <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>{wine.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <button className="px-8 py-4 bg-[#F36B24] text-[#111115] font-bold rounded-md hover:bg-[#d1a05a] transition-colors duration-300">
              Download Full Wine List
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default WineListPage;
