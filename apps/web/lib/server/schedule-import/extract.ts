import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import Tesseract from "tesseract.js";

export type ExtractTextResult = {
  text: string;
  engine: "ocr-image" | "pdf" | "docx" | "plain-text";
};

function normalizeFileName(file: File) {
  return file.name.toLowerCase();
}

async function extractFromImage(buffer: Buffer) {
  const ocr = await Tesseract.recognize(buffer, "chi_sim+eng");
  return ocr.data.text;
}

async function extractFromPdf(buffer: Buffer) {
  const parsed = await pdfParse(buffer);
  return parsed.text;
}

async function extractFromDocx(buffer: Buffer) {
  const extracted = await mammoth.extractRawText({ buffer });
  return extracted.value;
}

export async function extractTextFromScheduleFile(file: File): Promise<ExtractTextResult> {
  const name = normalizeFileName(file);
  const mime = file.type.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (mime.startsWith("image/") || /\.(png|jpg|jpeg|webp|bmp)$/i.test(name)) {
    const text = await extractFromImage(buffer);
    return { text, engine: "ocr-image" };
  }

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const text = await extractFromPdf(buffer);
    return { text, engine: "pdf" };
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const text = await extractFromDocx(buffer);
    return { text, engine: "docx" };
  }

  if (mime.startsWith("text/") || name.endsWith(".txt")) {
    const text = buffer.toString("utf8");
    return { text, engine: "plain-text" };
  }

  throw new Error("Unsupported file type. Please upload image, PDF, DOCX or TXT.");
}

