import { useState, useEffect } from 'react';
import styles from '@assets/css/LandingPage.module.css';
import Loader from '@components/Loader.jsx';
import testimonials from './testimonials.js'
import roleCards from './roleCards.js'
import HeroSection from '@sections/LandingPage/HeroSection.jsx';
import RoleSelectionGrid from '@sections/LandingPage/RoleSelectionGrid.jsx';
import Testimonials from '@sections/LandingPage/Testimonials.jsx';
import FooterLandingPage from '@sections/LandingPage/FooterLandingPage.jsx';

const LandingPage = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [counter, setCounter] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const fetchFeedbackCount = async () => {
      try {
        const BASE_URL = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${BASE_URL}/api/feedback-count-month`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCounter(data.count);
      } catch (error) {
        console.error("Failed to fetch feedback count:", error);
        setCounter('N/A');
      } finally {
        setLoadingCount(false);
      }
    };

    fetchFeedbackCount();

    const testimonialInterval = setInterval(() => {
      setCurrentTestimonial(prevIndex =>
        (prevIndex + 1) % testimonials.length
      );
    }, 5000);

    return () => clearInterval(testimonialInterval);
  }, []);

  return (
    <div className={styles.landingPage}>
      {isNavigating && <Loader />} 
      <HeroSection loadingCount={loadingCount} counter={counter} styles={styles}/>
      <RoleSelectionGrid roleCards={roleCards} setIsNavigating={setIsNavigating} use styles={styles}/>
      <Testimonials testimonials={testimonials} currentTestimonial={currentTestimonial} styles={styles}/>
      <FooterLandingPage styles={styles}/>
    </div>
  );
};

export default LandingPage;