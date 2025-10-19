import React, { useState, useEffect } from 'react';
import {motion} from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import styles from '@assets/css/LandingPage.module.css';
import Loader from '@components/Loader.jsx';
import logo from '@assets/logo.png';

const LandingPage = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [counter, setCounter] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  const testimonials = [
    {
      quote: "Thanks to your feedback, we reduced ER wait times by 40% and improved patient satisfaction scores! 👋",
      author: "Dr. Sarah Johnson, Emergency Department"
    },
    {
      quote: "Patient feedback helped us redesign our discharge process, making it faster and more comfortable for families. 👍",
      author: "Maria Rodriguez, Patient Experience Coordinator"
    },
    {
      quote: "Your suggestions led to better communication tools that improved coordination between departments. 💬",
      author: "James Chen, Quality Improvement Manager"
    }
  ];

  const roleCards = [
    {
        icon: '🏥',
        title: 'Patient/Visitor',
        description: 'Share your experience as a patient or visitor receiving care at our facility.',
        authType: 'none',
        type: 'feedback'
    },
    {
        icon: '🧑‍⚕️',
        title: 'Hospital Staff',
        description: 'Internal feedback from medical professionals and healthcare workers.',
        authType: 'email-pin',
        type: 'feedback'
    },
    {
        icon: '📊',
        title: 'QA Team',
        description: 'Quality assurance team members providing systematic feedback and analysis.',
        authType: 'QA',
        type: 'dashboard'
    },
    {
        icon: '👨‍💼',
        title: 'Department Head',
        description: 'Leadership feedback on departmental operations and strategic improvements.',
        authType: 'deptHead',
        type: 'dashboard'
    },
    {
        icon: '👩‍',
        title: 'Hospital Administrator',
        description: 'View performance metrics and provide executive-level oversight on care quality and operations.',
        authType: 'admin',
        type: 'dashboard'
    },
  ];

  const navigate = useNavigate();

  const handleRoleCardClick = (role) => {
    setIsNavigating(true);
    console.log(`Selected Role: ${role.title}, Auth Type: ${role.authType}`);
    
    if (role.authType === 'none') {
      setTimeout(() => navigate('/patient-feedback'), 1000);
    } else if (role.authType === 'email-pin') {
      setTimeout(() => navigate('/staff-verification'), 1000);
    } else if (role.authType === 'QA') {
      setTimeout(() => navigate('/QALogin'), 1000);
    } else if (role.authType === 'deptHead') {
      setTimeout(() => navigate('/departmentLogin'), 1000);
    } else if (role.authType === 'admin') {
      setTimeout(() => navigate('/adminLogin'), 1000);
    }else {
      alert('Invalid role selection');
      setIsNavigating(false);
    }
  };

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
      {/* Global loader for navigation */}
      {isNavigating && <Loader />} 
      
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <motion.h1 
              className={styles.heroHeading}
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >Your Feedback Shapes Better Care</motion.h1>
            <motion.p 
              className={styles.heroText}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >Help us improve by sharing your experience.</motion.p>
            <motion.div 
              className={styles.statsCounter}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span>
                {loadingCount ? 'Loading...' : counter.toLocaleString()}
              </span>
              &nbsp;feedback submissions this month
            </motion.div>
          </div>
        </div>
      </section>

      {/* Role Selection Grid */}
      <motion.section className={styles.roleSection}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: "easeOut" }} >
        <div className={styles.container}>
          <div className={styles.feedbackRoles}>
            <h2 className={styles.sectionHeading}>Provide Feedback</h2>
            <div className={styles.feedbackGrid}>
              {roleCards.filter(role => role.type === 'feedback').map((role, index) => (
                <motion.div
                  key={index}
                  className={styles.roleCard}
                  tabIndex={0}
                  role="button"
                  aria-label={`${role.title} feedback`}
                  onClick={() => handleRoleCardClick(role)}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0, delay: index * 0.2 }}
                >
                  <span className={styles.roleIcon}>{role.icon}</span>
                  <h3 className={styles.roleTitle}>{role.title}</h3>
                  <p className={styles.roleDescription}>{role.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className={styles.dashboardRoles}>
            <h2 className={styles.sectionHeading}>Access Dashboards & Management</h2>
            <div className={styles.dashboardGrid}>
              {roleCards.filter(role => role.type === 'dashboard').map((role, index) => (
                <motion.div
                  key={index}
                  className={styles.roleCard}
                  tabIndex={0}
                  role="button"
                  aria-label={`${role.title} feedback`}
                  onClick={() => handleRoleCardClick(role)}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0, delay: index * 0.2 }}
                >
                  <span className={styles.roleIcon}>{role.icon}</span>
                  <h3 className={styles.roleTitle}>{role.title}</h3>
                  <p className={styles.roleDescription}>{role.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </motion.section>

      {/* Testimonial Carousel */}
      <section 
        className={styles.testimonialSection}
      >
        <div className={styles.container}>
          <div className={styles.testimonialCarousel}>
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`${styles.testimonial} ${index === currentTestimonial ? styles.active : ''}`}
              >
                <blockquote className={styles.testimonialQuote}>"{testimonial.quote}"</blockquote>
                <cite className={styles.testimonialAuthor}>—{testimonial.author}</cite>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerSection}>
              <h4 className={styles.footerHeading}>Quick Links</h4>
              <ul className={styles.footerLinks}>
                <li><a href="#privacy" className={styles.footerLink}>Privacy Policy</a></li>
                <li><a href="#contact" className={styles.footerLink}>Contact Support</a></li>
                <li><a href="#about" className={styles.footerLink}>About This System</a></li>
                <li><a href="#accessibility" className={styles.footerLink}>Accessibility</a></li>
              </ul>
            </div>

            <div className={styles.footerSection}>
              <h4 className={styles.footerHeading}>Support</h4>
              <ul className={styles.footerLinks}>
                <li><a href="mailto:marketing@samcli.com" className={styles.footerLink}>marketing@samcli.com</a></li>
                <li><a href="tel:+63-43-756-2522" className={styles.footerLink}>(043) 756-2522</a></li>
                <li><a href="#help" className={styles.footerLink}>Help Center</a></li>
                <li><a href="#faq" className={styles.footerLink}>FAQ</a></li>
              </ul>
            </div>

            <div className={styles.footerSection}>
              <h4 className={styles.footerHeading}>Trust & Security</h4>
              <div className={styles.trustBadges}>
                <div className={styles.trustBadge}>Secure Submission</div>
                <div className={`${styles.trustBadge} ${styles.dpa}`}>DPA Compliant</div>
                <div className={`${styles.trustBadge} ${styles.data}`}>Data Protected</div>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div className={styles.logo}>
              <img src={logo} alt="logo" className={styles.logoImage} />
              San Antonio Medical Center of Lipa, Inc.
            </div>
            <p className={styles.copyright}>&copy; 2024 General Hospital. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;