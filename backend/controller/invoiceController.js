import { InvoiceModel } from "../model/invoiceModel.js";
import fs from "fs";
import path from "path";

const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

//  Get all invoices
export const getAllInvoices = async (req, res) => {
  try {
    const invoices = await InvoiceModel.getAll();
    res.status(200).json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices." });
  }
};

//  Create a new invoice
export const createInvoice = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Invoice data cannot be empty." });
    }

    let invoiceData = req.body;
    const newInvoice = await InvoiceModel.create(invoiceData);

    res.status(201).json({
      message: "Invoice created successfully",
      invoice: newInvoice,
      pdf_url: invoiceData.invoice_pdf,
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: "Invoice creation failed." });
  }
};

//  Update an invoice (Fixing 404 Error)
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Invoice ID is required." });
    }

    const updatedInvoice = await InvoiceModel.update(id, req.body);

    if (!updatedInvoice) {
      return res.status(404).json({ error: "Invoice not found." });
    }

    res.status(200).json({ message: "Invoice updated successfully", updatedInvoice });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ error: "Invoice update failed." });
  }    
};

// Serve PDF invoice
export const getInvoicePDF = async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "PDF not found" });
  }
};

//  Delete an invoice
export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedInvoice = await InvoiceModel.delete(id);

    if (!deletedInvoice) {
      return res.status(404).json({ error: "Invoice not found." });
    }

    res.status(200).json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ error: "Invoice deletion failed." });
  }
};




