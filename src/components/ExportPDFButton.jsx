import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ExportPDFModal from './ExportPDFModal';
import styles from '../assets/css/ExportButton.module.css';

const ExportPDFButton = ({
  data,
  initialSelectedIds,
  dashboardType,
  prepareRawFeedbackForDisplay,
  variant = 'default',
  size = 'medium',
  showIcon = true,
  showText = true,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const buttonVariants = {
    default: `${styles.actionButton} ${styles.confirmButton}`,
    primary: `${styles.actionButton} ${styles.primaryButton}`,
    secondary: `${styles.actionButton} ${styles.secondaryButton}`,
    outline: `${styles.actionButton} ${styles.outlineButton}`,
  };

  const buttonSizes = {
    small: styles.smallButton,
    medium: styles.mediumButton,
    large: styles.largeButton,
  };

  const buttonClass = `
    ${buttonVariants[variant] || buttonVariants.default}
    ${buttonSizes[size] || buttonSizes.medium}
    ${className}
  `.trim();

  const buttonContent = (
    <>
      {showIcon && <i className="fas fa-file-pdf"></i>}
      {showText && (
        <span style={showIcon ? { marginLeft: '8px' } : {}}>
          Export to PDF
        </span>
      )}
    </>
  );

  return (
    <>
      <button
        className={buttonClass}
        onClick={() => setIsModalOpen(true)}
        title="Export feedback to PDF with advanced options"
        aria-label="Export feedback to PDF"
      >
        {buttonContent}
      </button>

      {isModalOpen && (
        <ExportPDFModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialData={data}
          initialSelectedIds={initialSelectedIds}
          dashboardType={dashboardType}
          prepareRawFeedbackForDisplay={prepareRawFeedbackForDisplay}
        />
      )}
    </>
  );
};

ExportPDFButton.propTypes = {
  data: PropTypes.array.isRequired,
  initialSelectedIds: PropTypes.array.isRequired,
  dashboardType: PropTypes.oneOf(['qa', 'dept', 'admin']).isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['default', 'primary', 'secondary', 'outline']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showIcon: PropTypes.bool,
  showText: PropTypes.bool,
  className: PropTypes.string,
};

export default ExportPDFButton;