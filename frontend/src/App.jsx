import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import UserTypeSelection from './components/UserTypeSelection'
import EmployeePage from './pages/EmployeePage'
import JobBoardPage from './pages/JobBoardPage'
import CompanyPage from './pages/CompanyPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<JobBoardPage />} />
      <Route path="/welcome" element={<UserTypeSelection />} />
      <Route path="/employee" element={<EmployeePage />} />
      <Route path="/jobseeker/jobs" element={<JobBoardPage />} />
      <Route path="/jobseeker/company" element={<CompanyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

