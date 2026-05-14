"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '../../components/Common/Breadcrumb';

const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  const faqs = [
    {
      question: "What are your restaurant hours?",
      answer: "We are open Tuesday through Sunday from 5:00 PM to 10:00 PM. We are closed on Mondays. Our bar service is available until 11:00 PM."
    },
    {
      question: "Do you offer vegetarian and vegan options?",
      answer: "Yes, we have an extensive selection of vegetarian dishes and several vegan options. Our menu clearly marks these items, and our chefs can accommodate specific dietary requirements with advance notice."
    },
    {
      question: "Can I make a reservation online?",
      answer: "Yes, you can make reservations through our website using the 'Book a Table' page, or by calling us directly at (800) 216-2020. We recommend booking in advance, especially for weekend dining."
    },
    {
      question: "Do you have private dining options?",
      answer: "Yes, we offer several private dining spaces that can accommodate groups from 10 to 100 guests. Each space can be customized for your event with personalized menus and special arrangements."
    },
    {
      question: "What is your cancellation policy?",
      answer: "For reservations of 6 or more guests, we require 48 hours' notice for cancellations to avoid a cancellation fee. For larger events and private dining, different policies may apply."
    },
    {
      question: "Do you offer takeout or delivery?",
      answer: "We offer takeout service for our full menu during regular dining hours. Delivery is available through our partnered delivery services. Please check our website for specific delivery zones and hours."
    },
    {
      question: "Can I bring my own wine?",
      answer: "We have a comprehensive wine list, but you are welcome to bring your own special bottle for a corkage fee of $25. Please note that we do not allow outside alcoholic beverages other than wine."
    },
    {
      question: "Do you accommodate food allergies?",
      answer: "Absolutely. Please inform your server of any food allergies when ordering. Our kitchen staff is trained to handle allergen concerns and can provide detailed ingredient information."
    }
  ];

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      <Breadcrumb pathname="/faq" title="Frequently Asked Questions" />
      
      <section className="min-h-screen bg-[#111115] md:py-10 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-xl text-[#bdbdbd] text-center mb-16">
            Find answers to common questions about our restaurant, services, and policies
          </p>
          
          <div className="space-y-4 mb-16">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="bg-[#18181c] rounded-lg border border-[#23232a] overflow-hidden"
              >
                <button
                  className="w-full flex justify-between items-center p-6 text-left hover:bg-[#111115] transition-colors duration-300"
                  onClick={() => toggleAccordion(index)}
                >
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                    {faq.question}
                  </h3>
                  <svg 
                    className={`w-6 h-6 text-[#F36B24] transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <div 
                  className={`px-6 pb-6 transition-all duration-300 overflow-hidden ${
                    openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-[#bdbdbd] pl-2">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-[#18181c] rounded-lg p-8 md:p-12 border border-[#23232a] text-center">
            <h3 className="text-3xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
              Still Have Questions?
            </h3>
            <p className="text-xl text-[#bdbdbd] mb-8">
              Our team is here to help you with any additional questions or concerns
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link 
                href="/contact" 
                className="px-8 py-4 bg-[#F36B24] text-[#111115] font-bold rounded-md hover:bg-[#d1a05a] transition-colors duration-300"
              >
                Contact Us
              </Link>
              <Link 
                href="/book-a-table" 
                className="px-8 py-4 bg-transparent text-white border-2 border-[#23232a] font-bold rounded-md hover:border-[#F36B24] transition-colors duration-300"
              >
                Book a Table
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default FAQPage;
