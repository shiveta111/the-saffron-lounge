"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { etarBellotaFont } from '../etarBellotaFont';
import Breadcrumb from '../../components/Common/Breadcrumb';
import { apiClient } from '../../lib/api-client';
import { BlogPost, BlogCategory } from '../../lib/types';
import { format } from 'date-fns';
import { getImageUrl } from '../../lib/image-utils';
import { useLanguage } from '../../lib/language';

const BlogPage = () => {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [allBlogPosts, setAllBlogPosts] = useState<BlogPost[]>([]);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(new Set());
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const postsPerPage = 6;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.getBlogCategories({ limit: 100, isActive: true });
        if (response.success && response.data?.categories) {
          setBlogCategories(response.data.categories);
        }
      } catch (err) {
        console.error('Failed to fetch blog categories:', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: any = {
          page: currentPage,
          limit: postsPerPage,
          published_status: true,
        };

        if (activeCategory !== 'all') {
          params.category_id = parseInt(activeCategory);
        }

        const response = await apiClient.getBlogPosts(params);

        if (response.success && response.data) {
          const blogs = (response.data.blogs || []).map((post: any) => ({
            ...post,
            featuredImage: post.featuredImage || post.featured_image || post.image || '',
            featured_image: post.featured_image || post.featuredImage || post.image || '',
          }));

          const paginationData = response.data.pagination || {
            total: blogs.length,
            page: currentPage,
            limit: postsPerPage,
            totalPages: Math.ceil(blogs.length / postsPerPage),
            hasNext: false,
            hasPrev: false,
          };

          setAllBlogPosts(blogs);
          setPagination(paginationData);
        } else {
          setAllBlogPosts([]);
        }
      } catch (err: any) {
        console.error('Failed to fetch blog posts:', err);
        setError(err?.response?.data?.message || 'Failed to load blog posts');
        setAllBlogPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogPosts();
  }, [currentPage, activeCategory]);

  const getExcerpt = (content: string | null | undefined): string => {
    const safeContent = typeof content === 'string' ? content : '';
    const text = safeContent.replace(/<[^>]*>/g, '');
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getAuthorName = (post: BlogPost): string => {
    if (post.author?.username) return post.author.username;
    if (post.author?.email) return post.author.email.split('@')[0];
    return t('Admin');
  };

  const getAllTags = (): string[] => {
    const tagSet = new Set<string>();
    allBlogPosts.forEach((post) => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).slice(0, 8);
  };

  const resolvePostImage = (post: BlogPost): string => {
    const postId = Number(post?.id) || 0;
    if (failedImageIds.has(postId)) {
      return '/assets-main/blog-1.webp';
    }

    const raw = (post as any).featuredImage || post.featured_image || (post as any).image;
    return getImageUrl(raw) || '/assets-main/blog-1.webp';
  };

  const getPostUrl = (post: BlogPost): string => `/blog/${post.slug || post.id}`;

  const markImageAsFailed = (postId: number) => {
    setFailedImageIds((prev) => new Set(prev).add(postId));
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (!target.src.includes('assets-main')) {
      target.src = '/assets-main/blog-1.webp';
    }
  };

  const totalPages = pagination.totalPages || 1;
  const paginatedPosts = allBlogPosts;

  const categories = [
    { id: 'all', name: t('All Posts'), count: pagination.total || 0 },
    ...blogCategories.map((cat) => ({
      id: cat.id.toString(),
      name: t(cat.name),
      count: cat.blogCount || 0,
    })),
  ];

  const tags = getAllTags();

  return (
    <>
      <Breadcrumb pathname="/blog" title={t('Our Blog')} />

      <section className={`min-h-screen bg-[#111115] md:py-10 py-10 ${etarBellotaFont.variable}`}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <p className="text-md text-[#bdbdbd] max-w-3xl mx-auto text-center mb-16" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
            {t('Explore our latest articles, recipes, and culinary insights')}
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-2/3">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#f36b24]"></div>
                  <p className="text-[#bdbdbd] mt-4">{t('Loading blog posts...')}</p>
                </div>
              ) : paginatedPosts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#bdbdbd] text-lg">{t('No blog posts found.')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {paginatedPosts.map((post) => {
                    const authorName = getAuthorName(post);
                    const excerpt = t(getExcerpt(post.content));
                    const formattedDate = formatDate(post.created_at);
                    const imageUrl = getImageUrl((post as any).featuredImage) || '/assets-main/blog-1.webp';
                    const categoryName = t(post.category?.name || (post.tags && post.tags.length > 0 ? post.tags[0] : 'Blog'));
                    const categoryColor = post.category?.color || '#f36b24';

                    return (
                      <article
                        key={post.id}
                        className="bg-[#18181c] rounded-lg overflow-hidden border border-[#23232a] hover:border-[#f36b24] transition-all duration-300 group"
                      >
                        <Link href={getPostUrl(post)} className="block">
                          <div className="relative h-56">
                            <Image
                              src={imageUrl}
                              alt={post.title}
                              fill
                              unoptimized
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                              onError={(e) => {
                                markImageAsFailed(post.id);
                                handleImageError(e);
                              }}
                            />
                          </div>
                        </Link>
                        <div className="p-6">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-md font-bold" style={{ color: categoryColor }}>
                              {categoryName}
                            </span>
                            <span className="text-[#bdbdbd] text-md">{formattedDate}</span>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#f36b24] transition-colors duration-300" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                            <Link href={getPostUrl(post)}>{t(post.title)}</Link>
                          </h3>
                          <p className="text-[#bdbdbd] mb-4">{excerpt}</p>
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-[#23232a] flex items-center justify-center mr-3">
                              <span className="text-[#f36b24] font-bold text-md">{authorName.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-white">{authorName}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {!loading && totalPages > 1 && (
                <div className="flex justify-center mt-12">
                  <nav className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1 || loading}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                        currentPage === 1 || loading
                          ? 'bg-[#18181c] text-[#444] cursor-not-allowed'
                          : 'bg-[#18181c] text-white hover:bg-[#f36b24] hover:text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        disabled={loading}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                          currentPage === i + 1
                            ? 'bg-[#f36b24] text-white'
                            : 'bg-[#18181c] text-white hover:bg-[#f36b24] hover:text-white'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || loading}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                        currentPage === totalPages || loading
                          ? 'bg-[#18181c] text-[#444] cursor-not-allowed'
                          : 'bg-[#18181c] text-white hover:bg-[#f36b24] hover:text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </nav>
                </div>
              )}
            </div>

            <div className="lg:w-1/3">
              <div className="bg-[#18181c] rounded-lg p-6 border border-[#23232a] mb-8">
                <h3 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  {t('Categories')}
                </h3>
                <ul className="space-y-3">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <button
                        onClick={() => {
                          setActiveCategory(category.id);
                          setCurrentPage(1);
                        }}
                        className={`w-full flex justify-between items-center py-1.5 px-3 rounded-lg text-left transition-all duration-300 ${
                          activeCategory === category.id
                            ? 'bg-[#f36b24] text-white'
                            : 'text-[#bdbdbd] hover:bg-[#23232a]'
                        }`}
                      >
                        <span>{category.name}</span>
                        <span className="text-md">{category.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {tags.length > 0 && (
                <div className="bg-[#18181c] rounded-lg p-6 border border-[#23232a] mb-8">
                  <h3 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                      {t('Popular Tags')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <button
                        key={index}
                        className="px-3 py-1 bg-[#111115] text-[#bdbdbd] rounded-full text-md border border-[#23232a] hover:border-[#f36b24] transition-colors duration-300"
                      >
                        {t(tag)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {allBlogPosts.length > 0 && (
                <div className="bg-[#18181c] rounded-lg p-6 border border-[#23232a]">
                  <h3 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                    {t('Recent Posts')}
                  </h3>
                  <div className="space-y-4">
                    {allBlogPosts.slice(0, 3).map((post) => {
                      const imageUrl = getImageUrl((post as any).featuredImage) || '/assets-main/blog-1.webp';
                      const formattedDate = formatDate(post.created_at);
                      return (
                        <div key={post.id} className="flex gap-4">
                          <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden">
                            <Image
                              src={imageUrl}
                              alt={post.title}
                              fill
                              unoptimized
                              className="object-cover"
                              onError={(e) => {
                                markImageAsFailed(post.id);
                                handleImageError(e);
                              }}
                            />
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-md mb-1 hover:text-[#f36b24] transition-colors duration-300">
                              <Link href={getPostUrl(post)}>{t(post.title)}</Link>
                            </h4>
                            <p className="text-[#bdbdbd] text-xs">{formattedDate}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default BlogPage;
