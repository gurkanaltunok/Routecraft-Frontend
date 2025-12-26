'use client';

import LandingHeader from './LandingHeader';
import HeroSlider from './HeroSlider';
import HowItWorks from './HowItWorks';
import FeaturedRoutes from './FeaturedRoutes';
import CTABanner from './CTABanner';
import LandingFooter from './LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        <HeroSlider />
        <HowItWorks />
        <FeaturedRoutes />
        <CTABanner />
      </main>
      <LandingFooter />
    </div>
  );
}

