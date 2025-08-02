// src/utils/exportTools.ts
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const ExportToExcel = (data: any, filename = 'report.xlsx') => {
  const worksheet = XLSX.utils.json_to_sheet([data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, filename);
};

export const ExportToPDF = (data: any, filename = 'report.pdf') => {
  const doc = new jsPDF();
  const tableData = Object.entries(data).map(([key, value]) => [key, String(value)]);
  doc.autoTable({
    head: [['Key', 'Value']],
    body: tableData,
  });
  doc.save(filename);
};