'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CitySlide {
  name: string;
  imageUrl: string;
  subtitle: string;
}

const cities: CitySlide[] = [
  {
    name: 'Istanbul',
    imageUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1920&q=80',
    subtitle: 'Discover the best hiking trails and travel plans created by locals.',
  },
  {
    name: 'Berlin',
    imageUrl: 'https://images.unsplash.com/photo-1587330979470-3585acb56300?w=1920&q=80',
    subtitle: 'Explore hidden gems and scenic routes through the heart of Europe.',
  },
  {
    name: 'New York',
    imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1920&q=80',
    subtitle: 'Experience the city that never sleeps through curated local adventures.',
  },
  {
    name: 'Amsterdam',
    imageUrl: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1920&q=80',
    subtitle: 'Navigate beautiful canals and discover authentic Dutch experiences.',
  },
  {
    name: 'London',
    imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&q=80',
    subtitle: 'Walk through history and modern culture with expert-guided routes.',
  },
];

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % cities.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSlideClick = (cityName: string) => {
    router.push(`/discover?city=${cityName}`);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Slides */}
      {cities.map((city, index) => (
        <div
          key={city.name}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-out"
            style={{
              backgroundImage: `url(${city.imageUrl})`,
              transform: index === currentSlide ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Content */}
          {index === currentSlide && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white px-4 max-w-4xl mx-auto">
                <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
                  Explore {city.name}
                </h1>
                <p className="text-xl md:text-2xl mb-8 text-gray-100 animate-fade-in-delay">
                  {city.subtitle}
                </p>
                <button
                  onClick={() => handleSlideClick(city.name)}
                  className="px-8 py-4 bg-[#DA922B] text-white text-lg font-semibold rounded-lg hover:bg-[#DA922B]/90 transition-all transform hover:scale-105 shadow-2xl animate-fade-in-delay-2"
                >
                  View Routes
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3">
        {cities.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'w-8 bg-[#DA922B]'
                : 'w-2 bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => setCurrentSlide((prev) => (prev - 1 + cities.length) % cities.length)}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-[#DA922B] transition-colors p-2 rounded-full hover:bg-white/10"
        aria-label="Previous slide"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <button
        onClick={() => setCurrentSlide((prev) => (prev + 1) % cities.length)}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-[#DA922B] transition-colors p-2 rounded-full hover:bg-white/10"
        aria-label="Next slide"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}

