"use client";

import React from 'react';

export default function PagesIndexPage() {
  return (
    <section className="min-h-screen bg-[#111115] md:py-10 py-10 flex items-center justify-center">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Pages Section</h1>
        <p className="text-xl text-[#bdbdbd] max-w-3xl mx-auto mb-12">
          This section contains additional pages accessible through the main navigation.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#18181c] p-8 rounded-lg border border-[#23232a] hover:border-[#F36B24] transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-4">About Us</h2>
            <p className="text-[#bdbdbd] mb-6">Learn about our story, values, and mission.</p>
            <a 
              href="/pages/about" 
              className="text-[#F36B24] font-bold hover:text-[#d1a05a] transition-colors duration-300 inline-flex items-center"
            >
              View Page
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
          
          <div className="bg-[#18181c] p-8 rounded-lg border border-[#23232a] hover:border-[#F36B24] transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-4">Our Team</h2>
            <p className="text-[#bdbdbd] mb-6">Meet the talented individuals behind our success.</p>
            <a 
              href="/pages/team" 
              className="text-[#F36B24] font-bold hover:text-[#d1a05a] transition-colors duration-300 inline-flex items-center"
            >
              View Page
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
          
          <div className="bg-[#18181c] p-8 rounded-lg border border-[#23232a] hover:border-[#F36B24] transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-4">Gallery</h2>
            <p className="text-[#bdbdbd] mb-6">Explore our culinary creations and restaurant ambiance.</p>
            <a 
              href="/pages/gallery" 
              className="text-[#F36B24] font-bold hover:text-[#d1a05a] transition-colors duration-300 inline-flex items-center"
            >
              View Page
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
