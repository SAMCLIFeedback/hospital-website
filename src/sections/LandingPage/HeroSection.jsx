import React from 'react'
import { motion } from 'framer-motion'

const HeroSection = ({loadingCount, counter, styles}) => {
  return (
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
  )
}

export default HeroSection