"use client";

import React, { useEffect, useState } from 'react';
import TeamProfiles from '@/components/Home/TeamProfiles';
import { getTeamMembersForDisplay, TeamMemberForDisplay } from '@/lib/teamData';
import Breadcrumb from '../../components/Common/Breadcrumb';

const TeamPage = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMemberForDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(true);
        const members = await getTeamMembersForDisplay();
        setTeamMembers(members);
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeamMembers();
  }, []);

  return (
    <>
      <Breadcrumb pathname="/team" title="Our Team" />
      
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#f36b24]"></div>
          <p className="text-[#bdbdbd] mt-4">Loading team members...</p>
        </div>
      ) : (
        <TeamProfiles
          members={teamMembers}
          title="Our Team"
          description="Meet the passionate professionals who make our restaurant exceptional"
        />
      )}
    </>
  );
};

export default TeamPage;
