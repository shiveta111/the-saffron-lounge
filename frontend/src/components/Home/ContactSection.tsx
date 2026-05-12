import React from 'react';
import { theme } from '../../app/theme';
import { etarBellotaFont } from '../../app/etarBellotaFont';

const ContactSection = () => {
  return (
    <section className={`${theme.spacing.sectionPadding} relative bg-[#111115] ${etarBellotaFont.variable}`}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left Side - Contact Information */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight" style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}>
              Get In Touch
            </h2>
            
            <p className="text-md text-[#bdbdbd] mb-12 leading-relaxed" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
              We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
            
            {/* Contact Details */}
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#f36b24] bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#f36b24]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}>Our Location</h3>
                  <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>250 Park Avenue, Suite 1800, New York, NY 10017</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#f36b24] bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#f36b24]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}>Phone Number</h3>
                  <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>(212) 555-0198</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#f36b24] bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#f36b24]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}>Email Address</h3>
                  <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>reservations@saffronlounge.nyc</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Side - Contact Form */}
          <div className="bg-[#18181c] p-8 rounded-lg border border-[#23232a]">
            <h3 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}>
              Send Message
            </h3>
            
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-md font-medium text-white mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    className="w-full px-4 py-3 bg-[#111115] border border-[#333] rounded-lg text-white placeholder:text-sm placeholder-[#666] focus:border-[#f36b24] focus:outline-none transition-colors duration-300"
                    placeholder="Enter your first name"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-md font-medium text-white mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    className="w-full px-4 py-3 bg-[#111115] border border-[#333] rounded-lg text-white placeholder:text-sm placeholder-[#666] focus:border-[#f36b24] focus:outline-none transition-colors duration-300"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-md font-medium text-white mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full px-4 py-3 bg-[#111115] border border-[#333] rounded-lg text-white placeholder:text-sm placeholder-[#666] focus:border-[#f36b24] focus:outline-none transition-colors duration-300"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-md font-medium text-white mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  className="w-full px-4 py-3 bg-[#111115] border border-[#333] rounded-lg text-white placeholder:text-sm placeholder-[#666] focus:border-[#f36b24] focus:outline-none transition-colors duration-300"
                  placeholder="Enter subject"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-md font-medium text-white mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  className="w-full px-4 py-3 bg-[#111115] border border-[#333] rounded-lg text-white placeholder:text-sm placeholder-[#666] focus:border-[#f36b24] focus:outline-none transition-colors duration-300 resize-none"
                  placeholder="Enter your message"
                ></textarea>
              </div>

              <button
                type="submit"
                className="btn-sweep w-full px-8 py-1.5 bg-[#f36b24] text-white font-bold text-lg rounded-lg hover:bg-[#e55a1a] transition-all duration-300"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
