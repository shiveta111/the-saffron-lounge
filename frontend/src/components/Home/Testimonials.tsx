'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { etarBellotaFont } from '../../app/etarBellotaFont';
import ResponsiveContainer from './ResponsiveContainer';
import { useLanguage } from '../../lib/language';

const Testimonials = () => {
  const { t } = useLanguage();
  const testimonials = [
    {
      id: 1,
      author: "Scott",
      reviewerDetails: "Local Guide·200 reviews·53 photos",
      timeAgo: "a month ago",
      text: "Found this hidden gem by accident @ like 2230 - OMG amazing what a find!!!!! This food and service is out of this world. The taste is to die for, the best Indian I've ever had and I'm old😂😂 AWESOME keep it up back soon. 😘",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: { noiseLevel: "Very quiet", groupSize: "2 people" }
    },
    {
      id: 2,
      author: "Aaron Boyes",
      reviewerDetails: "6 reviews·10 photos",
      timeAgo: "4 weeks ago",
      text: "Its hard to say that this wasn't the best curry I've had. Beautiful food and good service. Couldn't fault anything. Would highly recommend 👌",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: { groupSize: "Suitable for all group sizes", seatingType: "Indoor dining area, Bar area, Outdoor patio / terrace" }
    },
    {
      id: 4,
      author: "paige blell",
      reviewerDetails: "",
      timeAgo: "a week ago",
      text: "New A friend and I went for the last meal of our holiday we were immediately greeted by really lovely staff and seated, service was amazing they checked in regularly to ask us if we had any concerns which made us feel very welcomed and listened to, they explained they'd only been open for a couple months and were just super friendly, food was amazing and I would 100% recommend to anyone in the area it's worth it. Thank you for the lovely evening!",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: {}
    },
    {
      id: 5,
      author: "Shaloma",
      reviewerDetails: "3 reviews·3 photos",
      timeAgo: "a month ago",
      text: "Me and my friends came here for dinner on our holiday. The service was quick, efficient and friendly The ambience was perfect and inviting, exactly what we needed before going for drinks. The food was incredible, some of the best indian food i've had and at an incredible value (you wouldn't get this in the UK!!) Large variety of dishes and sides to choose from. The staff, Shankar and Harry suggested what they thought would work for our group, gave us a wide selection of food and topped up our chutney without us asking as they observed us enjoying it, we really appreciated this. Cannot recommend this restaurant enough. 10/10. They informed us they had not long opened - this was surprising as they were so good. Great people, great food and great service. AMAZING !!!!!!!!",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: {}
    },
    {
      id: 6,
      author: "Héctor Martín",
      reviewerDetails: "",
      timeAgo: "2 weeks ago",
      text: "We had an incredible meal at The Saffron Lounge. The moment we walked in, the atmosphere was warm and inviting, and the staff were welcoming and attentive throughout the evening. For our main courses, we had the Afghan chicken and the jalfrezi. The Afghan chicken was absolutely fantastic, with a beautiful creamy texture and perfectly balanced spices. It was tender and full of flavor. The jalfrezi was also a highlight, packed with fresh vegetables and a spicy kick that was just right. We finished the meal with the homemade mango and pistachio ice creams for dessert. They were the perfect end to our dinner creamy, refreshing, and tasting genuinely homemade. The Saffron Lounge offers an amazing culinary experience, from the delicious food to the wonderful service. We highly recommend it.",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: {}
    },
    {
      id: 7,
      author: "Andy Gaskill",
      reviewerDetails: "2 reviews·2 photos",
      timeAgo: "2 months ago",
      text: "The atmosphere and decor is fantastic. The food is really tasty with the right amount of spice and the portions are good. The cost was also very good, overall a great experience and we will be back.",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: { seatingType: "Indoor dining area, Outdoor patio / terrace" }
    },
    {
      id: 8,
      author: "Anonymous",
      reviewerDetails: "",
      timeAgo: "2 months ago",
      text: "Alright, so I finally tried that new Indian restaurant, and OMG, it was amazing! I had the spicy butter chicken, and it was the perfect amount of heat and flavor. The chili naan was also incredible – crispy, spicy, and totally addictive. And let's not forget about dessert! Their fresh desserts were the perfect way to end the meal, and the mango lassi was so refreshing. Seriously, everything was top-notch. But what really stood out was how friendly and kind the staff were. They made us feel so welcome and went above and beyond to make sure we had a great experience. If you're looking for a fantastic Indian meal with a warm, welcoming atmosphere, you HAVE to check this place out!",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: {}
    },
    {
      id: 9,
      author: "Veronique Depuydt",
      reviewerDetails: "1 review·2 photos",
      timeAgo: "3 months ago",
      text: "Best indian food ive had in a long while.-. Loads of choice on the menu and for us who don't eat meat truely spoilt for choice and flavour ! Also lesser known speciality dishes they make, i was delighted. In case you know vegan friends they cater for them too. All in all i totally recommend this place and hope to go back again sooooon.",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: { groupSize: "Suitable for all group sizes", seatingType: "Indoor dining area, Bar area, Outdoor patio / terrace, Booth seating" }
    },
    {
      id: 10,
      author: "Dorset Explorer",
      reviewerDetails: "Local Guide·45 reviews·91 photos",
      timeAgo: "6 months ago",
      text: "My honest review. We visited 2 Indian restaurants while here in Benidorm. And this by far, the best taste experience we've had. The staff were very helpful and attentive. Wouldn't recommend going anywhere else. Definitely be back here, if in the area.",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: { seatingType: "Indoor dining area, Outdoor patio / terrace" }
    },
    {
      id: 11,
      author: "Stuart Ives",
      reviewerDetails: "Local Guide·74 reviews·27 photos",
      timeAgo: "6 months ago",
      text: "The food here was absolutely outstanding. I had the hyderabadi curry. It was rich and earthy. Loads of ground cloves in there and my friend had the madras. Both were incredible. I will visit again next time im here. Even the red wine was perfect and a good pair to the curry and sometimes its very easy to get wine and curry wrong. Well done to the staff. Incredible",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: {}
    },
    {
      id: 12,
      author: "Deborah Barkas",
      reviewerDetails: "Local Guide·94 reviews·13 photos",
      timeAgo: "2 months ago",
      text: "First time in this restaurant but have to say this is the best Indian food I have experienced. I had the set meal, mixed starter, cooked to perfection. Main course of chicken dupiaza with rice. Ice cream for dessert. The service was excellent. Will definitely return",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: { groupSize: "Suitable for all group sizes" }
    },
    {
      id: 13,
      author: "Andrew Steventon",
      reviewerDetails: "Local Guide·203 reviews·330 photos",
      timeAgo: "3 months ago",
      text: "Just simply amazing! Probably one of the best meals we've had in all of ours stays in Benidorm. We found this place from recent reviews, so when passing called in and booked a table for that night. We arrived at 8pm the restaurant was probably 75% full and a table for two had been saved for us as requested. Straight away we ordered drinks (shorts and mixers) and pomppadoms and dips, the chutney one got the taste buds tingling. For starters we had Chilli Chicken (wow) and Chicken pakoras and for mains, Lamb Bhuna and Mango Chicken (the Lamb in the Bhuna was so tender and well spiced) also Lemon rice and butter naan and their special naan which was the best naan I've ever tasted. Overhaul a lovely meal made even better by the hosts, and with a final bill (including drinks) of only €62! Definitely a must if you like a curry when in Benidorm.",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: {}
    },
    {
      id: 15,
      author: "Sarah Tuffin",
      reviewerDetails: "Local Guide·43 reviews·14 photos",
      timeAgo: "2 months ago",
      text: "Absolutely stunning food so flavoursome and I'd go as far as saying it's the best curry I have had. Well worth a visit the staff are wonderful too. Thank you for a lovely evening in your restaurant.",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: { groupSize: "2 people", seatingType: "Indoor dining area" }
    },
    {
      id: 16,
      author: "Natalie Hammond",
      reviewerDetails: "Local Guide·35 reviews·4 photos",
      timeAgo: "5 months ago",
      text: "Came here last night for father inlaws birthday. Amazing loved the food, staff went above and beyond for us a Family of 24. The atmosphere was amazing, food delicious and very good prices. Thank you for making our night good. Would recommend",
      ratings: { food: 5, service: 5, atmosphere: 5 },
      metadata: {}
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Safely ensure testimonials is an array
  const safeTestimonials = Array.isArray(testimonials) ? testimonials : [];
  
  // Safety check for empty testimonials
  if (safeTestimonials.length === 0) {
    return null; // Don't render if no testimonials
  }

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev === safeTestimonials.length - 1 ? 0 : prev + 1));
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev === 0 ? safeTestimonials.length - 1 : prev - 1));
  };

  const goToTestimonial = (index: number) => {
    setCurrentIndex(index);
  };

  // Safely get current testimonial with fallback
  const current = safeTestimonials[currentIndex] || safeTestimonials[0];

  return (
    <section
      className={`relative bg-[#111115] overflow-hidden md:py-20 py-20 ${etarBellotaFont.variable}`}
    >
      {/* Decorative Background SVGs */}
      <Image
        src="/assets-main/shape-13.webp"
        alt="bg-shape"
        width={1920}
        height={300}
        className="hidden lg:block absolute left-0 top-1/4 opacity-10 pointer-events-none"
      />
      <Image
        src="/assets-main/shape-10.webp"
        alt="bg-shape"
        width={160}
        height={160}
        className="hidden lg:block absolute right-0 bottom-1/4 opacity-10 pointer-events-none"
      />

      <ResponsiveContainer>
        {/* Stars */}
        <div className="flex justify-center mb-2">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className="w-5 h-5 mx-0.5 text-[#f36b24]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>

        {/* Testimonial Content with Smooth Transitions */}
        <div
          key={currentIndex}
          className="animate-fade-in transition-all duration-500 ease-in-out relative"
        >
          {/* Left Arrow */}
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-[#18181c] hover:bg-[#f36b24] flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#f36b24] focus:ring-offset-2 focus:ring-offset-[#111115] z-10"
            aria-label={t('Previous testimonial')}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>

          {/* Right Arrow */}
          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-[#18181c] hover:bg-[#f36b24] flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#f36b24] focus:ring-offset-2 focus:ring-offset-[#111115] z-10"
            aria-label={t('Next testimonial')}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>

          {/* Title */}
          <h2
            className="text-white text-2xl sm:text-2xl md:text-2xl text-center font-bold mb-8"
            style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}
          >
            {t('What Our Guest Are Saying')}
          </h2>

          {/* Quote */}
          <blockquote
            className="text-white text-md text-center max-w-4xl mx-auto mb-10 leading-relaxed italic"
            style={{ fontFamily: 'var(--font-lato), sans-serif' }}
          >
            "{t(current?.text || '')}"
          </blockquote>

          {/* Author */}
          <div className="text-center mb-8">
            <p className="text-white text-xl sm:text-2xl font-bold">{current?.author || t('Anonymous')}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col items-center gap-6">
          {/* Pagination Dots */}
          <div className="flex gap-2">
            {safeTestimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-[#f36b24] scale-125'
                    : 'bg-[#444] hover:bg-[#666]'
                }`}
                aria-label={`${t('Go to testimonial')} ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* View More Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => window.open('https://share.google/tZL4bzT6c05RNXZW7', '_blank')}
            className="btn-sweep inline-block px-8 sm:px-10 py-1.5 bg-[#f36b24] text-white font-bold text-md sm:text-md  hover:bg-[#e55a1a] hover:translate-x-2 transition-all duration-300"
          >
            {t('Read More')}
          </button>
        </div>
      </ResponsiveContainer>
    </section>
  );
};

export default Testimonials;
