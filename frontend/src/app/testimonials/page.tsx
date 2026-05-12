"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { etarBellotaFont } from '../../app/etarBellotaFont';
import Breadcrumb from '../../components/Common/Breadcrumb';
import { apiClient } from '../../lib/api-client';

interface Testimonial {
  id: number;
  client_name: string;
  designation?: string;
  feedback: string;
  rating?: number;
  photo?: string;
  company?: string;
  date_given?: string;
  created_at: string;
}

const STATIC_TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    client_name: 'Natalie Hammond',
    designation: 'Local Guide · 35 reviews',
    feedback: 'Came here last night for father inlaws birthday. Amazing loved the food, staff went above and beyond for us a Family of 24. The atmosphere was amazing, food delicious and very good prices. Thank you for making our night good. Would recommend',
    rating: 5,
    date_given: '5 months ago',
    created_at: '',
  },
  {
    id: 2,
    client_name: 'Scott',
    designation: 'Local Guide · 209 reviews',
    feedback: 'Found this hidden gem by accident @ like 2230 - OMG amazing what a find!!!!! This food and service is out of this world. The taste is to die for, the best Indian I\'ve ever had and I\'m old 😂😂 AWESOME keep it up back soon.',
    rating: 5,
    date_given: '8 months ago',
    created_at: '',
  },
  {
    id: 3,
    client_name: 'Sarah Tuffin',
    designation: 'Local Guide · 43 reviews',
    feedback: 'Absolutely stunning food so flavoursome and I\'d go as far as saying it\'s the best curry I have had. Well worth a visit the staff are wonderful too. Thank you for a lovely evening in your restaurant.',
    rating: 5,
    date_given: '2 months ago',
    created_at: '',
  },
  {
    id: 4,
    client_name: 'Héctor Martín',
    designation: 'Local Guide · 93 reviews',
    feedback: 'We had an incredible meal at The Saffron Lounge. The moment we walked in, the atmosphere was warm and inviting, and the staff were welcoming and attentive throughout the evening. The Afghan chicken was absolutely fantastic, with a beautiful creamy texture and perfectly balanced spices. The jalfrezi was also a highlight, packed with fresh vegetables and a spicy kick that was just right. We finished with homemade mango and pistachio ice creams — the perfect end to our dinner. We highly recommend it.',
    rating: 5,
    date_given: '7 months ago',
    created_at: '',
  },
  {
    id: 5,
    client_name: 'BJ Yorkshire',
    designation: 'Local Guide · 63 reviews',
    feedback: 'The food and the service was impeccable 👌 absolutely fantastic and incredible. The 5 stars are true to its name. Definitely worth a visit. What we had for 4 of us was all fantastic!',
    rating: 5,
    date_given: '2 months ago',
    created_at: '',
  },
  {
    id: 6,
    client_name: 'Andrew Steventon',
    designation: 'Local Guide · 203 reviews',
    feedback: 'Just simply amazing! Probably one of the best meals we\'ve had in all of ours stays in Benidorm. For starters we had Chilli Chicken (wow) and Chicken pakoras and for mains, Lamb Bhuna and Mango Chicken. The Lamb in the Bhuna was so tender and well spiced. Their special naan was the best naan I\'ve ever tasted. A final bill of only €62! Definitely a must if you like a curry when in Benidorm.',
    rating: 5,
    date_given: '3 months ago',
    created_at: '',
  },
  {
    id: 7,
    client_name: 'Deborah Barkas',
    designation: 'Local Guide · 94 reviews',
    feedback: 'First time in this restaurant but have to say this is the best Indian food I have experienced. I had the set meal, mixed starter, cooked to perfection. Main course of chicken dupiaza with rice. Ice cream for dessert. The service was excellent. Will definitely return.',
    rating: 5,
    date_given: '2 months ago',
    created_at: '',
  },
  {
    id: 8,
    client_name: 'Stuart Ives',
    designation: 'Local Guide · 74 reviews',
    feedback: 'The food here was absolutely outstanding. I had the hyderabadi curry. It was rich and earthy. Loads of ground cloves in there and my friend had the madras. Both were incredible. Even the red wine was perfect and a good pair to the curry. Well done to the staff. Incredible.',
    rating: 5,
    date_given: '6 months ago',
    created_at: '',
  },
  {
    id: 9,
    client_name: 'Dorset Explorer',
    designation: 'Local Guide · 45 reviews',
    feedback: 'My honest review. We visited 2 Indian restaurants while here in Benidorm. And this by far, the best taste experience we\'ve had. The staff were very helpful and attentive. Wouldn\'t recommend going anywhere else. Definitely be back here, if in the area.',
    rating: 5,
    date_given: '6 months ago',
    created_at: '',
  },
  {
    id: 10,
    client_name: 'Veronique Depuydt',
    designation: '1 review · 2 photos',
    feedback: 'Best indian food ive had in a long while. Loads of choice on the menu and for us who don\'t eat meat truely spoilt for choice and flavour! Also lesser known speciality dishes they make, i was delighted. They cater for vegans too. All in all i totally recommend this place and hope to go back again sooooon.',
    rating: 5,
    date_given: '3 months ago',
    created_at: '',
  },
];

const TestimonialsPage = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true);

        const response = await apiClient.getTestimonials({
          limit: 100,
        });

        if (response.success && response.data) {
          const testimonialData = response.data.testimonials || [];
          setTestimonials(testimonialData);
        } else {
          setTestimonials([]);
        }
      } catch (err: any) {
        console.error('Failed to fetch testimonials, using static data:', err);
        setTestimonials(STATIC_TESTIMONIALS);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  // Get photo URL or fallback
  const getPhotoUrl = (testimonial: Testimonial): string => {
    if (testimonial.photo) return testimonial.photo;
    // Return placeholder or default avatar
    return '/assets/img/testimonial/testimonial-1.webp';
  };

  // Get name (client_name)
  const getName = (testimonial: Testimonial): string => {
    return testimonial.client_name || 'Anonymous';
  };

  // Get role (designation)
  const getRole = (testimonial: Testimonial): string => {
    return testimonial.designation || testimonial.company || 'Customer';
  };

  // Get rating (default to 5 if not provided)
  const getRating = (testimonial: Testimonial): number => {
    return testimonial.rating || 5;
  };

  return (
    <>
      <Breadcrumb pathname="/testimonials" title="Customer Testimonials" />
      <section className={`min-h-screen bg-[#111115] md:py-10 py-10 ${etarBellotaFont.variable}`}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xl text-[#bdbdbd] max-w-3xl mx-auto">
              Discover what our valued customers have to say about their experiences at The Saffron Lounge
            </p>
          </div>

{loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#F36B24]"></div>
              <p className="text-[#bdbdbd] mt-4">Loading testimonials...</p>
            </div>
          ) : testimonials.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#bdbdbd] text-lg">No testimonials found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => {
                const name = getName(testimonial);
                const role = getRole(testimonial);
                const rating = getRating(testimonial);
                const photoUrl = getPhotoUrl(testimonial);

                return (
                  <div
                    key={testimonial.id}
                    className="bg-[#18181c] p-8 rounded-lg border border-[#23232a] hover:border-[#F36B24] transition-all duration-300 group"
                  >
                    <div className="flex items-center mb-6">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-5 h-5 ${i < rating ? 'text-[#F36B24]' : 'text-[#444]'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    
                    <p className="text-[#bdbdbd] text-lg mb-6 italic">"{testimonial.feedback}"</p>
                    
                    <div className="flex items-center gap-4">
                      {photoUrl && (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
                          <Image
                            src={photoUrl}
                            alt={name}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.src = '/assets-main/logo/saffron-logo.png';
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <h4 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                          {name}
                        </h4>
                        <p className="text-[#F36B24]">{role}</p>
                        {testimonial.company && (
                          <p className="text-[#bdbdbd] text-sm">{testimonial.company}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default TestimonialsPage;
