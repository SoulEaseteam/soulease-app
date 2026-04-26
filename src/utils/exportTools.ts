// src/utils/exportTools.ts

/**
 * เครื่องมือ export ข้อมูลเป็น Excel และ PDF
 * - ใช้ dynamic import เพื่อลดขนาด bundle และหลีกเลี่ยงปัญหา SSR
 * - ปลอดภัยต่อการ build บน Vercel
 */

type RowObject = Record<string, any>;

/**
 * Export ข้อมูลเป็นไฟล์ Excel (.xlsx)
 * @param data  อาร์เรย์ของอ็อบเจ็กต์ เช่น [{a:1, b:2}, ...]
 * @param filename  ชื่อไฟล์ (default: report.xlsx)
 */
export async function ExportToExcel(data: RowObject[], filename = "report.xlsx") {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn("[ExportToExcel] empty data, skip");
    return;
  }

  // โหลดไลบรารีเมื่อถูกเรียกใช้เท่านั้น
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Report");

  // สร้างคอลัมน์จากคีย์ของแถวแรก
  const headers = Object.keys(data[0]);
  worksheet.columns = headers.map((key) => ({
    header: key,
    key,
    width: Math.max(12, String(key).length + 2),
  }));

  // เติมแถว
  data.forEach((row) => worksheet.addRow(row));

  // สไตล์หัวตารางให้เด่นขึ้นเล็กน้อย
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // เขียนไฟล์เป็น buffer แล้วบันทึก
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

/**
 * Export DOM element เป็นไฟล์ PDF
 * @param element  HTMLElement ที่จะแคปเจอร์
 * @param filename ชื่อไฟล์ (default: report.pdf)
 */
export async function ExportToPDF(element: HTMLElement, filename = "report.pdf") {
  if (!element) {
    console.warn("[ExportToPDF] element is required");
    return;
  }

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "p",
    unit: "pt",
    format: "a4",
  });

  // คำนวณสัดส่วนให้พอดีหน้า A4
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let y = 0;
  let remaining = imgHeight;

  // รองรับหลายหน้าอัตโนมัติ
  while (remaining > 0) {
    pdf.addImage(imgData, "PNG", 0, y ? 0 : 0, imgWidth, imgHeight);
    remaining -= pageHeight;
    if (remaining > 0) {
      pdf.addPage();
      y += pageHeight;
    }
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/**
 * optional default export เผื่อบางที่ import แบบ default
 */
export default {
  ExportToExcel,
  ExportToPDF,
};