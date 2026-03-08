import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- Global Components ---
import Navbar from './components/Navbar';

// --- Page Components ---
import Home from './pages/Home';
import Admission from './pages/Admission';
import AdmissionDetail from './pages/Admission_detail';
import Apply from './pages/Apply';
import ApplyDetail from './pages/Apply_detail';
import Login from './pages/Login';
import Register from './pages/Register';
import StaffSearch from './pages/Staff';
import StaffResults from './pages/Staff_results';
import StudentDetail from './pages/Student_details';
import SuperAcc from './pages/SuperAdminAcc';
import SuperCriteria from './pages/SuperAdminCriteria';
import SuperAcademic from './pages/SuperAdminAcademic';


function RequireApplicant({ children }) {
  const isLogin = localStorage.getItem("isLogin") === "true";
  const role = localStorage.getItem("role");

  if (!isLogin) {
    return <Navigate to="/login" replace />;
  }
  
  // Check for "student" OR "applicant" depending on what you saved in DB
  if (role !== "applicant" && role !== "student") {
    return <Navigate to="/staff" replace />;
  }
  return children;
}

function RequireStaff({ children }) {
  const isLogin = localStorage.getItem("isLogin") === "true";
  const role = localStorage.getItem("role");

  if (!isLogin) {
    return <Navigate to="/login" replace />;
  }
  if (role !== "staff") {
    // Redirect students/applicants to their home base
    return <Navigate to="/apply" replace />;
  }
  return children;
}
export default function App() {
  return (
    <BrowserRouter>
      {/* 1. Navbar is placed outside Routes so it renders on every page */}
      <Navbar />

      {/* 2. Page content area (renders based on current URL) */}
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Student/Applicant Routes */}
        <Route path="/admission" element={<Admission />} />
        <Route path="/admission/:id" element={<AdmissionDetail />} />
        <Route path="/apply" element={<RequireApplicant><Apply /></RequireApplicant>} />
        <Route path="/student/details" element={<RequireApplicant><StudentDetail /></RequireApplicant>} />
        
        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Staff Dashboard Routes */}
        <Route path="/staff" element={<RequireStaff><StaffSearch /></RequireStaff>} />
        <Route path="/staff/results" element={<RequireStaff><StaffResults /></RequireStaff>} />
        <Route path="/staff/applicant/:id" element={<RequireStaff><ApplyDetail /></RequireStaff>} />
        <Route path="/staff/super-admin/accounts" element={<RequireStaff><SuperAcc /></RequireStaff>} />
        <Route path="/staff/super-admin/criteria" element={<RequireStaff><SuperCriteria /></RequireStaff>} />
        <Route path="/staff/super-admin/academic" element={<RequireStaff><SuperAcademic /></RequireStaff>} />
        
      </Routes>
    </BrowserRouter>
  );
}