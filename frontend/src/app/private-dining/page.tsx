"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Breadcrumb from '../../components/Common/Breadcrumb';

const PrivateDiningPage = () => {
  const venues = [
    {
      id: 1,
      name: "The Grand Room",
      capacity: "Up to 50 guests",
      image: "/assets/img/gallery/gallery-4.webp",
      description: "Elegant space perfect for corporate events and wedding receptions",
      features: ["Full catering service", "Audiovisual equipment", "Private bar", "Dedicated event coordinator"]
    },
    {
      id: 2,
      name: "The Garden Terrace",
      capacity: "Up to 30 guests",
      image: "/assets/img/gallery/gallery-5.webp",
      description: "Beautiful outdoor setting for intimate gatherings and celebrations",
      features: ["Seasonal decorations", "Heating for cooler months", "Full catering service", "Exclusive access"]
    },
    {
      id: 3,
      name: "The Executive Suite",
      capacity: "Up to 12 guests",
      image: "/assets/img/gallery/gallery-6.webp",
      description: "Luxurious private dining experience with personalized service",
      features: ["Chef's tasting menu", "Premium wine selection", "Private entrance", "Personalized service"]
    }
  ];

  return (
    <>
      <Breadcrumb pathname="/private-dining" title="Private Dining" />
      
      <section className="min-h-screen bg-[#111115] md:py-10 py-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
              Exclusive Private Venues
            </h2>
            <p className="text-xl text-[#bdbdbd] max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
              Experience the pinnacle of private dining in our carefully designed spaces,
              each offering a unique setting for your special occasions
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                Private Dining at Its Finest
              </h3>
              <p className="text-[#bdbdbd] mb-6" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                Our private dining spaces offer an intimate setting for business meetings,
                wedding celebrations, birthday parties, and other special occasions.
                Each venue is designed to provide the perfect ambiance for your event.
              </p>
              <p className="text-[#bdbdbd] mb-8" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                Our dedicated events team will work with you to customize every detail,
                from menu selection to décor, ensuring your event is nothing short of extraordinary.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F36B24] bg-opacity-10 flex items-center justify-center mr-4 mt-1">
                    <svg className="w-4 h-4 text-[#F36B24]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>Personalized menu planning with our executive chef</p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F36B24] bg-opacity-10 flex items-center justify-center mr-4 mt-1">
                    <svg className="w-4 h-4 text-[#F36B24]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>Dedicated event coordinator for seamless planning</p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F36B24] bg-opacity-10 flex items-center justify-center mr-4 mt-1">
                    <svg className="w-4 h-4 text-[#F36B24]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>Flexible arrangements for any type of celebration</p>
                </div>
              </div>
              
              <button className="px-8 py-4 bg-[#F36B24] text-[#111115] font-bold rounded-md hover:bg-[#d1a05a] transition-colors duration-300">
                Request Booking
              </button>
            </div>
            
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <Image
                src="/assets/img/gallery/gallery-1.webp"
                alt="Private Dining Experience"
                fill
                className="object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = '/assets-main/recipe-5.webp';
                }}
              />
            </div>
          </div>
          
          <div className="mb-20">
            <h3 className="text-3xl font-bold text-white mb-12 text-center" style={{ fontFamily: 'var(--font-el-messiri)' }}>
              Our Private Venues
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {venues.map((venue) => (
                <div 
                  key={venue.id}
                  className="bg-[#18181c] rounded-lg overflow-hidden border border-[#23232a] hover:border-[#F36B24] transition-all duration-300 group"
                >
                  <div className="relative h-56">
                    <Image
                      src={venue.image}
                      alt={venue.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.src = '/assets-main/recipe-5.webp';
                      }}
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-xl font-bold text-white group-hover:text-[#F36B24] transition-colors duration-300" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                        {venue.name}
                      </h4>
                      <span className="text-[#F36B24]">{venue.capacity}</span>
                    </div>
                    <p className="text-[#bdbdbd] mb-6" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>{venue.description}</p>
                    <ul className="space-y-2 mb-6">
                      {venue.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="w-4 h-4 text-[#F36B24] mt-1 mr-2 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button className="w-full py-3 bg-[#18181c] text-white border border-[#23232a] hover:bg-[#F36B24] hover:text-[#111115] hover:border-[#F36B24] transition-all duration-300 font-bold rounded-md">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-[#18181c] rounded-lg p-8 md:p-12 border border-[#23232a] text-center">
            <h3 className="text-3xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
              Plan Your Perfect Event
            </h3>
            <p className="text-xl text-[#bdbdbd] mb-8 max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
              Let our events team help you create an unforgettable experience tailored to your specific needs
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <button className="px-8 py-4 bg-[#F36B24] text-[#111115] font-bold rounded-md hover:bg-[#d1a05a] transition-colors duration-300">
                Contact Events Team
              </button>
              <button className="px-8 py-4 bg-transparent text-white border-2 border-[#23232a] font-bold rounded-md hover:border-[#F36B24] transition-colors duration-300">
                Download Brochure
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default PrivateDiningPage;
