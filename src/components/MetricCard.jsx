import styles from '@assets/css/Dashboard.module.css';
import PropTypes from 'prop-types';

const MetricCard = ({ title, value, icon, variant }) => {
  const variantKey = `metricCard${variant.charAt(0).toUpperCase() + variant.slice(1)}`;
  return (
    <div className={`${styles.metricCard} ${styles[variantKey]}`}>
      <div className={styles.metricIcon}>
        <i className={icon}></i>
      </div>
      <div className={styles.metricContent}>
        <h3>{title}</h3>
        <p className={styles.metricValue}>{value}</p>
      </div>
    </div>
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  icon: PropTypes.string.isRequired,
  variant: PropTypes.string.isRequired,
};

export default MetricCard;