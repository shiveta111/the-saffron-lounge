'use client';

import Image from "next/image";
import RotatingTextCircle from "./RotatingTextCircle";
import { useLanguage } from '../../lib/language';

export default function HeroBanner() {
  const { t } = useLanguage();
  
  // Get translated text and split into letters for animation
  const artOfText = t('Art Of');
  const delightfulText = t('Delightful');
  const exquisiteText = t('EXQUISITE');
  const flavorsHeritageText = t('Flavors & Heritage');

  return (
    <section
      suppressHydrationWarning
      className="herobanner isolate h-[750px] md:h-[900px] lg:h-auto relative w-full overflow-hidden flex items-center justify-center pt-32 lg:pt-56 pb-15 lg:pb-20"
      style={{
        background: `url('/assets-main/hero-bg-shape.webp') center center / cover no-repeat, #000000`,
      }}
    >

{/* 🔸 Overlay Layer */}

      {/* You can change this to bg-black/60 for uniform tint */}
    
      {/* Girl Image (left, vertically centered) */}
      <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 z-20 align-middle vertical-center">
        <Image
          src="/assets-main/homebanner/left-img.jpg"
          alt="Elegant Dining Experience"
          width={260}
          height={320}
          className="rounded-2xl shadow-2xl object-cover border-4 border-[#18171d]"
        />
      </div>

      {/* Dish Image (right, vertically centered) */}
      <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 z-20">
        <Image
            src="/assets/img/blog/glass_2.jpg"
          alt="Signature Saffron Dish"
          width={180}
          height={140}
          className="rounded-2xl shadow-2xl object-cover border-4 border-[#18171d]"
        />
      </div>

      {/* Headings */}
      {/* <div
        className="hero-aesthetic absolute top-10 left-12 z-30 text-white flex"
        style={{ fontFamily: 'var(--font-el-messiri)' }}
      > */}
           <div
        className="hero-aesthetic absolute top-24 right-16 z-30 text-white flex"
        style={{ fontFamily: 'var(--font-el-messiri)' }}
      >
        {delightfulText.split('').map((letter, index) => (
          <span 
            key={index} 
            className="delightful-letter" 
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            {letter}
          </span>
        ))}
      </div>
      <div
        className="hero-joyof absolute top-10 right-16 z-30 text-white flex"
        style={{ fontFamily: 'var(--font-el-messiri)' }}
      >
        {artOfText.split('').map((letter, index) => (
          <span 
            key={index} 
            className={letter === ' ' ? '' : 'artof-letter'}
            style={{ 
              animationDelay: `${index * 0.1}s`,
              margin: letter === ' ' ? '0 8px' : '0'
            }}
          >
            {letter}
          </span>
        ))}
      </div>

      {/* Tastes & Traditions */}
      {/* <div
        className="hero-tastes absolute z-30 flex"
        style={{ fontFamily: 'var(--font-el-messiri)' }}
      >
        <span className="tastes-letter" style={{ animationDelay: '0s' }}>T</span>
        <span className="tastes-letter" style={{ animationDelay: '0.08s' }}>a</span>
        <span className="tastes-letter" style={{ animationDelay: '0.16s' }}>s</span>
        <span className="tastes-letter" style={{ animationDelay: '0.24s' }}>t</span>
        <span className="tastes-letter" style={{ animationDelay: '0.32s' }}>e</span>
        <span className="tastes-letter" style={{ animationDelay: '0.4s' }}>s</span>
        <span style={{ margin: '0 12px' }}> </span>
        <span className="tastes-letter" style={{ animationDelay: '0.48s' }}>&</span>
        <span style={{ margin: '0 12px' }}> </span>
        <span className="tastes-letter" style={{ animationDelay: '0.56s' }}>T</span>
        <span className="tastes-letter" style={{ animationDelay: '0.64s' }}>r</span>
        <span className="tastes-letter" style={{ animationDelay: '0.72s' }}>a</span>
        <span className="tastes-letter" style={{ animationDelay: '0.8s' }}>d</span>
        <span className="tastes-letter" style={{ animationDelay: '0.88s' }}>i</span>
        <span className="tastes-letter" style={{ animationDelay: '0.96s' }}>t</span>
        <span className="tastes-letter" style={{ animationDelay: '1.04s' }}>i</span>
        <span className="tastes-letter" style={{ animationDelay: '1.12s' }}>o</span>
        <span className="tastes-letter" style={{ animationDelay: '1.2s' }}>n</span>
        <span className="tastes-letter" style={{ animationDelay: '1.28s' }}>s</span>
      </div> */}

      {/* EXQUISITE Text (centered, above chef image) with letter-by-letter animation */}
  <div
  className="hero-delicious absolute left-1/2 bottom-[140px] -translate-x-1/2 z-40 flex"
  style={{ fontFamily: "var(--font-el-messiri)" }}
>
  {exquisiteText.split('').map((letter, index) => {
    // Alternate orange color pattern (positions 0, 2, 5, 7, 8)
    const orangePositions = [0, 2, 5, 7, 8];
    const isOrange = orangePositions.includes(index);
    
    return (
      <span 
        key={index}
        className={`exquisite-letter ${isOrange ? 'orange-letter' : ''}`}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        {letter}
      </span>
    );
  })}
</div>
      {/* Chef Image (center) */}
      <div className="relative z-0 flex flex-col items-center justify-center min-h-[35vh] md:min-h-[60vh] pt-5 md:pt-18 ">
        <div className="w-full lg:max-w-md xl:max-w-2xl 2xl:max-w-4xl z-0">
          {/* <Image ...existing code... /> */}
          {/* Video in hero section */}
          <video
            suppressHydrationWarning
            className="w-full h-auto md:h-[500px] object-cover rounded-lg"
            autoPlay
            muted
            loop
            playsInline
            style={{ maxHeight: '80vh' }}
          >
            <source src="/assets-main/about-section/about.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        {/* Cuisine & Drinks */}
        <span
          className="hero-cuisine block mt-10 text-white text-center"
          style={{ fontFamily: 'var(--font-el-messiri)' }}
        >
         {flavorsHeritageText}
        </span>
      </div>

      {/* Book Now Circle */}
      <div className="absolute right-4 bottom-4 md:right-8 md:bottom-8 z-40 flex flex-col items-center">
        {/* <Image
          src="/assets-main/text-2.webp"
          alt="Reserve Your Table at The Saffron Lounge"
          width={120}
          height={120}
          className="animate-spin-slow opacity-90"
          priority
        /> */}

{/* ✅ Rotating Circular “Book Now” Text */}
      <div className="absolute right-30 -bottom-3 md:right-8 md:bottom-8 z-40 flex flex-col items-center">
        <RotatingTextCircle
          text={t('• Book Now • Book Now • Book Now • Book Now')}
          fontSize={20}
          fontFamily= 'var(--font-el-messiri)'
          strokeColor="#ffffff"     // white outline
          //strokeWidth={0.8}         // thin and elegant
          animationDuration={15}
          className="opacity-60"
          centerIcon="→"
        />
      </div>

        {/* <Link
          href="/book-a-table"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-[#f36b24] text-white text-xl font-bold shadow-xl hover:bg-white hover:scale-110 hover:shadow-2xl transition-all duration-300"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link> */}
      </div>

      <style jsx global>{`
      .mainimage {
    width: -webkit-fill-available;
}
      

@media only screen and (min-width: 768px) and (max-width: 1024px) {

.herobanner {
  padding-bottom: 10% !important;
}

}
        @media (max-width: 576px) {

        
          .herobanner {
            padding: 5% 5%;
          }
        // }
        // @media (max-width: 480px) {
        //   .herobanner {
        //     padding: 18% 13%;
        //   }
        }
       .hero-aesthetic {
    font-size: 93px;
    top: 16%;
    left: 18%;
}
        .hero-joyof {
    font-size: 65px;
    top: 23%;
    right: 24%;
    z-index: 30;
}


.hero-cuisine {
    font-size: 92px;
    font-weight: 700 !important;
    margin-top: 1rem;
    margin-bottom: -8%;
}

     .hero-delicious {
          
            font: 900 clamp(3rem, 16vw, 14rem) / 1 "Abril Fatface", serif;
            letter-spacing: .06em;
            background: url(/assets/img/hero/hero-bg-shape.webp) center / cover no-repeat;
            background-clip: text !important;
            -webkit-text-fill-color: #f36b24 !important;
            text-transform: uppercase;
                font-size: 12em;
          -webkit-text-stroke: 3px rgba(255, 255, 255, .6) !important;
        }
        .hero-delicious span {
          font-size: 1em !important;
          font: 900 clamp(3rem, 16vw, 14rem) / 1 "Abril Fatface", serif;
          letter-spacing: .06em;
          background: url(/assets/img/hero/hero-bg-shape.webp) center / cover no-repeat;
          -webkit-background-clip: text !important;
          background-clip: text;
          -webkit-text-fill-color: #ffffff00 !important;
          text-transform: uppercase;
          -webkit-text-stroke: 3px #ffffffbd !important;
        }
        @media (max-width: 1199px) {
          .hero-aesthetic { font-size: 80px; }
          .hero-joyof { font-size: 44px; }
          .hero-delicious { font-size: 128px; }
          .hero-delicious span { font-size: 128px; }
          .hero-cuisine { font-size: 40px; }
        }
        @media (max-width: 991px) {
          .hero-aesthetic { font-size: 54px; left: 4vw; top: 1 vw; }
          .hero-joyof { font-size: 28px; right: 4vw; top: 10vw; }
          .hero-delicious { font-size: 72px; }
          .hero-delicious span { font-size: 72px; }
          .hero-cuisine { font-size: 26px; }
        }
        @media (max-width: 767px) {
          .hero-aesthetic {
              font-size: 52px;
              left: 7vw;
              top: 19%;
          }
          .hero-joyof {
                font-size: 42px;
                right: 8%;
                top: 30%;
          }
          .hero-delicious { font-size: 52px; }
          .hero-delicious span { font-size: 52px; }
          .hero-cuisine { font-size: 38px; }
        }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }

        /* Letter-by-letter reveal animation for EXQUISITE */
        @keyframes letterReveal {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Outline to Fill transition animation */
        @keyframes outlineToFill {
          0% {
            -webkit-text-fill-color: transparent;
            -webkit-text-stroke: 3px #f0681d;
          }
          100% {
            -webkit-text-fill-color: #f0681d;
            -webkit-text-stroke: 1px rgba(255, 255, 255, 0.3);
          }
        }

        .exquisite-letter {
          display: inline-block;
          font: 900 clamp(3rem, 16vw, 14rem) / 1 "Abril Fatface", serif;
          letter-spacing: .06em;
          background: url(/assets/img/hero/hero-bg-shape.webp) center / cover no-repeat;
          background-clip: text !important;
         
         
          text-transform: uppercase;
          animation: letterReveal 0.8s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
        }

.exquisite-letter {
  
  /* outline */
  animation: letterReveal 0.8s ease-out forwards;
}

.orange-letter {
  -webkit-text-fill-color: #ff7a00 !important; /* orange fill */
}
        /* Art Of letter animation */
        .artof-letter {
          display: inline-block;
          font-size: 65px;
          font-family: var(--font-el-messiri);
          color: white;
          animation: letterReveal 0.8s ease-out forwards;
          opacity: 0;
          transform: translateY(15px);
        }

        /* Delightful letter animation */
        .delightful-letter {
          display: inline-block;
          font-size: 93px;
          font-family: var(--font-el-messiri);
          color: white;
          animation: letterReveal 0.8s ease-out forwards;
          opacity: 0;
          transform: translateY(15px);
        }

        /* Tastes & Traditions letter animation */
        .tastes-letter {
          display: inline-block;
          font-size: 92px;
          font-family: var(--font-el-messiri);
          color: white;
          animation: letterReveal 0.8s ease-out forwards, outlineToFill 1.2s ease-out 0.8s forwards, textGlow 2s ease-in-out 2s infinite;
          opacity: 0;
          transform: translateY(15px);
        }

        /* Text glow animation for Tastes & Traditions */
        @keyframes textGlow {
          0%, 100% {
            text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
          }
          50% {
            text-shadow: 0 0 15px rgba(255, 255, 255, 0.6), 0 0 25px rgba(255, 255, 255, 0.4);
          }
        }

        /* Mobile responsive positioning adjustments */
        @media (max-width: 1199px) {
          .exquisite-letter { font-size: 128px; }
          .artof-letter { font-size: 44px; }
          .delightful-letter { font-size: 80px; }
          .tastes-letter { font-size: 40px; }
          .hero-joyof { top: 20%; right: 20%; }
        }
        @media (max-width: 991px) {
          .exquisite-letter { font-size: 72px; }
          .artof-letter { font-size: 28px; }
          .delightful-letter { font-size: 54px; }
          .tastes-letter { font-size: 26px; }
          .hero-joyof { top: 18%; right: 15%; }
          .hero-delicious { top: 75%; }
        }
        @media (max-width: 767px) {
          .exquisite-letter { font-size: 60px; }
          .artof-letter { font-size: 42px; }
          .delightful-letter { font-size: 52px; }
          .tastes-letter { font-size: 38px; }
          .hero-joyof { top: 25%; right: 10%; }
          .hero-delicious { top: 74%; }
          .hero-aesthetic { top: 15%; left: 5%; }
        }
        @media (max-width: 576px) {
          .exquisite-letter { font-size: 48px; }
          .artof-letter { font-size: 36px; }
          .delightful-letter { font-size: 36px; }
          .tastes-letter { font-size: 32px; }
          .hero-joyof { top: 22%; right: 8%; }
          .hero-delicious { top: 35%; }
          .hero-aesthetic { top: 10%; left: 2%; font-size: 32px; }
          .hero-cuisine { font-size: 28px; }
        }
        @media (max-width: 480px) {
          .exquisite-letter { font-size: 40px; }
          .artof-letter { font-size: 30px; }
          .delightful-letter { font-size: 40px; }
          .tastes-letter { font-size: 24px; }
          .hero-joyof { top: 18%; right:9%; }
          .hero-delicious { top: 66%; }
          .hero-aesthetic { top: 17%; left: 2%; font-size: 24px; }
          .hero-cuisine { font-size: 24px; }
        }

        /* Enhanced mobile animation performance */
        @media (max-width: 767px) {
          .exquisite-letter,
          .artof-letter,
          .delightful-letter,
          .tastes-letter {
            animation-duration: 0.6s;
            transform: translateY(10px);
          }
        }
      `}</style>
    </section>
  );
}
