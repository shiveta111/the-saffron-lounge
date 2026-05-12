"use client";

import React from 'react';
import Link from 'next/link';
import Breadcrumb from '../../components/Common/Breadcrumb';

const PrivacyPolicyPage = () => {
  return (
    <>
      <Breadcrumb pathname="/privacy-policy" title="Privacy Policy" />
      
      <section className="min-h-screen bg-[#111115] md:py-10 py-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="bg-[#18181c] rounded-lg p-8 md:p-12 border border-[#23232a]">
            <p className="text-[#bdbdbd] mb-8" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
              Last updated: June 1, 2023
            </p>
            
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  1. Information We Collect
                </h2>
                <p className="text-[#bdbdbd] mb-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  We collect information that you provide directly to us when you:
                </p>
                <ul className="list-disc list-inside text-[#bdbdbd] space-y-2 ml-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  <li>Make a reservation or place an order</li>
                  <li>Create an account or update your profile</li>
                  <li>Subscribe to our newsletter or marketing communications</li>
                  <li>Participate in surveys, contests, or promotional activities</li>
                  <li>Contact us for customer support</li>
                </ul>
                <p className="text-[#bdbdbd] mt-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  The information we collect may include your name, email address, phone number,
                  mailing address, payment information, dietary preferences, and special occasion dates.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  2. How We Use Your Information
                </h2>
                <p className="text-[#bdbdbd] mb-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside text-[#bdbdbd] space-y-2 ml-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  <li>Process and fulfill your reservations and orders</li>
                  <li>Send you confirmations and updates about your bookings</li>
                  <li>Personalize your dining experience</li>
                  <li>Improve our services and website functionality</li>
                  <li>Send you marketing communications (with your consent)</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  3. Information Sharing and Disclosure
                </h2>
                <p className="text-[#bdbdbd] mb-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  We do not sell, trade, or rent your personal information to third parties.
                  We may share your information with:
                </p>
                <ul className="list-disc list-inside text-[#bdbdbd] space-y-2 ml-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  <li>Service providers who assist us in operating our business</li>
                  <li>Payment processors to complete transactions</li>
                  <li>Law enforcement or regulatory authorities when required by law</li>
                  <li>Third parties in connection with a business transaction</li>
                </ul>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  4. Data Security
                </h2>
                <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  We implement appropriate technical and organizational measures to protect
                  your personal information against unauthorized access, alteration, disclosure,
                  or destruction. However, no method of transmission over the Internet or
                  electronic storage is 100% secure.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  5. Your Rights
                </h2>
                <p className="text-[#bdbdbd] mb-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  You have the right to:
                </p>
                <ul className="list-disc list-inside text-[#bdbdbd] space-y-2 ml-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  <li>Access and receive a copy of your personal information</li>
                  <li>Correct or update inaccurate personal information</li>
                  <li>Delete your personal information</li>
                  <li>Object to or restrict the processing of your personal information</li>
                  <li>Withdraw your consent to marketing communications</li>
                </ul>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  6. Cookies and Tracking Technologies
                </h2>
                <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  We use cookies and similar tracking technologies to enhance your experience
                  on our website. You can control cookies through your browser settings,
                  but disabling cookies may affect your ability to use certain features of our site.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  7. Changes to This Policy
                </h2>
                <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  We may update this Privacy Policy from time to time. We will notify you
                  of any changes by posting the new policy on this page and updating the
                  "Last updated" date. We encourage you to review this policy periodically.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  8. Contact Us
                </h2>
                <p className="text-[#bdbdbd] mb-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  If you have questions about this Privacy Policy or our privacy practices,
                  please contact us at:
                </p>
                <div className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  <p className="mb-2">The Saffron Lounge</p>
                  <p className="mb-2">Av. del Mediterráneo, 51, 03503 Benidorm, Alicante, Spain</p>
                  <p className="mb-2">Email: thesaffronloungebenidorm@gmail.com</p>
                  <p>Phone: +34 640 315 693</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default PrivacyPolicyPage;
