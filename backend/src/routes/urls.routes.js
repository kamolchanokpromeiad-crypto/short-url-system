// urls.routes.js — สร้าง Short URL, ดูประวัติ, ดูสถิติ, ลบลิงก์ (ต้องเข้าสู่ระบบทุก route)
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { generateShortCode, isValidCustomCode, normalizeUrl } from '../utils/shortCode.js';

const router = Router();
router.use(requireAuth);

// BASE_URL = ที่อยู่ของ backend เช่น http://localhost:4000 หรือ https://xxx.onrender.com
export const baseUrl = () => (process.env.BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');

// เติมลิงก์เต็มของ Short URL และรูป QR Code ให้แต่ละแถว
function withLinks(row) {
  return {
    ...row,
    total_clicks: Number(row.total_clicks ?? 0),
    qr_scans: Number(row.qr_scans ?? 0),
    short_url: `${baseUrl()}/${row.short_code}`,
    qr_url: `${baseUrl()}/api/qr/${row.short_code}`,
  };
}

// POST /api/urls  body: { original_url, custom_code?, expires_at? }
router.post('/', async (req, res) => {
  const originalUrl = normalizeUrl(req.body?.original_url);
  if (!originalUrl) {
    return res.status(400).json({ error: 'กรุณากรอก URL ให้ถูกต้อง เช่น https://www.synerry.com' });
  }

  // วันหมดอายุ (ไม่บังคับ) ต้องเป็นวันในอนาคต
  let expiresAt = null;
  if (req.body?.expires_at) {
    expiresAt = new Date(req.body.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return res.status(400).json({ error: 'วันหมดอายุต้องเป็นวันในอนาคต' });
    }
  }

  // ผู้ใช้ตั้งรหัสเอง (ไม่บังคับ)
  const customCode = req.body?.custom_code ? String(req.body.custom_code).trim() : '';
  if (customCode && !isValidCustomCode(customCode)) {
    return res.status(400).json({ error: 'รหัสที่ตั้งเองต้องยาว 3-10 ตัว ใช้ได้เฉพาะ a-z, A-Z, 0-9, _ และ -' });
  }

  const insert = (code) =>
    query(
      `INSERT INTO urls (user_id, original_url, short_code, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, originalUrl, code, expiresAt]
    );

  // รหัสสุ่มอาจชนของเดิม (โอกาสต่ำมาก) จึงลองใหม่ได้สูงสุด 5 ครั้ง
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = customCode || generateShortCode();
    try {
      const result = await insert(code);
      return res.status(201).json(withLinks(result.rows[0]));
    } catch (err) {
      if (err.code !== '23505') throw err; // 23505 = ค่าซ้ำ (short_code UNIQUE)
      if (customCode) return res.status(409).json({ error: 'รหัสนี้ถูกใช้แล้ว กรุณาเลือกรหัสอื่น' });
    }
  }
  res.status(500).json({ error: 'สร้างรหัสไม่สำเร็จ กรุณาลองใหม่' });
});

// GET /api/urls — ประวัติลิงก์ของผู้ใช้ พร้อมจำนวนคลิก
router.get('/', async (req, res) => {
  const result = await query(
    `SELECT u.id, u.original_url, u.short_code, u.expires_at, u.created_at,
            COUNT(c.id)                                AS total_clicks,
            COUNT(c.id) FILTER (WHERE c.source = 'qr') AS qr_scans,
            MAX(c.clicked_at)                          AS last_clicked_at
     FROM urls u
     LEFT JOIN clicks c ON c.url_id = u.id
     WHERE u.user_id = $1
     GROUP BY u.id
     ORDER BY u.created_at DESC`,
    [req.user.id]
  );
  res.json(result.rows.map(withLinks));
});

// หา url ของผู้ใช้คนนี้ (กันไม่ให้ดู/ลบลิงก์ของคนอื่น)
async function findOwnUrl(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return null;
  const result = await query('SELECT * FROM urls WHERE id = $1 AND user_id = $2', [id, req.user.id]);
  return result.rows[0] || null;
}

// GET /api/urls/:id/stats — สถิติรายวัน 30 วันล่าสุด + การคลิก 20 ครั้งล่าสุด
router.get('/:id/stats', async (req, res) => {
  const url = await findOwnUrl(req);
  if (!url) return res.status(404).json({ error: 'ไม่พบลิงก์นี้' });

  const [daily, recent, totals] = await Promise.all([
    query(
      `SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
              COUNT(c.id) AS clicks
       FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, interval '1 day') AS d
       LEFT JOIN clicks c ON c.url_id = $1 AND c.clicked_at::date = d::date
       GROUP BY d ORDER BY d`,
      [url.id]
    ),
    query(
      `SELECT source, user_agent, referrer, clicked_at
       FROM clicks WHERE url_id = $1 ORDER BY clicked_at DESC LIMIT 20`,
      [url.id]
    ),
    query(
      `SELECT COUNT(*) AS total_clicks,
              COUNT(*) FILTER (WHERE source = 'qr') AS qr_scans
       FROM clicks WHERE url_id = $1`,
      [url.id]
    ),
  ]);

  res.json({
    url: withLinks({ ...url, ...totals.rows[0] }),
    daily: daily.rows.map((r) => ({ day: r.day, clicks: Number(r.clicks) })),
    recent: recent.rows,
  });
});

// DELETE /api/urls/:id — ลบลิงก์ (ประวัติคลิกถูกลบตามด้วย ON DELETE CASCADE)
router.delete('/:id', async (req, res) => {
  const url = await findOwnUrl(req);
  if (!url) return res.status(404).json({ error: 'ไม่พบลิงก์นี้' });
  await query('DELETE FROM urls WHERE id = $1', [url.id]);
  res.json({ success: true });
});

export default router;
