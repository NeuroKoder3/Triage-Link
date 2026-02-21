import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseExcelFile(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheets = {};
  const allRows = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    sheets[sheetName] = rows;
    allRows.push(...rows);
  }

  const textRepresentation = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return `--- Sheet: ${name} ---\n${csv}`;
  }).join('\n\n');

  return {
    type: 'xlsx',
    fileName: file.name,
    text: textRepresentation,
    structured: allRows,
    sheets,
    sheetNames: workbook.SheetNames,
  };
}

export async function parsePdfFile(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    pages.push(text);
  }

  return {
    type: 'pdf',
    fileName: file.name,
    text: pages.join('\n\n'),
    pageCount: pdf.numPages,
    pages,
  };
}

export async function parseDocxFile(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });

  return {
    type: 'docx',
    fileName: file.name,
    text: result.value,
    warnings: result.messages,
  };
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  switch (ext) {
    case 'xlsx':
    case 'xls':
      return parseExcelFile(file);
    case 'pdf':
      return parsePdfFile(file);
    case 'docx':
    case 'doc':
      return parseDocxFile(file);
    default:
      throw new Error(`Unsupported file type: .${ext}. Please upload .xlsx, .pdf, or .docx files.`);
  }
}

export const ACCEPTED_FILE_TYPES = '.xlsx,.xls,.pdf,.docx,.doc';

export const FILE_TYPE_LABELS = {
  xlsx: 'Excel Spreadsheet',
  xls: 'Excel Spreadsheet',
  pdf: 'PDF Document',
  docx: 'Word Document',
  doc: 'Word Document',
};
