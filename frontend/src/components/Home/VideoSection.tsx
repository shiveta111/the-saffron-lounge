import React, { useState } from 'react';
import Image from 'next/image';
import { etarBellotaFont } from '../../app/etarBellotaFont';

const VideoSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <section className={`w-full relative ${etarBellotaFont.variable} bg-[#111115]`}>
      {/* Background decorations */}
      <div className="absolute inset-0 z-0">
        <div className="absolute left-0 top-1/4 w-32 h-32 opacity-10 hidden lg:block">
          <Image
            src="/assets-main/shape-1.webp"
            alt="Decorative shape"
            width={128}
            height={128}
            className="object-contain w-full h-full"
          />
        </div>
        <div className="absolute right-0 bottom-1/4 w-32 h-32 opacity-10 hidden lg:block">
          <Image
            src="/assets-main/shape-3.webp"
            alt="Decorative shape"
            width={128}
            height={128}
            className="object-contain w-full h-full"
          />
        </div>
      </div>

      <div className="max-w-full mx-auto relative z-10">
        {/* Main Video Banner */}
        <div className="relative w-full h-[500px] sm:h-[600px] md:h-[700px] lg:h-[750px] rounded-lg overflow-hidden">
          {/* Background Video Image */}
          <Image
            src="/assets-main/video-bg.webp"
            alt="Restaurant scene background"
            fill
            className="object-cover object-[center_top]"
            priority
          />

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>

          {/* Central Play Button and Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              {/* Play Button */}
              <div
                className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center mb-4 hover:scale-110 hover:translate-x-2 transition-all duration-300 cursor-pointer group"
                onClick={openModal}
              >
                <div className="w-0 h-0 border-l-[20px] md:border-l-[24px] border-l-[#111115] border-t-[12px] md:border-t-[14px] border-t-transparent border-b-[12px] md:border-b-[14px] border-b-transparent ml-2 transition-all duration-300"></div>
              </div>

              {/* Play Text */}
              <h3
                className="text-2xl md:text-3xl font-bold text-white cursor-pointer"
                style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}
                onClick={openModal}
              >
                Play Video
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
          <div className="relative w-full max-w-4xl">
            <button
              className="absolute -top-12 right-0 text-white text-3xl hover:text-gray-300 transition-colors"
              onClick={closeModal}
            >
              &times;
            </button>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {/* Dummy Video Placeholder */}
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center mb-4 mx-auto">
                    <div className="w-0 h-0 border-l-[20px] md:border-l-[24px] border-l-[#111115] border-t-[12px] md:border-t-[14px] border-t-transparent border-b-[12px] md:border-b-[14px] border-b-transparent ml-2"></div>
                  </div>
                  <p className="text-white text-2xl md:text-3xl font-bold" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>Restaurant Video</p>
                  <p className="text-gray-400 mt-2" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>A beautiful dining experience awaits you</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default VideoSection;
