import { apiClient } from './api-client';
import { TeamMember } from './types';

// Interface for TeamProfiles component
export interface TeamMemberForDisplay {
  id: number;
  name: string;
  role: string;
  image: string;
  bio?: string;
}

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const response = await apiClient.getTeamMembers({
      limit: 100 // Get all team members
    });

    // Handle both success and error responses
    if (response.success !== false && response.data) {
      const members = response.data.members || [];
      
      // Map backend structure to frontend structure
      return members.map((member: any) => ({
        ...member,
        // Ensure social_links is parsed if it's a JSON string
        social_links: typeof member.social_links === 'string' 
          ? (() => {
              try {
                return JSON.parse(member.social_links);
              } catch {
                return [];
              }
            })()
          : (member.social_links || [])
      }));
    }
    
    // Return empty array if error or no data
    return [];
  } catch (error: any) {
    console.error('Failed to fetch team members:', error);
    return [];
  }
};

// Helper function to convert TeamMember to TeamMemberForDisplay format
export const getTeamMembersForDisplay = async (): Promise<TeamMemberForDisplay[]> => {
  const members = await getTeamMembers();
  return members.map((member) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    image: member.photo || '/assets/img/team/default-avatar.jpg',
    bio: member.bio
  }));
};
