import React, { useState, useEffect } from "react";
import axios from "axios";
import { toWords } from "number-to-words";
import "../styles/InvoiceForm.css";


const InvoiceForm = () => {
  const [step, setStep] = useState(1);
  const [invoice, setInvoice] = useState({
    billing_address: "",
    shipping_address: "",
    document_number: "",
    document_type: "INV",
    invoice_date: "",
    po_number: "",
    po_el_date: "",
    remaining_po_amount: "",
    po_issuer_email: "",
    gst_payable_rcm: "No",
    basic_invoice_value: "",
    discount_if_any: "",
    taxable_value: "",
    total_tax_amount: "",
    total_invoice_amount: "",
    invoice_amount_words: "",
    round_off_value: "",
    gstn_portal_status: "Not Uploaded",
    is_import: "No",
    import_date: "",
    bill_of_entry_no: "",
    e_invoice_available: "No",
    eway_bill_no: "",
    hsn_code: "",
    invoice_copy: null,
    e_invoice_file: null,
    invoice_pdf: null,
  });

  const [file, setFile] = useState(null);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/invoices");
        setExistingDocuments(response.data.map((doc) => doc.document_number));
      } catch (error) {
        console.error("Error fetching document numbers:", error);
      }
    };
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (invoice.total_invoice_amount && !isNaN(invoice.total_invoice_amount)) {
      setInvoice((prev) => ({
        ...prev,
        invoice_amount_words: toWords(parseInt(invoice.total_invoice_amount, 10)),
      }));
    } else {
      setInvoice((prev) => ({ ...prev, invoice_amount_words: "" }));
    }
  }, [invoice.total_invoice_amount]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setInvoice((prev) => {
      let updatedInvoice = { ...prev };

      if (type === "file") {
        setFile(files[0]);
      } else {
        updatedInvoice[name] = value.trim();

        if (name === "document_number" && existingDocuments.includes(value)) {
          setErrors((prevErrors) => ({
            ...prevErrors,
            document_number: "Duplicate Document Number! Enter a unique one.",
          }));
          return prev;
        } else {
          setErrors((prevErrors) => ({ ...prevErrors, document_number: "" }));
        }

        if (["basic_invoice_value", "discount_if_any"].includes(name)) {
          const basicValue = parseFloat(updatedInvoice.basic_invoice_value) || 0;
          const discount = parseFloat(updatedInvoice.discount_if_any) || 0;

          updatedInvoice.taxable_value = (basicValue - discount).toFixed(2);
          const gstAmount = (parseFloat(updatedInvoice.taxable_value) * 0.18).toFixed(2);
          updatedInvoice.total_tax_amount = gstAmount;
          let totalInvoice = parseFloat(updatedInvoice.taxable_value) + parseFloat(gstAmount);
          updatedInvoice.round_off_value = (Math.round(totalInvoice) - totalInvoice).toFixed(2);
          updatedInvoice.total_invoice_amount = Math.round(totalInvoice);
        }
      }
      return updatedInvoice;
    });

    if (["total_invoice_amount", "remaining_po_amount"].includes(name)) {
      const totalInvoiceAmount = parseFloat(value) || 0;
      const remainingPoAmount = parseFloat(invoice.remaining_po_amount) || 0;

      if (totalInvoiceAmount > remainingPoAmount) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          total_invoice_amount: "Total Invoice Amount cannot exceed Remaining PO Amount!",
        }));
      } else {
        setErrors((prevErrors) => ({ ...prevErrors, total_invoice_amount: "" }));
      }
    }
  };

  const validateFields = () => {
    const step1Fields = ["billing_address", "shipping_address","document_type" , "document_number", "invoice_date", "po_number", "po_issuer_email", "po_el_date" , "import_date"];
    const step2Fields = ["basic_invoice_value","discount_if_any", "total_invoice_amount", "invoice_amount_words",
                          "taxable_value", "total_tax_amount", "remaining_po_amount",  "round_off_value" , "eway_bill_no",  ];

    const requiredFields = step === 1 ? step1Fields : step2Fields;
    let newErrors = {};
    requiredFields.forEach((field) => {
      if (!invoice[field] || invoice[field].toString().trim() === "") {
        newErrors[field] = "This field is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!validateFields()) return;
  
    try {
      let filePath = invoice.e_invoice_file;
    
      // Handle file upload if applicable
      if (invoice.e_invoice_available === "Yes" && file) {
        const fileData = new FormData();
        fileData.append("file", file);
        const fileResponse = await axios.post("http://localhost:5000/api/upload", fileData);
        filePath = fileResponse.data.filePath;
      }
    
      // Merge filePath with invoice data
      const invoiceData = { ...invoice, e_invoice_file: filePath };
    
      console.log("Sending invoice data:", invoiceData);
    
      const response = await axios.post("http://localhost:5000/api/invoices", invoiceData);
    
      // Only show success alert if request was successful
      if (response.status === 200 || response.status === 201) {
        alert("Invoice submitted successfully!");
      } else {
        throw new Error("Unexpected response status: " + response.status);
      }
    
    } catch (error) {
      console.error("Failed to submit invoice:", error);
      alert("Failed to submit invoice! " + (error.response?.data?.message || error.message));
    }
  };
    
  

  return (
    <form onSubmit={handleSubmit} className="invoice-form">
      <h2>Invoice Form - Step {step} of 2</h2>

      {step === 1 && (
  <div className="form-grid">
    {[
      { label: "Billing Address", name: "billing_address", type: "text" },
      { label: "Shipping Address", name: "shipping_address", type: "text" },
      { label: "Document Type", name: "document_type", type: "select", options: ["Invoice", "Debit", "Credit"] },
      { label: "Document Number", name: "document_number", type: "text" },
      { label: "Invoice Date", name: "invoice_date", type: "date" },
      { label: "PO Number", name: "po_number", type: "text" },
      { label: "PO Issuer Email", name: "po_issuer_email", type: "email" },
      { label: "PO El Date", name: "po_el_date", type: "date" },
      { label: "Import Date", name: "import_date", type: "date" },
    ].map(({ label, name, type, options }) => (
      <div className="form-group" key={name}>
        <label>{label} *</label>
        {type === "select" ? (
          <select
            name={name}
            value={invoice[name]}
            onChange={handleChange}
            required
            style={errors[name] ? { border: "1px solid red" } : {}}
          >
            <option value="">Select {label}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            name={name}
            value={invoice[name]}
            onChange={handleChange}
            required
            style={errors[name] ? { border: "1px solid red" } : {}}
          />
        )}
        {errors[name] && <p className="error-text">{errors[name]}</p>}
      </div>
    ))}
  </div>
)}

      {step === 2 &&
       <div className="form-grid">
        {[
            { label: "Basic Invoice Value", name: "basic_invoice_value", type: "number"  },
            { label: "Discount(If Any)", name: "discount_if_any", type: "number" },
            { label: "Remaining PO Amount", name: "remaining_po_amount", type: "number" },
            { label: "Total Tax Amount", name: "total_tax_amount", type: "number" },
            { label: "Taxable Value ", name: "taxable_value", type: "number" },
            { label: "Total Invoice Amount", name: "total_invoice_amount", type: "number" },
            { label: "Invoice Amount Into  Words", name: "invoice_amount_words", type: "text" },
            { label: "Round Off Value", name: "round_off_value", type: "number" },
            { label: "Bill of Entry No", name: "bill_of_entry_no", type:"number" },
            { label: "E-Invoice Available", name: "e_invoice_available", type: "text" },
            { label: "E-Way Bill No", name: "eway_bill_no", type: "text" },
          ].map(({ label, name, type }) => (
            <div className="form-group" key={name}>
              <label>{label} *</label>
              <input
                type={type}
                name={name}
                value={invoice[name]}
                onChange={handleChange}
                required
                style={errors[name] ? { border: "-1px solid red" } : {}}
              />
              {errors[name] && <p className="error-text" >{errors[name]}</p>}
            </div>
          ))}
        </div>
        }

      <div className="form-navigation">
        {step > 1 && <button type="button" onClick={() => setStep(step - 1)}>Back</button>}
        {step < 2 ? (
          <button type="button" onClick={() => validateFields() && setStep(2)}>Next</button>
        ) : (
          <button type="submit">Submit</button>
        )}
      </div>
    </form>
  );
};

export default InvoiceForm;
