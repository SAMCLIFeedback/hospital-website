import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from '@pages/LandingPage/Landingpage.jsx';
import ExternalFeedback from '@pages/ExternalFeedback/ExternalFeedback.jsx';
import SuccessPage from '@pages/SuccessPage.jsx';
import ScrollToTop from '@components/ScrollToTop.jsx';
import StaffsVerification from '@pages/StaffsVerification.jsx';
import InternalFeedback from '@pages/InternalFeedback/InternalFeedback.jsx';
import QADashboard from '@pages/QADashboard/QADashboard.jsx';
import DeptHeadDashboard from '@pages/DeptHeadDashboard.jsx';
import DepartmentLogin from '@pages/LoginPages/DepartmentLogin.jsx';
import QALogin from '@pages/LoginPages/QALogin.jsx';
import AdminDashboard from '@pages/AdminDashboard.jsx';
import AdminLogin from '@pages/LoginPages/AdminLogin.jsx';
import ProtectedRoute from '@components/ProtectRoute.jsx';

const App = () => {
  return (
    //<Router basename="/hospital-website">
    <Router basename="/">
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/patient-feedback" element={<ExternalFeedback />} />
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
        <Route path="/deptHead-Dashboard" element={<DeptHeadDashboard />} />
        <Route path="/departmentLogin" element={<DepartmentLogin/>} />
        <Route path="/adminDashboard" element={<AdminDashboard/>} />
        <Route path="/QALogin" element={<QALogin/>} />
        <Route path="/AdminLogin" element={<AdminLogin/>} />
      </Routes>
    </Router>
  );
};
export default App;