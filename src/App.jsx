import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from '@pages/LandingPage/Landingpage.jsx';
import ExternalFeedback from '@pages/ExternalFeedback/ExternalFeedback.jsx';
import ExternalFeedback_visitors from '@pages/ExternalFeedback/ExternalFeedback_visitors.jsx';
import SuccessPage from '@pages/SuccessPage.jsx';
import ScrollToTop from '@components/ScrollToTop.jsx';
import StaffsVerification from '@pages/StaffsVerification.jsx';
import InternalFeedback from '@pages/InternalFeedback/InternalFeedback.jsx';
import QADashboard from '@pages/QADashboard/QADashboard.jsx';
import QALogin from '@pages/LoginPages/QALogin.jsx';
import ProtectedRoute from '@components/ProtectRoute.jsx';

const App = () => {
  return (
    //<Router basename="/hospital-website">
    <Router basename="/">
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/patient-feedback/:token" element={<ExternalFeedback />} />
        <Route path="/visitor-feedback/:token" element={<ExternalFeedback_visitors />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/staff-verification" element={<StaffsVerification />} />
        <Route
          path="/staff-feedback"
          element={
            <ProtectedRoute>
              <InternalFeedback />
            </ProtectedRoute>
          }
        />
        <Route path="/QA-dashboard" element={<QADashboard />} />
        <Route path="/QALogin" element={<QALogin/>} />
      </Routes>
    </Router>
  );
};
export default App;