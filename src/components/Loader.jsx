import React from 'react';
import styles from '../assets/css/Loader.module.css';

const HospitalLoader = () => (
  <div className={styles.overlay}>
    <div className={styles.loader}>
      <svg
        className={styles.heartbeat}
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
      >
        <polyline
          className={styles.line}
          points="0,10 20,10 25,2 32,18 40,10 60,10 65,4 72,16 80,10 100,10"
        />
      </svg>
      <div className={styles.cross}>
        <div className={styles.vertical} />
        <div className={styles.horizontal} />
      </div>
    </div>
  </div>
);

export default HospitalLoader;
