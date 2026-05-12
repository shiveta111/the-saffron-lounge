"use client";

import React from 'react';
import Link from 'next/link';
import Breadcrumb from '../../components/Common/Breadcrumb';

const TermsPage = () => {
  return (
    <>
      <Breadcrumb pathname="/terms" title="Terms & Conditions" />
      
      <section className="min-h-screen bg-[#111115] md:py-10 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-[#18181c] rounded-lg p-8 md:p-12 border border-[#23232a]">
            <p className="text-[#bdbdbd] mb-8" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
              Last updated: June 1, 2023
            </p>

            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  1. Acceptance of Terms
                </h2>
                <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  By accessing or using The Saffron Lounge website and services,
                  you agree to be bound by these Terms & Conditions and all applicable laws and regulations.
                  If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  2. Reservation Policy
                </h2>
                <p className="text-[#bdbdbd] mb-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  All reservations are subject to availability. We recommend making reservations
                  in advance, especially for weekends and special occasions. For parties of 6 or more,
                  we require a credit card to guarantee the reservation.
                </p>
                <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  Cancellation policy: For reservations of 6 or more guests, we require 48 hours'
                  notice for cancellations to avoid a cancellation fee. For larger events and private
                  dining, different policies may apply.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  3. Payment Terms
                </h2>
                <p className="text-[#bdbdbd] mb-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  All prices listed on our website and menu are in US dollars and are subject to change
                  without notice. Applicable taxes will be added to the final bill.
                </p>
                <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  We accept major credit cards, debit cards, and cash. For large events and private
                  dining, a deposit may be required to secure the booking.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  4. Intellectual Property
                </h2>
                <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  All content on this website, including text, graphics, logos, images, and software,
                  is the property of The Saffron Lounge and is protected by international copyright laws.
                  Unauthorized use of any materials on this site is strictly prohibited.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  5. Limitation of Liability
                </h2>
                <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  The Saffron Lounge shall not be liable for any direct, indirect, incidental,
                  special, or consequential damages arising out of the use or inability to use
                  our services, even if we have been advised of the possibility of such damages.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  6. User Responsibilities
                </h2>
                <p className="text-[#bdbdbd] mb-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  You agree to use our website and services only for lawful purposes and in a way
                  that does not infringe the rights of, restrict, or inhibit anyone else's use and enjoyment.
                </p>
                <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  You are responsible for maintaining the confidentiality of your account and password
                  and for restricting access to your computer or device.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  7. Modifications to Services
                </h2>
                <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  We reserve the right to modify, suspend, or discontinue any aspect of our services
                  at any time without notice. We shall not be liable to you or any third party for
                  any modification, suspension, or discontinuance of our services.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  8. Governing Law
                </h2>
                <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  These terms shall be governed by and construed in accordance with the laws of
                  the State of California, without regard to its conflict of law provisions.
                  Any disputes arising under these terms shall be subject to the exclusive
                  jurisdiction of the courts located in California.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  9. Changes to Terms
                </h2>
                <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  We reserve the right to update or modify these Terms & Conditions at any time
                  without prior notice. Your continued use of our website and services after any
                  such changes constitutes your acceptance of the new Terms & Conditions.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  10. Contact Information
                </h2>
                <p className="text-[#bdbdbd] mb-4" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  If you have any questions about these Terms & Conditions, please contact us at:
                </p>
                <div className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  <p className="mb-2">The Saffron Lounge</p>
                  <p className="mb-2">12th Block-A, Ribonstreet, Australia</p>
                  <p className="mb-2">Email: terms@saffronlounge.com</p>
                  <p>Phone: (800) 216-2020</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default TermsPage;
