// csv.js — สร้างไฟล์ CSV แล้วดาวน์โหลด (เปิดใน Excel ได้ ภาษาไทยไม่เพี้ยน)

// แปลงค่า 1 ช่องให้ปลอดภัยสำหรับ CSV
function cell(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // กัน CSV injection: ข้อความที่ขึ้นต้นด้วย = + - @ อาจถูก Excel ตีความเป็นสูตร
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  // ครอบด้วย " ทุกช่อง และเปลี่ยน " ข้างในเป็น ""
  return `"${s.replace(/"/g, '""')}"`;
}

// rows = อาร์เรย์ของแถว (แต่ละแถวเป็นอาร์เรย์) → ข้อความ CSV
export function toCsv(rows) {
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

// วันที่เวลาแบบ 2026-10-15 23:10 (Excel อ่านเป็นวันที่ได้)
export function csvDate(v) {
  if (!v) return '';
  return new Date(v).toLocaleString('sv-SE', { hour12: false }).slice(0, 16);
}

// วันที่ปัจจุบันสำหรับตั้งชื่อไฟล์ เช่น 2026-10-15
export function today() {
  return new Date().toLocaleDateString('sv-SE');
}

// ดาวน์โหลดไฟล์ CSV
export function downloadCsv(filename, rows) {
  // ﻿ (BOM) บอก Excel ว่าไฟล์เป็น UTF-8 ไม่งั้นภาษาไทยจะเป็นตัวอักษรเพี้ยน
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
