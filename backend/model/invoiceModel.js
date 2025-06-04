import { db } from "../config/db.js";
import fs from "fs";
import path from "path";
import PDFDocumentWithTables from "pdfkit-table";
import numberToWords from "number-to-words";

export const InvoiceModel = {
  create: async (invoiceData) => {
    if (!invoiceData) throw new Error("Invoice data is required.");

    const requiredFields = [
      "billing_address", "shipping_address", "document_number", "document_type",
      "invoice_date", "po_number", "po_issuer_email", "po_el_date", "gst_payable_rcm",
      "total_invoice_amount", "total_tax_amount", "eway_bill_no", "import_date",
      "remaining_po_amount"
    ];

    for (const field of requiredFields) {
      if (!invoiceData[field] || invoiceData[field].toString().trim() === "") {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Convert numeric values and validate them
    const totalInvoiceAmount = parseFloat(invoiceData.total_invoice_amount);
    const remainingPoAmount = parseFloat(invoiceData.remaining_po_amount);

    if (isNaN(totalInvoiceAmount) || isNaN(remainingPoAmount)) {
      throw new Error("Invalid numeric values for invoice or PO amount.");
    }

    if (totalInvoiceAmount > remainingPoAmount) {
      throw new Error("Total invoice amount should not exceed the remaining PO amount.");
    }

    try {
      // Generate PDF and set additional fields
      // The function now returns a relative URL (e.g., /uploads/invoice_1635309876543.pdf)
      const pdfRelativeUrl = await generateInvoicePDF(invoiceData);
      invoiceData.invoice_pdf = pdfRelativeUrl;
      invoiceData.invoice_amount_words = numberToWords.toWords(totalInvoiceAmount);

      // Remove bill_of_entry_number before inserting into the DB
      const { bill_of_entry_number, ...filteredInvoiceData } = invoiceData;

      // Construct query dynamically
      const fieldsList = Object.keys(filteredInvoiceData)
        .map((field) => `\`${field}\``)
        .join(", ");
      const values = Object.values(filteredInvoiceData);
      const placeholders = values.map(() => "?").join(", ");

      const query = `INSERT INTO invoices (${fieldsList}) VALUES (${placeholders})`;
      console.log("Executing SQL Query:", query, values);

      const [result] = await db.execute(query, values);
      // Return the new invoice data along with its new ID
      return { ...filteredInvoiceData, id: result.insertId };
    } catch (error) {
      console.error("Database insertion failed:", error);
      throw new Error("Database insertion failed.");
    }
  },

  getAll: async () => {
    try {
      const [rows] = await db.execute("SELECT *, invoice_pdf FROM invoices");
      return rows;
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      throw new Error("Failed to fetch invoices.");
    }
  },

  update: async (id, updatedData) => {
    if (!id || !updatedData) throw new Error("Invoice ID and update data are required.");

    try {
      // Normalize e_invoice_available field
      if (updatedData.e_invoice_available) {
        updatedData.e_invoice_available =
          updatedData.e_invoice_available.trim().toLowerCase() === "yes" ? "Yes" : null;
      }

      // Update invoice amount in words if modified
      if (updatedData.total_invoice_amount && !isNaN(parseFloat(updatedData.total_invoice_amount))) {
        updatedData.invoice_amount_words = numberToWords.toWords(parseFloat(updatedData.total_invoice_amount));
      }

      // Determine if a new PDF should be generated
      const pdfTriggerFields = ["billing_address", "shipping_address", "document_number", "invoice_date", "total_invoice_amount"];
      const shouldGeneratePDF = pdfTriggerFields.some((field) => updatedData[field]);

      if (shouldGeneratePDF) {
        try {
          updatedData.invoice_pdf = await generateInvoicePDF(updatedData);
        } catch (pdfError) {
          console.error("PDF regeneration failed:", pdfError);
          throw new Error("PDF regeneration failed.");
        }
      }

      // Remove bill_of_entry_number before updating
      delete updatedData.bill_of_entry_number;

      // Construct SQL update query
      const fields = Object.keys(updatedData)
        .map((key) => `\`${key}\` = ?`)
        .join(", ");
      const values = [...Object.values(updatedData), id];

      const query = `UPDATE invoices SET ${fields} WHERE id = ?`;
      const [result] = await db.execute(query, values);

      return result.affectedRows > 0 ? result : null;
    } catch (error) {
      console.error("Invoice update failed:", error);
      throw new Error("Invoice update failed.");
    }
  },

  delete: async (id) => {
    if (!id) throw new Error("Invoice ID is required.");

    try {
      const query = "DELETE FROM invoices WHERE id = ?";
      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Invoice deletion failed:", error);
      throw new Error("Invoice deletion failed.");
    }
  }
};

// Function to generate invoice PDF
const generateInvoicePDF = async (invoiceData) => {
  // Resolve the absolute uploads directory
  const absoluteUploadDir = path.resolve("uploads");
  console.log("Upload Directory Path:", absoluteUploadDir);

  if (!absoluteUploadDir) {
    throw new Error("Upload directory path is undefined.");
  }

  if (!fs.existsSync(absoluteUploadDir)) {
    fs.mkdirSync(absoluteUploadDir, { recursive: true });
  }

  // Create a unique file name for the PDF
  const fileName = `invoice_${Date.now()}.pdf`;
  console.log("Generated File Name:", fileName);

  if (!fileName) {
    throw new Error("File name is undefined.");
  }

  // Build the absolute path to generate the file
  const absoluteFilePath = path.join(absoluteUploadDir, fileName);
  console.log("Absolute File Path:", absoluteFilePath);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocumentWithTables({ margin: 50 });
    const stream = fs.createWriteStream(absoluteFilePath);
    doc.pipe(stream);

    doc.fontSize(20).text("Invoice", { align: "center" }).moveDown();

    const table = {
      headers: ["Field", "Value"],
      rows: Object.entries(invoiceData || {})
        .filter(([key]) => key !== "bill_of_entry_number")
        .map(([key, value]) => [key.replace(/_/g, " "), String(value)]),
    };

    if (table.rows.length > 0) {
      doc.table(table);
    } else {
      doc.text("No data available", { align: "center" });
    }

    doc.end();

    stream.on("finish", () => {
      console.log("PDF successfully generated:", absoluteFilePath);
      // Return a relative URL for the invoice PDF so that it can be served by Express.
      resolve(`/uploads/${fileName}`);
    });

    stream.on("error", (err) => {
      console.error("Error generating PDF:", err);
      reject(err);
    });
  });
};
