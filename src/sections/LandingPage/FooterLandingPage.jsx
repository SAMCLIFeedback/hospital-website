import logo from '@assets/logo.png';

const FooterLandingPage = ({styles}) => {
  return (
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
  )
}

export default FooterLandingPage