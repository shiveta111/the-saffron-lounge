"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Breadcrumb from '../../../components/Common/Breadcrumb';

const ShopDetailsPage = () => {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  
  // Sample product data
  const product = {
    id: 1,
    name: "Truffle Pasta",
    price: 24.99,
    originalPrice: 29.99,
    description: "Indulge in our signature truffle pasta, featuring al dente pasta tossed in a rich, aromatic truffle sauce made from the finest ingredients. Garnished with parmesan shavings and fresh herbs.",
    category: "Main Course",
    rating: 4.8,
    images: [
      "/assets-main/recipe-1.webp",
      "/assets-main/recipe-2.png",
      "/assets-main/recipe-5.webp",
      "/assets-main/recipe-6.webp"
    ],
    tags: ["Pasta", "Truffle", "Italian", "Vegetarian"],
    dietaryNotes: "Vegetarian",
    ingredients: ["Pasta", "Truffle Oil", "Parmesan Cheese", "Garlic", "Fresh Herbs", "Olive Oil"],
    reviews: [
      {
        id: 1,
        name: "Sarah Johnson",
        rating: 5,
        date: "June 15, 2023",
        comment: "Absolutely divine! The truffle flavor was perfectly balanced and not overpowering."
      },
      {
        id: 2,
        name: "Michael Chen",
        rating: 4,
        date: "June 10, 2023",
        comment: "Excellent pasta with a rich truffle flavor. Will definitely order again."
      }
    ]
  };

  const relatedProducts = [
    {
      id: 2,
      name: "Grilled Salmon",
      price: 32.99,
      image: "/assets-main/recipe-2.png",
      rating: 4.9
    },
    {
      id: 3,
      name: "Chocolate Cake",
      price: 12.99,
      image: "/assets-main/recipe-5.webp",
      rating: 4.8
    },
    {
      id: 4,
      name: "Caesar Salad",
      price: 16.99,
      image: "/assets-main/recipe-6.webp",
      rating: 4.6
    }
  ];

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  return (
    <>
      <Breadcrumb pathname="/shop/details" title="Product Details" />
      
      <section className="min-h-screen bg-[#111115] md:py-10 py-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          {/* Product Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
            {/* Product Images */}
            <div>
              <div className="relative aspect-[5/4] rounded-lg overflow-hidden mb-6">
                <Image
                  src={product.images[selectedImage]}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                {product.originalPrice && (
                  <div className="absolute top-6 left-6 bg-[#F0681D] text-[#241c1b] px-4 py-2 rounded-full text-lg font-bold">
                    Sale
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <div
                    key={index}
                    className={`relative aspect-[5/4] rounded-lg overflow-hidden cursor-pointer border-4 ${
                      selectedImage === index ? 'border-[#F0681D]' : 'border-[#23232a]'
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                {product.name}
              </h1>
              <div className="flex items-center mb-6">
                <div className="flex text-[#F0681D] mr-3">
                  {[...Array(5)].map((_, i) => (
                    <svg 
                      key={i} 
                      className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'fill-current' : 'fill-none'}`} 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  ))}
                </div>
                <span className="text-[#bdbdbd] text-md">{product.rating} (128 Reviews)</span>
              </div>
              
              <div className="mb-6">
                {product.originalPrice && (
                  <span className="text-2xl text-[#bdbdbd] line-through mr-3">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-4xl font-bold text-[#F0681D]">
                  ${product.price.toFixed(2)}
                </span>
              </div>
              
              <p className="text-[#bdbdbd] text-md mb-8" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                {product.description}
              </p>

              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  Ingredients
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.map((ingredient, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-[#18181c] text-[#bdbdbd] rounded-full text-md border border-[#23232a]"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  Dietary Information
                </h3>
                <div className="flex items-center gap-1">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    product.dietaryNotes === 'Vegetarian' ? 'bg-green-500' :
                    product.dietaryNotes === 'Non-Vegetarian' ? 'bg-red-500' :
                    product.dietaryNotes === 'Vegan' ? 'bg-purple-500' :
                    'bg-gray-500'
                  }`}>
                    <div className="w-1 h-1 bg-white rounded-sm"></div>
                  </div>
                  <span className="text-md text-[#bdbdbd]">({product.dietaryNotes})</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 mb-8">
                <div className="flex items-center">
                  <span className="text-white mr-4">Quantity:</span>
                  <div className="flex items-center border border-[#23232a] rounded-md">
                    <button 
                      onClick={decrementQuantity}
                      className="w-10 h-10 flex items-center justify-center text-[#bdbdbd] hover:text-white hover:bg-[#18181c] transition-colors duration-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                      </svg>
                    </button>
                    <span className="w-12 text-center text-white">{quantity}</span>
                    <button 
                      onClick={incrementQuantity}
                      className="w-10 h-10 flex items-center justify-center text-[#bdbdbd] hover:text-white hover:bg-[#18181c] transition-colors duration-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <button className="px-8 py-1.5 bg-[#F0681D] text-[#111115] font-bold rounded-md hover:bg-[#d1a05a] transition-colors duration-300">
                  Add to Cart
                </button>
              </div>

              <div className="border-t border-[#23232a] pt-6">
                <div className="flex items-center mb-3">
                  <span className="text-white mr-3">Category:</span>
                  <span className="text-[#F0681D]">{product.category}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-white mr-3">Tags:</span>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <a 
                        key={index} 
                        href="#" 
                        className="text-[#bdbdbd] hover:text-[#F0681D] transition-colors duration-300"
                      >
                        {tag}{index < product.tags.length - 1 ? ',' : ''}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Product Tabs */}
          <div className="mb-20">
            <div className="flex border-b border-[#23232a] mb-8">
              <button
                onClick={() => setActiveTab('description')}
                className={`px-6 py-1.5 font-bold text-lg transition-colors duration-300 ${
                  activeTab === 'description'
                    ? 'text-[#F0681D] border-b-2 border-[#F0681D]'
                    : 'text-[#bdbdbd] hover:text-[#F0681D]'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-6 py-1.5 font-bold text-lg transition-colors duration-300 ${
                  activeTab === 'reviews'
                    ? 'text-[#F0681D] border-b-2 border-[#F0681D]'
                    : 'text-[#bdbdbd] hover:text-[#F0681D]'
                }`}
              >
                Reviews ({product.reviews.length})
              </button>
            </div>
            
            {activeTab === 'description' ? (
              <div className="prose prose-sm max-w-none text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                <p>
                  Our signature truffle pasta is a masterpiece of culinary artistry.
                  We start with the finest artisanal pasta, cooked to perfect al dente texture.
                  The sauce is a delicate balance of premium truffle oil, aged parmesan,
                  and a hint of garlic, creating a rich and aromatic experience.
                </p>
                <p className="mt-4">
                  Each ingredient is carefully selected and prepared to ensure the highest quality.
                  The fresh herbs are sourced daily from local farms, and our truffle oil is imported
                  from the finest producers in Italy. This dish represents the pinnacle of our
                  culinary expertise and commitment to excellence.
                </p>
                <h3 className="text-xl font-bold text-white mt-8 mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  Preparation
                </h3>
                <p style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                  Prepared fresh to order by our expert chefs, this dish typically takes 15-20 minutes
                  to prepare. For the best experience, we recommend pairing it with a glass of
                  Chardonnay or Pinot Noir.
                </p>
              </div>
            ) : (
              <div>
                <div className="space-y-6">
                  {product.reviews.map((review) => (
                    <div key={review.id} className="bg-[#18181c] rounded-lg p-6 border border-[#23232a]">
                      <div className="flex justify-between mb-4">
                        <h4 className="text-lg font-bold text-white">{review.name}</h4>
                        <span className="text-[#bdbdbd]">{review.date}</span>
                      </div>
                      <div className="flex text-[#F0681D] mb-4">
                        {[...Array(5)].map((_, i) => (
                          <svg 
                            key={i} 
                            className={`w-5 h-5 ${i < review.rating ? 'fill-current' : 'fill-none'}`} 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>{review.comment}</p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 bg-[#18181c] rounded-lg p-6 border border-[#23232a]">
                  <h3 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                    Add a Review
                  </h3>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white mb-2">Name</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-[#111115] border border-[#23232a] text-white placeholder:text-sm placeholder-[#666] focus:outline-none focus:border-[#F0681D] transition-colors duration-300 rounded-md"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-white mb-2">Email</label>
                        <input
                          type="email"
                          className="w-full px-4 py-3 bg-[#111115] border border-[#23232a] text-white placeholder:text-sm placeholder-[#666] focus:outline-none focus:border-[#F0681D] transition-colors duration-300 rounded-md"
                          placeholder="Your email"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-white mb-2">Rating</label>
                      <div className="flex text-[#F0681D]">
                        {[...Array(5)].map((_, i) => (
                          <svg 
                            key={i} 
                            className="w-8 h-8 fill-none stroke-current cursor-pointer hover:fill-current" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-white mb-2">Your Review</label>
                      <textarea
                        rows={4}
                        className="w-full px-4 py-3 bg-[#111115] border border-[#23232a] text-white placeholder:text-sm placeholder-[#666] focus:outline-none focus:border-[#F0681D] transition-colors duration-300 rounded-md resize-none"
                        placeholder="Share your experience..."
                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      className="px-8 py-1.5 bg-[#F0681D] text-[#111115] font-bold rounded-md hover:bg-[#d1a05a] transition-colors duration-300"
                    >
                      Submit Review
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Related Products */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-12 text-center" style={{ fontFamily: 'var(--font-el-messiri)' }}>
              Related Products
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {relatedProducts.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#18181c] rounded-lg overflow-hidden border border-[#23232a] hover:border-[#F0681D] transition-all duration-300 group"
                >
                  <div className="relative h-96">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                    <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#F0681D] text-[#111115] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-white group-hover:text-[#F36B24] transition-colors duration-300" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                        {item.name}
                      </h3>
                      <span className="text-xl font-bold text-[#F0681D]">${item.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center mb-4">
                      <div className="flex text-[#F0681D]">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(item.rating) ? 'fill-current' : 'fill-none'}`}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-[#bdbdbd] text-md ml-2">{item.rating}</span>
                    </div>
                    <button className="w-full py-1.5 bg-[#18181c] text-white border border-[#23232a] hover:bg-[#F0681D] hover:text-[#111115] hover:border-[#F0681D] transition-all duration-300 font-bold rounded-md">
                      Add to Cart
                    </button>
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

export default ShopDetailsPage;
