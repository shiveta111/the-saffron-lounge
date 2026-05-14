"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Breadcrumb from '../../../components/Common/Breadcrumb';
import { apiClient } from '../../../lib/api-client';
import { BlogPost } from '../../../lib/types';
import { format } from 'date-fns';
import { getImageUrl } from '../../../lib/image-utils';
import { useLanguage } from '../../../lib/language';

const BlogDetailPage = () => {
  const { t } = useLanguage();
  const params = useParams();
  const slug = params?.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);

        let response: any;
        const isNumeric = /^\d+$/.test(slug);

        if (isNumeric) {
          response = await apiClient.getBlogPost(parseInt(slug));
        } else {
          response = await apiClient.getBlogPostBySlug(slug);
        }

        if (response?.success && response?.data) {
          const blogData = response.data.blog || response.data;
          setPost(blogData);
          setRelatedPosts(response.data.relatedPosts || []);
        } else {
          setError('Blog post not found.');
        }
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setError('Blog post not found.');
        } else {
          setError(err?.response?.data?.message || 'Failed to load blog post.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getAuthorName = (p: BlogPost): string => {
    if (p.author?.username) return p.author.username;
    if (p.author?.email) return p.author.email.split('@')[0];
    return 'Admin';
  };

  if (loading) {
    return (
      <>
        <Breadcrumb pathname="/blog" title="Blog" />
        <section className="min-h-screen bg-[#111115] py-10">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#f36b24]"></div>
            <p className="text-[#bdbdbd] mt-4">{t('Loading...')}</p>
          </div>
        </section>
      </>
    );
  }

  if (error || !post) {
    return (
      <>
        <Breadcrumb pathname="/blog" title="Blog" />
        <section className="min-h-screen bg-[#111115] py-10">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 text-center py-20">
            <p className="text-[#bdbdbd] text-xl mb-6">{error || t('Blog post not found.')}</p>
            <Link
              href="/blog"
              className="inline-flex items-center px-6 py-3 bg-[#f36b24] text-white font-bold rounded-lg hover:bg-[#111115] hover:text-[#f36b24] border-2 border-[#f36b24] transition-all duration-300"
            >
              {t('Back to Blog')}
            </Link>
          </div>
        </section>
      </>
    );
  }

  const imageUrl = getImageUrl((post as any).featuredImage || post.featured_image) || '/assets-main/blog-1.webp';
  const authorName = getAuthorName(post);
  const tags: string[] = post.tags || [];
  const categoryName = post.category?.name || (tags.length > 0 ? tags[0] : 'Blog');

  return (
    <>
      <Breadcrumb pathname="/blog" title={t('Blog')} />

      <section className="min-h-screen bg-[#111115] md:py-10 py-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <article className="bg-[#18181c] rounded-lg overflow-hidden border border-[#23232a] mb-12">
            <div className="relative h-96 w-full">
              <Image
                src={imageUrl}
                alt={post.title}
                fill
                unoptimized
                className="object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/assets-main/blog-1.webp';
                }}
              />
            </div>

            <div className="p-8 md:p-12">
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className="px-3 py-1 bg-[#F36B24] text-[#111115] rounded-full text-md font-bold">
                  {t(categoryName)}
                </span>
                <span className="text-[#bdbdbd]">
                  {formatDate(post.created_at || (post as any).createdAt)}
                </span>
                <span className="text-[#bdbdbd]">{t('By')} {authorName}</span>
              </div>

              <h1
                className="text-2xl md:text-3xl font-bold text-white mb-8"
                style={{ fontFamily: 'var(--font-el-messiri)' }}
              >
                {t(post.title)}
              </h1>

              {(post as any).excerpt && (
                <p className="text-[#bdbdbd] text-lg italic mb-8 border-l-4 border-[#f36b24] pl-4">
                  {t((post as any).excerpt)}
                </p>
              )}

              <div
                className="text-[#bdbdbd] prose prose-sm max-w-none prose-headings:text-white prose-a:text-[#F36B24] prose-a:hover:text-[#d1a05a] prose-strong:text-white prose-em:text-[#F36B24] whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {tags.length > 0 && (
                <div className="mt-12 pt-8 border-t border-[#23232a]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-white mr-1">{t('Tags')}:</span>
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-[#111115] text-[#bdbdbd] rounded-full text-md border border-[#23232a]"
                      >
                        {t(tag)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>

          {relatedPosts.length > 0 && (
            <div className="mb-20">
              <h2
                className="text-3xl font-bold text-white mb-12 text-center"
                style={{ fontFamily: 'var(--font-el-messiri)' }}
              >
                {t('Related Articles')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedPosts.map((related) => {
                  const relatedImage = getImageUrl((related as any).featuredImage || related.featured_image) || '/assets-main/blog-1.webp';
                  const relatedUrl = `/blog/${related.slug || related.id}`;
                  return (
                    <div
                      key={related.id}
                      className="bg-[#18181c] rounded-lg overflow-hidden border border-[#23232a] hover:border-[#F36B24] transition-all duration-300 group"
                    >
                      <Link href={relatedUrl}>
                        <div className="relative h-48">
                          <Image
                            src={relatedImage}
                            alt={related.title}
                            fill
                            unoptimized
                            className="object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/assets-main/blog-1.webp';
                            }}
                          />
                        </div>
                      </Link>
                      <div className="p-6">
                        <span className="text-md text-[#bdbdbd] mb-2 block">
                          {formatDate(related.created_at || (related as any).createdAt)}
                        </span>
                        <h3
                          className="text-lg font-bold text-white group-hover:text-[#F36B24] transition-colors duration-300 mb-3"
                          style={{ fontFamily: 'var(--font-el-messiri)' }}
                        >
                          <Link href={relatedUrl}>{t(related.title)}</Link>
                        </h3>
                        <Link
                          href={relatedUrl}
                          className="inline-flex items-center px-4 py-2 bg-[#f36b24] text-white font-bold rounded-lg hover:bg-[#111115] hover:text-[#f36b24] border-2 border-[#f36b24] transition-all duration-300"
                        >
                          {t('Read More')}
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-center mb-12">
            <Link
              href="/blog"
              className="inline-flex items-center px-6 py-3 bg-transparent text-[#f36b24] font-bold rounded-lg border-2 border-[#f36b24] hover:bg-[#f36b24] hover:text-white transition-all duration-300"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              {t('Back to Blog')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default BlogDetailPage;
