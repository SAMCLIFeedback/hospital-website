import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage.jsx';
import ExternalFeedback from './components/ExternalFeedback.jsx';
import SuccessPage from './components/SuccessPage.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import StaffsVerification from './components/StaffsVerification.jsx';
import StaffFeedbackForm from './components/InternalFeedback.jsx';
import QADashboard from './components/QADashboard.jsx';
import DeptHeadDashboard from './components/DeptHeadDashboard.jsx';
import DepartmentLogin from './components/DepartmentLogin.jsx';
import QALogin from './components/QALogin.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import AdminLogin from './components/AdminLogin.jsx';

const App = () => {
  return (
    // Add the basename prop here
    //<Router basename="/">
    <Router basename="/hospital-website">
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/patient-feedback" element={<ExternalFeedback />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/staff-verification" element={<StaffsVerification />} />
        <Route path="/staff-feedback" element={<StaffFeedbackForm />} />
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