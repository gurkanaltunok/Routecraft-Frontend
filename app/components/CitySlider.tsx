'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CitySlide {
  name: string;
  country: string;
  imageUrl: string;
}

const cities: CitySlide[] = [
  {
    name: 'Istanbul',
    country: 'Turkey',
    imageUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1920&h=1080&fit=crop',
  },
  {
    name: 'Berlin',
    country: 'Germany',
    imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&h=1080&fit=crop&auto=format',
  },
  {
    name: 'Amsterdam',
    country: 'Netherlands',
    imageUrl: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1920&q=80&auto=format&fit=crop',
  },
  {
    name: 'London',
    country: 'United Kingdom',
    imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&q=80&auto=format&fit=crop',
  },
  {
    name: 'Paris',
    country: 'France',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80&auto=format&fit=crop',
  },
];

export default function CitySlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % cities.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const handleCityClick = (cityName: string) => {
    router.push(`/trips?search=${encodeURIComponent(cityName)}`);
  };

  const handleImageError = (cityName: string) => {
    setImageErrors((prev) => ({ ...prev, [cityName]: true }));
  };

  const getImageUrl = (city: CitySlide) => {
    // Fallback URLs for cities that might have issues
    const fallbacks: { [key: string]: string } = {
      Berlin: 'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=1920&h=1080&fit=crop&auto=format',
    };
    
    if (imageErrors[city.name] && fallbacks[city.name]) {
      return fallbacks[city.name];
    }
    return city.imageUrl;
  };

  return (
    <div className="relative w-full h-[200px] md:h-[320px] rounded-2xl overflow-hidden shadow-xl">
      {/* Slides */}
      {cities.map((city, index) => (
        <div
          key={city.name}
          className={`absolute inset-0 transition-opacity duration-1000 cursor-pointer ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => handleCityClick(city.name)}
        >
          <div
            className="absolute inset-0 transition-transform duration-[10000ms] ease-out"
            style={{
              backgroundImage: `url(${getImageUrl(city)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 65%',
              transform: index === currentSlide ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {/* Hidden img for error detection */}
            <img
              src={getImageUrl(city)}
              alt={city.name}
              className="hidden"
              onError={() => handleImageError(city.name)}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
          </div>
        </div>
      ))}

      {/* City Action Button - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={() => handleCityClick(cities[currentSlide].name)}
          className="bg-black/50 backdrop-blur-sm text-white font-bold uppercase tracking-wide rounded-full px-5 py-1.5 text-sm hover:bg-black/70 transition-all transform hover:scale-105 shadow-lg"
        >
          SHOW ROUTES IN {cities[currentSlide].name}
        </button>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 right-4 flex space-x-2 z-10">
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
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-[#DA922B] transition-colors p-2 rounded-full hover:bg-white/10 z-10 bg-black/20 backdrop-blur-sm"
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
        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-[#DA922B] transition-colors p-2 rounded-full hover:bg-white/10 z-10 bg-black/20 backdrop-blur-sm"
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

