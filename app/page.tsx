import React from 'react';
import { HeroSection } from '@/components/home/hero-section';

const HomePage = React.memo(() => {
  return (
    <div className="relative">
      <HeroSection />
    </div>
  );
});

HomePage.displayName = 'HomePage';

export default HomePage;