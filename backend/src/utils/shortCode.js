// shortCode.js — สร้างรหัสสั้นแบบสุ่ม และตรวจรูปแบบ URL / รหัสที่ผู้ใช้ตั้งเอง
import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// สุ่มรหัสยาว length ตัวจาก a-z A-Z 0-9 (62 ตัวอักษร)
// 6 ตัว = 62^6 ≈ 5.6 หมื่นล้านแบบ โอกาสซ้ำต่ำมาก
export function generateShortCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

// คำที่ห้ามใช้เป็นรหัส เพราะชนกับ path ของระบบ
export const RESERVED_CODES = new Set(['api', 'health', 'login', 'register', 'admin']);

// รหัสที่ผู้ใช้ตั้งเอง: 3-10 ตัว ใช้ได้เฉพาะ a-z A-Z 0-9 _ -
export function isValidCustomCode(code) {
  return /^[A-Za-z0-9_-]{3,10}$/.test(code) && !RESERVED_CODES.has(code.toLowerCase());
}

// ตรวจและจัดรูปแบบ URL: ถ้าไม่มี http(s):// จะเติม https:// ให้
// คืนค่า URL ที่จัดรูปแบบแล้ว หรือ null ถ้าไม่ใช่ URL ที่ถูกต้อง
export function normalizeUrl(input) {
  if (typeof input !== 'string') return null;
  let value = input.trim();
  if (!value || value.length > 2048) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
    return url.toString();
  } catch {
    return null;
  }
}
