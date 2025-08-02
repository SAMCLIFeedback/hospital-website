import React from 'react';
import styles from '../assets/css/FormField.module.css';

const FormField = ({ label, type, value, onChange, placeholder, required }) => (
  <div className={styles.formField}>
    <label className={styles.label}>{label}</label>
    <div className={styles.inputWrapper}>
      <input
        type={type}
        className={styles.input}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={label}
        required={required}
      />
    </div>
  </div>
);

export default FormField;