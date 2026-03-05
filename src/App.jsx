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

function RequireAuth({ children }) {
  const isLogin = typeof window !== "undefined" ? localStorage.getItem("isLogin") : false;
  if (!isLogin) {
    return <Navigate to="/login" />
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
        <Route path="/apply" element={<RequireAuth><Apply /></RequireAuth>} />
        
        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Staff Dashboard Routes */}
        <Route path="/staff" element={<RequireAuth><StaffSearch /></RequireAuth>} />
        <Route path="/staff/results" element={<RequireAuth><StaffResults /></RequireAuth>} />
        <Route path="/staff/applicant/:id" element={<RequireAuth><ApplyDetail /></RequireAuth>} />
        
      </Routes>
    </BrowserRouter>
  );
}