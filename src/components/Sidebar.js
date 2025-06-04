import React from "react";
import { Link } from "react-router-dom";
import "../styles/Sidebar.css";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2>Invoice System</h2>
      <nav>
        <ul>
          <li><Link to="/invoice">Invoice Form</Link></li>
          <li><Link to="/dashboard">Dashboard</Link></li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
