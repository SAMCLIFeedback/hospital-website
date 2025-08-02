import React from 'react';
import styles from '../assets/css/Card.module.css';

const Card = ({ children }) => (
  <div className={styles.card}>
    {children}
  </div>
);

export default Card;