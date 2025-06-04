import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/invoices");
      setInvoices(res.data);
    } catch (error) {
      console.error("Error fetching invoices:", error.message);
    }
  };

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.po_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard">
      <h2>Invoice Dashboard</h2>
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by PO Number"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Invoice ID</th>
            <th>PO Number</th>
            <th>Total Invoice Amount</th>
            <th>Invoice PDF</th>
          </tr>
        </thead>
        <tbody>
          {filteredInvoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.id}</td>
              <td>{invoice.po_number}</td>
              <td>{invoice.total_invoice_amount}</td>
              <td>
                {invoice.invoice_pdf ? (
                  <a href = {`http://localhost:5000${invoice.invoice_pdf}`} target = "_blank" rel="noopener noreferrer">
                    View PDF

                  </a>
                ) :(

                  "Not Available"

                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
