"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { theme } from '../../app/theme';
import { etarBellotaFont } from '../../app/etarBellotaFont';
import { apiClient } from '../../lib/api-client';
import { BlogPost } from '../../lib/types';
import { getImageUrl } from '../../lib/image-utils';
import { useLanguage } from '../../lib/language';

const BlogSection = () => {
  const { t } = useLanguage();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getBlogPosts({
          page: 1,
          limit: 3,
          published_status: true,
        });

        if (response?.success && response?.data?.blogs) {
          const normalizedBlogs = response.data.blogs.map((post: any) => ({
            ...post,
            featuredImage: post.featuredImage || post.featured_image || post.image || '',
            featured_image: post.featured_image || post.featuredImage || post.image || '',
          }));
          setBlogPosts(normalizedBlogs);
        } else {
          setBlogPosts([]);
        }
      } catch (error) {
        console.error('Failed to load home blog posts:', error);
        setBlogPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  const postCards = useMemo(() => blogPosts.slice(0, 3), [blogPosts]);

  const getPostUrl = (post: BlogPost) => `/blog/${post.slug || post.id}`;

  const getPostImage = (post: BlogPost) => {
    const raw = (post as any).featuredImage || post.featured_image || (post as any).image;
    return getImageUrl(raw) || '/assets-main/blog-1.webp';
  };

  return (
    <section className={`${theme.spacing.sectionPadding} bg-lines bg-[#18181c] ${etarBellotaFont.variable} relative overflow-hidden`}>
      <div className=" section-bg-shape position-absolute top-0"></div>
      <div className="absolute left-0 top-1/4 w-42 h-42 hidden lg:block">
        <Image
          src="/assets-main/shape-3.webp"
          alt={t('Decorative shape')}
          width={128}
          height={128}
          className="object-contain w-full h-full"
        />
      </div>
      <div className="absolute right-0 bottom-1/4 w-32 h-32 opacity-5 hidden lg:block">
        <Image
          src="/assets-main/shape-12.webp"
          alt={t('Decorative shape')}
          width={128}
          height={128}
          className="object-contain w-full h-full"
        />
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri), sans-serif' }}>{t('Culinary Chronicles')}</h2>
          <p className="text-xl text-[#bdbdbd] max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
            {t('Discover the stories behind our cuisine, seasonal inspirations, and the artistry of fine dining at The Saffron Lounge')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {!loading && postCards.length === 0 && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-8">
              <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                {t('No blog posts available right now.')}
              </p>
            </div>
          )}

          {loading && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-8">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#f36b24]"></div>
            </div>
          )}

           {postCards.map((post) => (
             <Link key={post.id} href={getPostUrl(post)}>
            <div
              className="rounded-lg overflow-hidden border border-[#23232a] transition-all duration-300 group"
            >
              <div className="relative h-56 md:h-80 group">
                <Image
                  src={getPostImage(post)}
                  alt={t(post.title)}
                  unoptimized
                  width={400}
                  height={300}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('assets-main')) {
                      target.src = '/assets-main/blog-1.webp';
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center transform -translate-x-full group-hover:translate-x-0 transition-transform duration-700">
                  <div className="bg-[#F36B24] hover:bg-[#e55a1a] text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 shadow-lg">
                    {t('Read More')}
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white group-hover:text-[#f36b24] transition-colors duration-300" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>{t(post.title)}</h3>
              </div>
            </div>
             </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/blog" className="btn-sweep px-8 py-4 bg-[#f36b24] text-white text-sm rounded-full hover:bg-[#111115] hover:text-[#f36b24] border-2 border-[#f36b24] transition-all duration-300 inline-block">
            {t('Read More')}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
