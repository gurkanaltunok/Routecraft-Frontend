'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CitySlide {
  name: string;
  imageUrl: string;
}

const cities: CitySlide[] = [
  {
    name: 'Istanbul',
    imageUrl: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a6e?w=1920&q=80&auto=format&fit=crop',
  },
  {
    name: 'Berlin',
    imageUrl: 'https://images.unsplash.com/photo-1587330979470-3585acb56300?w=1920&q=80&auto=format&fit=crop',
  },
  {
    name: 'New York',
    imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1920&q=80&auto=format&fit=crop',
  },
  {
    name: 'Amsterdam',
    imageUrl: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1920&q=80&auto=format&fit=crop',
  },
  {
    name: 'London',
    imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&q=80&auto=format&fit=crop',
  },
];

export default function FeaturedCities() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % cities.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleCityClick = (cityName: string) => {
    router.push(`/discover?city=${cityName}`);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="relative w-full h-80 rounded-lg overflow-hidden shadow-lg">
      {/* Slides */}
      {cities.map((city, index) => (
        <div
          key={city.name}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-out cursor-pointer"
            style={{
              backgroundImage: `url(${city.imageUrl})`,
              transform: index === currentSlide ? 'scale(1.05)' : 'scale(1)',
            }}
            onClick={() => handleCityClick(city.name)}
          >
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          </div>

          {/* Content */}
          {index === currentSlide && (
            <div className="absolute inset-0 flex items-end justify-center pb-8">
              <div className="text-center text-white px-4">
                <h3 className="text-3xl md:text-4xl font-bold mb-2">
                  Explore {city.name}
                </h3>
                <button
                  onClick={() => handleCityClick(city.name)}
                  className="mt-4 px-6 py-2 bg-[#DA922B] text-white font-semibold rounded-lg hover:bg-[#DA922B]/90 transition-all transform hover:scale-105 shadow-lg"
                >
                  View Routes
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
        {cities.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'w-8 bg-[#DA922B]'
                : 'w-2 bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to ${cities[index].name}`}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => setCurrentSlide((prev) => (prev - 1 + cities.length) % cities.length)}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-[#DA922B] transition-colors p-2 rounded-full hover:bg-white/10 z-10"
        aria-label="Previous slide"
      >
        <svg
          className="w-6 h-6"
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
        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-[#DA922B] transition-colors p-2 rounded-full hover:bg-white/10 z-10"
        aria-label="Next slide"
      >
        <svg
          className="w-6 h-6"
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

