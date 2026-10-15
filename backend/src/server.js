// server.js — จุดเริ่มต้นของ backend
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb, query } from './db.js';
import authRoutes from './routes/auth.routes.js';
import urlRoutes from './routes/urls.routes.js';
import publicRoutes from './routes/public.routes.js';

if (!process.env.JWT_SECRET) {
  console.error('ยังไม่ได้ตั้งค่า JWT_SECRET ในไฟล์ .env (ดูตัวอย่างใน .env.example)');
  process.exit(1);
}

const app = express();
app.set('trust proxy', true); // ให้ req.ip เป็น IP จริงของผู้ใช้ เมื่อรันหลัง proxy ของโฮสต์

// อนุญาตเฉพาะ frontend ที่ระบุใน FRONTEND_URL (คั่นหลายค่าด้วย ,) ถ้าไม่ตั้งค่าจะอนุญาตทุกที่
const allowed = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowed.length ? allowed : true }));
app.use(express.json({ limit: '10kb' }));

// ตรวจว่า server และฐานข้อมูลทำงานอยู่
app.get('/health', async (req, res) => {
  await query('SELECT 1');
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes);
app.use(publicRoutes); // /api/qr/:code และ /:code (ต้องอยู่ท้ายสุด)

// ตัวจัดการ error กลาง (Express 5 ส่ง error จากฟังก์ชัน async มาที่นี่ให้อัตโนมัติ)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่' });
});

const PORT = Number(process.env.PORT) || 4000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Short URL API พร้อมใช้งานที่ http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('เชื่อมต่อฐานข้อมูลไม่สำเร็จ:', err.message);
    process.exit(1);
  });
