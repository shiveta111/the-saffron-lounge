import React from 'react';
import Image from 'next/image';
import { TeamMember } from '../types/team';
import { getImageUrl } from '../lib/image-utils';

interface TeamMemberCardProps {
  member: TeamMember;
  variant?: 'home' | 'page';
  className?: string;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ 
  member, 
  variant = 'home',
  className = '' 
}) => {
  // Define styling based on variant
  const cardStyle = variant === 'page' 
    ? 'bg-[#181c] border border-[#23232a] hover:border-[#F36B24]' 
    : 'bg-[#11115] border border-[#23232a] hover:border-[#F36B24]';
    
  const textStyle = variant === 'page' 
    ? 'text-[#bdbdbd]' 
    : 'text-[#bdbdbd]';
    
  const roleStyle = variant === 'page' 
    ? 'text-[#F36B24]' 
    : 'text-[#F36B24]';

  return (
    <div 
      className={`rounded-lg overflow-hidden transition-all duration-30 group ${cardStyle} ${className}`}
    >
      <div className="relative h-80 overflow-hidden">
        <Image
          src={getImageUrl(member.image) || '/assets-main/team/placeholder.jpg'}
          alt={member.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            const target = e.currentTarget;
            target.src = '/assets-main/team/placeholder.jpg';
          }}
        />
      </div>
      <div className="p-6">
        <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}>
          {member.name}
        </h3>
        <p className={`text-lg mb-4 ${roleStyle}`} style={{ fontFamily: 'var(--font-lato), sans-serif' }}>{member.role}</p>
        <p className={`mb-6 ${textStyle}`} style={{ fontFamily: 'var(--font-lato), sans-serif' }}>{member.bio}</p>
        
        {member.socialLinks && (
          <div className="flex gap-4">
            {member.socialLinks.facebook && (
              <a 
                href={member.socialLinks.facebook} 
                className="w-10 h-10 rounded-full border border-[#444] flex items-center justify-center hover:border-[#F36B24] hover:bg-[#F36B24] group transition-all duration-300"
              >
                <svg className="w-4 h-4 text-[#F36B24] group-hover:text-[#111115] transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12z"/>
                </svg>
              </a>
            )}
            
            {member.socialLinks.twitter && (
              <a 
                href={member.socialLinks.twitter} 
                className="w-10 h-10 rounded-full border border-[#444] flex items-center justify-center hover:border-[#F36B24] hover:bg-[#F36B24] group transition-all duration-300"
              >
                <svg className="w-4 h-4 text-[#F36B24] group-hover:text-[#111115] transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.53 6.47a.75.75 0 0 1 1.06 1.06l-4.47 4.47 4.47 4.47a.75.75 0 0 1-1.06 1.06l-4.47-4.47-4.47 4.47a.75.75 0 0 1-1.06-1.06l4.47-4.47-4.47-4.47a.75.75 0 0 1 1.06-1.06l4.47 4.47 4.47-4.47z" />
                </svg>
              </a>
            )}
            
            {member.socialLinks.instagram && (
              <a 
                href={member.socialLinks.instagram} 
                className="w-10 h-10 rounded-full border border-[#444] flex items-center justify-center hover:border-[#F36B24] hover:bg-[#F36B24] group transition-all duration-300"
              >
                <svg className="w-4 h-4 text-[#F36B24] group-hover:text-[#111115] transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.241 1.308 3.608.058 1.266.069 1.646.069 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.241 1.246-3.608 1.308-1.266.058-1.646.069-4.85.069s-3.584-.012-4.85-.07c-1.36-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.241-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.241-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.771.131 4.659.425 3.678 1.406c-.981.981-1.275 2.093-1.334 3.374C2.013 8.332 2 8.741 2 12c0 3.259.013 3.668.072 4.948.059 1.281.353 2.393 1.334 3.374.981.981 2.093 1.275 3.374 1.334C8.332 23.987 8.741 24 12 24c3.259 0 3.668-.013 4.948-.072 1.281-.059 2.393-.353 3.374-1.334.981-.981 1.275-2.093 1.334-3.374.059-1.28.072-1.689.072-4.948 0-3.259-.013-3.668-.072-4.948-.059-1.281-.353-2.393-1.334-3.374-.981-.981-2.093-1.275-3.374-1.334C15.668.013 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0-2.881z" />
                </svg>
              </a>
            )}
            
            {member.socialLinks.linkedin && (
              <a 
                href={member.socialLinks.linkedin} 
                className="w-10 h-10 rounded-full border border-[#444] flex items-center justify-center hover:border-[#F36B24] hover:bg-[#F36B24] group transition-all duration-300"
              >
                <svg className="w-4 h-4 text-[#F36B24] group-hover:text-[#111115] transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14C2.239 0 0 2.239 0 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5V5c0-2.761-2.239-5-5-5zM7.5 20h-3v-9h3v9zm-1.5-10.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm15 10.268h-3v-4.604c0-1.099-.021-2.513-1.532-2.513-1.532 0-1.767 1.197-1.767 2.434V20h-3v-9h2.881v1.233h.041c.401-.761 1.379-1.563 2.841-1.563 3.039 0 3.6 2.001 3.6 4.601V20z" />
                </svg>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamMemberCard;
