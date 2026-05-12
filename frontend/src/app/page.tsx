'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import HeroBanner from '../components/Home/HeroBanner';
import AboutSection from '../components/Home/AboutSection';
import FeaturedList from '../components/Home/FeaturedList';
import InformativeSection from '../components/Home/Informatics';
import { PromotionBanner } from '../components/customer/PromotionBanner';
import { getTeamMembersForDisplay, TeamMemberForDisplay } from '../lib/teamData';

// Lazy load below-the-fold components
const MenuShowcase = lazy(() => import('../components/Home/MenuShowcase'));
const Testimonials = lazy(() => import('../components/Home/Testimonials'));
const Reservation = lazy(() => import('../components/Home/Reservation'));
const TeamProfiles = lazy(() => import('../components/Home/TeamProfiles'));
const OffersModal = lazy(() => import('../components/customer/OffersModal'));

export default function Home() {
  const [teamMembers, setTeamMembers] = useState<TeamMemberForDisplay[]>([]);
  const [showOffersModal, setShowOffersModal] = useState(false);

  // Fetch team members from API
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const members = await getTeamMembersForDisplay();
        setTeamMembers(members);
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      }
    };
    
    fetchTeamMembers();
  }, []);

  // Show modal once on first visit
  useEffect(() => {
    const hasSeenOffers = localStorage.getItem('hasSeenOffersModal');
    if (!hasSeenOffers) {
      // Delay to ensure page is loaded
      const timer = setTimeout(() => {
        setShowOffersModal(true);
        localStorage.setItem('hasSeenOffersModal', 'true');
      }, 2000); // Show after 2 seconds
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <HeroBanner />
      
      {/* Reservation - Lazy loaded */}
      <Suspense fallback={<div className="min-h-[400px] bg-[#111115]" />}>
        <Reservation />
      </Suspense>

      {/* Promotion Banner */}
        <PromotionBanner />


      {/* About Section */}
        <AboutSection />

      {/* Menu Showcase - Lazy loaded */}
      <Suspense fallback={<div className="min-h-[600px] bg-[#111115]" />}>
        <MenuShowcase />
      </Suspense>

      {/* Featured List */}
      <div className="w-full bg-[#111115]">
        <FeaturedList />
      </div>

      {/* Informative Section */}
      <div className="w-full bg-[#18171d]">
        <InformativeSection />
      </div>

      {/* Testimonials - Lazy loaded */}
      <Suspense fallback={<div className="min-h-[400px] bg-[#111115]" />}>
        <Testimonials />
      </Suspense>


      {/* Team Profiles - Lazy loaded
      <div className="w-full bg-[#18171d]">
        <Suspense fallback={<div className="min-h-[400px]" />}>
          <TeamProfiles
            members={teamMembers}
            title="Meet Our Professionals"
            description="Meet the passionate professionals who make our culinary vision a reality"
          />
        </Suspense>
      </div> */}

      {/* Offers Modal - Lazy loaded, only renders when open */}
      {showOffersModal && (
        <Suspense fallback={null}>
          <OffersModal open={showOffersModal} onClose={() => setShowOffersModal(false)} />
        </Suspense>
      )}
    </div>
  );
}
