"use client";

import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import Testimonials from '@/components/Home/Testimonials';
import AboutSection from '@/components/Home/AboutSection';
// import TeamProfiles from '@/components/Home/TeamProfiles';
// import { getTeamMembersForDisplay, TeamMemberForDisplay } from '../../lib/teamData';
import Breadcrumb from '../../components/Common/Breadcrumb';
import { safeArray } from '../../lib/safe-utils';

export default function AboutPage() {
  // const [teamMembers, setTeamMembers] = useState<TeamMemberForDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        // const members = await getTeamMembersForDisplay();
        // setTeamMembers(safeArray(members, []));
      } catch (err) {
        console.error('Failed to fetch team members:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch team members'));
        // setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, []);

  return (
    <ErrorBoundary>
      <Breadcrumb pathname="/about" title="About Us" />

      <AboutSection />
      {/* <Testimonials /> */}

      {/* <div className="w-full bg-[#18171d]">
        {loading ? (
          <div className="py-16 text-center text-white">
            <p>Loading team members...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-white">
            <p>Unable to load team members at this time.</p>
          </div>
        ) : (
          <div className="py-16 text-center text-white">
            <p>No team data available.</p>
          </div>
        )}
      </div> */}
    </ErrorBoundary>
  );
}