import express from "express";
import { getAllInvoices, createInvoice, getInvoicePDF} from "../controller/invoiceController.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Routes
router.get("/", getAllInvoices);
router.post("/", upload.single("e_invoice_file"), createInvoice);
router.get("/pdf/:filename", getInvoicePDF);


export default router;
