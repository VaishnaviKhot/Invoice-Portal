import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar.js";
import InvoiceForm from "./components/InvoiceForm.js";
import Dashboard from "./components/Dashboard.js";

import './App.css';

const App = () => {
  return (
    <div className="app">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/invoice" element={<InvoiceForm />} />
          <Route path="/dashboard" element={<Dashboard />} />
        
        </Routes>
      </div>
    </div>
  );
};

export default App;
