import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const RoleSelectionGrid = ({roleCards, setIsNavigating, styles}) => {
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

  return (
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
  )
}

export default RoleSelectionGrid