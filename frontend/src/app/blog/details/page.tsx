"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Breadcrumb from '../../../components/Common/Breadcrumb';

const BlogDetailsPage = () => {
  // Sample blog post data
  const blogPost = {
    id: 1,
    title: "The Art of Perfect Pasta Making",
    date: "May 15, 2023",
    author: "Chef Maria Rodriguez",
    image: "/assets/img/blog/blog-1.webp",
    category: "Cooking Tips",
    content: `
      <p>Pasta is one of the most beloved foods worldwide, and for good reason. Its versatility, simplicity, and deliciousness make it a staple in many households. But achieving pasta perfection requires more than just boiling water and throwing in some noodles.</p>
      
      <h2 class="text-2xl font-bold text-white my-6" style="font-family:var(--font-el-messiri)">The Foundation: Quality Ingredients</h2>
      
      <p>The first step to perfect pasta is selecting quality ingredients. While it might be tempting to grab the cheapest pasta from the shelf, investing in high-quality dried pasta or even fresh pasta made in-house can make a significant difference. Look for pasta made with bronze dies, which creates a rougher surface that holds sauce better.</p>
      
      <p>Equally important is the water you cook your pasta in. Use plenty of water – about 4-6 quarts per pound of pasta – and make sure it's well salted. The water should taste like seawater, which seasons the pasta from the inside out.</p>
      
      <h2 class="text-2xl font-bold text-white my-6" style="font-family:var(--font-el-messiri)">Timing is Everything</h2>
      
      <p>One of the most common mistakes home cooks make is overcooking pasta. The package directions are just a guideline – the best way to determine doneness is to taste it. Pasta should be al dente, which means "to the tooth" in Italian. It should have a slight bite to it, not be completely soft.</p>
      
      <p>Reserve some pasta water before draining. This starchy water is liquid gold for adjusting sauce consistency and helping the sauce adhere to the pasta.</p>
      
      <h2 class="text-2xl font-bold text-white my-6" style="font-family:var(--font-el-messiri)">The Perfect Pairing: Sauce and Pasta</h2>
      
      <p>Different pasta shapes are designed to work with specific types of sauces. Long, thin pasta like spaghetti pairs beautifully with light, oil-based sauces or delicate seafood sauces. Short, tubular pasta like penne works well with chunkier sauces that can get inside the tubes. Flat pasta like fettuccine is perfect for rich, creamy sauces.</p>
      
      <p>When combining pasta and sauce, don't just dump the drained pasta on top of the sauce. Instead, finish cooking the pasta in the saucepan with the sauce. This allows the flavors to meld together and creates a cohesive dish.</p>
      
      <h2 class="text-2xl font-bold text-white my-6" style="font-family:var(--font-el-messiri)">Final Touches</h2>
      
      <p>Before serving, finish your pasta with a knob of butter, a drizzle of high-quality olive oil, or a sprinkle of cheese. These final touches can elevate a good dish to greatness. Remember to serve immediately – pasta waits for no one!</p>
    `,
    tags: ["Pasta", "Cooking", "Italian Cuisine", "Chef Tips"]
  };

  const relatedPosts = [
    {
      id: 2,
      title: "Mastering the Art of Risotto",
      date: "April 28, 2023",
      image: "/assets/img/blog/blog-2.webp",
      excerpt: "Learn the secrets to creating creamy, perfect risotto every time."
    },
    {
      id: 3,
      title: "5 Essential Knife Skills for Home Cooks",
      date: "April 12, 2023",
      image: "/assets/img/blog/blog-3.webp",
      excerpt: "Improve your cooking efficiency and safety with these fundamental techniques."
    },
    {
      id: 4,
      title: "The Science of Sourdough Baking",
      date: "March 30, 2023",
      image: "/assets/img/blog/blog-4.webp",
      excerpt: "Understanding fermentation for better bread results."
    }
  ];

  return (
    <>
      <Breadcrumb pathname="/blog/details" title="Blog Details" />
      
      <section className="min-h-screen bg-[#111115] md:py-10 py-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <article className="bg-[#18181c] rounded-lg overflow-hidden border border-[#23232a] mb-12">
            {/* Featured Image */}
            <div className="relative h-96 w-full">
              <Image 
                src={blogPost.image} 
                alt={blogPost.title} 
                fill
                className="object-cover"
              />
            </div>

            {/* Article Content */}
            <div className="p-8 md:p-12">
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className="px-3 py-1 bg-[#F36B24] text-[#111115] rounded-full text-md font-bold">
                  {blogPost.category}
                </span>
                <span className="text-[#bdbdbd]">{blogPost.date}</span>
                <span className="text-[#bdbdbd]">By {blogPost.author}</span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-white mb-8" style={{ fontFamily: 'var(--font-el-messiri)' }}>{blogPost.title}</h1>

              <div 
                className="text-[#bdbdbd] prose prose-sm max-w-none prose-headings:text-white prose-a:text-[#F36B24] prose-a:hover:text-[#d1a05a] prose-strong:text-white prose-em:text-[#F36B24]"
                dangerouslySetInnerHTML={{ __html: blogPost.content }}
              ></div>

              {/* Tags */}
              <div className="mt-12 pt-8 border-t border-[#23232a]">
                <div className="flex flex-wrap items-center">
                  <span className="text-white mr-3">Tags:</span>
                  <div className="flex flex-wrap gap-2">
                    {blogPost.tags.map((tag, index) => (
                      <a 
                        key={index} 
                        href="#" 
                        className="px-3 py-1 bg-[#111115] text-[#bdbdbd] rounded-full text-md hover:text-[#F36B24] hover:bg-[#18181c] transition-colors duration-300 border border-[#23232a]"
                      >
                        {tag}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Related Posts */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-12 text-center" style={{ fontFamily: 'var(--font-el-messiri)' }}>Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedPosts.map((post) => (
                <div 
                  key={post.id} 
                  className="bg-[#18181c] rounded-lg overflow-hidden border border-[#23232a] hover:border-[#F36B24] transition-all duration-300 group"
                >
                  <div className="relative h-48">
                    <Image 
                      src={post.image} 
                      alt={post.title} 
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <span className="text-md text-[#bdbdbd] mb-2 block">{post.date}</span>
                    <h3 className="text-lg font-bold text-white group-hover:text-[#F36B24] transition-colors duration-300 mb-3" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                      {post.title}
                    </h3>
                    <p className="text-[#bdbdbd] text-md mb-4">{post.excerpt}</p>
                    <Link
                      href={`/blog/details/${post.id}`}
                      className="inline-flex items-center px-4 py-2 bg-[#f36b24] text-white font-bold rounded-lg hover:bg-[#111115] hover:text-[#f36b24] border-2 border-[#f36b24] transition-all duration-300"
                    >
                      Read More
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default BlogDetailsPage;
