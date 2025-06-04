import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import bodyParser from "body-parser";
import fileUpload from "express-fileupload";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { InvoiceModel } from "./model/invoiceModel.js";

dotenv.config(); // Load environment variables

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure 'uploads' directory exists
const uploadDir = join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();

// Enable CORS for frontend requests
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

// Serve uploaded files statically and force PDF content type for .pdf files
app.use(
  "/uploads",
  express.static(uploadDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".pdf")) {
        res.set("Content-Type", "application/pdf");
      }
    },
  })
);

// Ensure EMAIL_USER and EMAIL_PASS are set
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error("Missing email credentials in .env file.");
  process.exit(1); // Stop server if credentials are missing
}

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Get all invoices
app.get("/api/invoices", async (req, res) => {
  try {
    const invoices = await InvoiceModel.getAll();
    res.status(200).json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices." });
  }
});

// Create a new invoice
app.post("/api/invoices", async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Invoice data cannot be empty." });
    }

    let filePath = null;
    if (req.files?.e_invoice_file?.name) {
      const file = req.files.e_invoice_file;
      const fileUploadName = `${Date.now()}_${file.name}`;
      filePath = join(uploadDir, fileUploadName); // Ensure a proper file path
      await file.mv(filePath);
      req.body.e_invoice_file = `/uploads/${fileUploadName}`;
    }

    // Save invoice to DB (the invoice_pdf will be generated in the model)
    const newInvoice = await InvoiceModel.create(req.body);
    console.log("New Invoice Created:", newInvoice);

    // Convert the stored relative PDF URL into an absolute path for file existence check
    const pdfAbsolutePath = join(uploadDir, newInvoice.invoice_pdf.replace("/uploads/", ""));
    if (!fs.existsSync(pdfAbsolutePath)) {
      console.error("Invoice PDF not found:", pdfAbsolutePath);
      return res.status(500).json({ error: "Invoice PDF file is missing." });
    }

    // Validate recipient email
    if (!req.body.po_issuer_email || req.body.po_issuer_email.trim() === "") {
      console.error("Error: Recipient email is missing.");
      return res.status(400).json({ error: "Recipient email is required" });
    }

    console.log("Sending invoice email to:", req.body.po_issuer_email);

    const emailOptions = {
      from: process.env.EMAIL_USER,
      to: req.body.po_issuer_email,
      subject: `Invoice Generated for PO #${req.body.po_number}`,
      text: `Hello,\n\nAn invoice has been generated for PO Number: ${req.body.po_number}.\n\nInvoice Details: ${JSON.stringify(
        req.body,
        null,
        2
      )}\n\nThank you.`,
      attachments: [
        {
          filename: `Invoice_${req.body.po_number}.pdf`,
          path: pdfAbsolutePath,
          contentType: "application/pdf",
        },
      ],
    };

    // Send email
    await transporter.sendMail(emailOptions);
    console.log("Email sent successfully!");

    res.status(201).json({
      message: "Invoice created and email sent successfully",
      invoice: newInvoice,
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: "Failed to create invoice or send email." });
  }
});

// Serve PDFs correctly (if you have a separate folder for PDFs)
app.use("/pdfs", express.static(join(__dirname, "pdfs")));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
