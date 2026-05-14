"use client";

import { useState } from "react";
import { etarBellotaFont } from "../../app/etarBellotaFont";
import Breadcrumb from "../../components/Common/Breadcrumb";
import { useLanguage } from "../../lib/language";

export default function ContactPage() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
    consent: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission logic would go here
    console.log("Form submitted:", formData);
    alert(t("Thank you for your message! We'll get back to you soon."));
  };

  return (
    <>
      <Breadcrumb pathname="/contact" title={t("Contact Us")} />
      <div className={`min-h-screen bg-[#111115] ${etarBellotaFont.variable}`}>

      {/* Contact Form Section */}
      <div className="md:py-10 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-[#18181c] to-[#1a1a1e] rounded-lg p-8 md:p-12 border border-[#23232a] shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8" style={{ fontFamily: 'var(--font-el-messiri)' }}>
              {t("Send Us A Message")}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    placeholder={t("Name")}
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-[#111115] border border-[#23232a] text-white placeholder:text-sm placeholder-[#bdbdbd] focus:outline-none focus:border-[#f36b24] focus:ring-2 focus:ring-[#F0681D]/50 transition-all duration-300 rounded-md"
                    required
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#bdbdbd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    name="phone"
                    placeholder={t("Phone")}
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-[#111115] border border-[#23232a] text-white placeholder:text-sm placeholder-[#bdbdbd] focus:outline-none focus:border-[#f36b24] focus:ring-2 focus:ring-[#F0681D]/50 transition-all duration-300 rounded-md"
                    required
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#bdbdbd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    placeholder={t("Email")}
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-[#111115] border border-[#23232a] text-white placeholder:text-sm placeholder-[#bdbdbd] focus:outline-none focus:border-[#f36b24] focus:ring-2 focus:ring-[#F0681D]/50 transition-all duration-300 rounded-md"
                    required
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#bdbdbd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    name="subject"
                    placeholder={t("Subject")}
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-[#111115] border border-[#23232a] text-white placeholder:text-sm placeholder-[#bdbdbd] focus:outline-none focus:border-[#f36b24] focus:ring-2 focus:ring-[#F0681D]/50 transition-all duration-300 rounded-md"
                    required
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#bdbdbd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>

              <div className="relative">
                <textarea
                  name="message"
                  placeholder={t("Message")}
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  className="w-full pl-10 pr-4 py-3 bg-[#111115] border border-[#23232a] text-white placeholder:text-sm placeholder-[#bdbdbd] focus:outline-none focus:border-[#f36b24] focus:ring-2 focus:ring-[#F0681D]/50 transition-all duration-300 rounded-md resize-none"
                  required
                ></textarea>
                <svg className="absolute left-3 top-4 w-5 h-5 text-[#bdbdbd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="consent"
                    name="consent"
                    type="checkbox"
                    checked={formData.consent}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#f36b24] bg-[#111115] border-[#23232a] rounded focus:ring-[#f36b24] focus:ring-2"
                    required
                  />
                </div>
                <div className="ml-3 text-md">
                  <label htmlFor="consent" className="text-[#bdbdbd]">
                    {t("I agree that my submitted data is being collected and stored.")}
                  </label>
                </div>
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  className="px-12 w-full py-4 rounded-lg bg-gradient-to-r from-[#F0681D] to-[#d1551a] text-[#111115] text-md font-bold transition-all duration-300 hover:scale-105"
                >
                  {t("Send Message")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className=" bg-[#18181c]">
        <div className="max-w-8xl mx-auto">
          <div className="bg-[#111115] rounded-lg overflow-hidden border border-[#23232a]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3120.9077363963756!2d-0.11313311660891333!3d38.53589493015502!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd6204570ad84c3b%3A0x4653937d33a0a9bd!2sAv.%20del%20Mediterr%C3%A1neo%2C%2051%2C%2003503%20Benidorm%2C%20Alicante%2C%20Spain!5e0!3m2!1sen!2sin!4v1759820267083!5m2!1sen!2sin"
              width="100%"
              height="750"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={t("Google Maps Location")}
            ></iframe>
          </div>
        </div>
      </div>
      {/* Contact Information Cards */}
      <div>
  <div className="max-w-8xl mx-auto py-28">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Open Hours Card */}
      <div className="bg-[#18181c] rounded-lg p-8 border border-[#23232a] text-center">
        <div className="w-16 h-16 bg-[#f36b24] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
          {t("Working Hours")}
        </h3>
        <div className="space-y-3 text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
          <div>{t("Tuesday - Sunday")} <br></br><span>{t("14:30pm - 23:00pm")}</span></div>
          <div>{t("Monday: Closed")}</div>
        </div>
      </div>

      {/* Address Card */}
      <div className="bg-[#18181c] rounded-lg p-8 border border-[#23232a] text-center">
        <div className="w-16 h-16 bg-[#f36b24] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#241c1b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 12.414a4 4 0 10-1.414 1.414l4.243 4.243a1 1 0 001.414-1.414z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
          {t("Address")}
        </h3>
        <div className="space-y-3 text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
          <div>{t("Av. del Mediterráneo, 51, 03503 Benidorm")}</div>
          <div>{t("Alicante, Spain")}</div>
          <a href="https://www.google.com/maps/place/Av.+del+Mediterr%C3%A1neo,+51,+03503+Benidorm,+Alicante,+Spain" target="_blank" rel="noopener noreferrer" className="text-[#f36b24] hover:text-[#e55a1a] transition-colors duration-300 font-medium">
            {t("View Map")}
          </a>
        </div>
      </div>

      {/* Get In Touch Card */}
      <div className="bg-[#18181c] rounded-lg p-8 border border-[#23232a] text-center">
        <div className="w-16 h-16 bg-[#f36b24] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
          {t("Get In Touch")}
        </h3>
        <div className="space-y-3 text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
          <div>{t("Phone")}: +34 640 315 693</div>
          <div>{t("Email")}: thesaffronloungebenidorm@gmail.com</div>
          <a href="https://www.thesaffronlounge.com" target="_blank" rel="noopener noreferrer" className="text-[#f36b24] hover:text-[#e55a1a] transition-colors duration-300 font-medium">
            {t("Visit Website")}
          </a>
        </div>
      </div>
    </div>
  </div>
</div>

    </div>
   </>
  );
}
