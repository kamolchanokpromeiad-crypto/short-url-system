// public.routes.js — route ที่ไม่ต้องเข้าสู่ระบบ: รูป QR Code และการ redirect
import { Router } from 'express';
import QRCode from 'qrcode';
import { query } from '../db.js';
import { baseUrl } from './urls.routes.js';

const router = Router();

// GET /api/qr/:code — คืนรูป QR Code (PNG) ของ Short URL
// QR ชี้ไปที่ <short url>?src=qr เพื่อให้ระบบรู้ว่าเข้ามาจากการสแกน
router.get('/api/qr/:code', async (req, res) => {
  const result = await query('SELECT short_code FROM urls WHERE short_code = $1', [req.params.code]);
  if (!result.rows[0]) return res.status(404).json({ error: 'ไม่พบลิงก์นี้' });

  const png = await QRCode.toBuffer(`${baseUrl()}/${req.params.code}?src=qr`, {
    type: 'png',
    width: 320,
    margin: 2,
  });
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'public, max-age=86400');
  if (req.query.download) {
    res.set('Content-Disposition', `attachment; filename="qr-${req.params.code}.png"`);
  }
  res.send(png);
});

// GET /:code — หัวใจของระบบ: หา URL ต้นทาง บันทึกการคลิก แล้ว redirect
router.get('/:code', async (req, res) => {
  const result = await query(
    'SELECT id, original_url, expires_at FROM urls WHERE short_code = $1',
    [req.params.code]
  );
  const url = result.rows[0];

  if (!url) {
    return res.status(404).send(page('ไม่พบลิงก์นี้', 'ลิงก์อาจพิมพ์ผิด หรือถูกลบไปแล้ว'));
  }
  if (url.expires_at && new Date(url.expires_at) <= new Date()) {
    return res.status(410).send(page('ลิงก์นี้หมดอายุแล้ว', 'กรุณาติดต่อผู้ส่งลิงก์'));
  }

  // บันทึกการคลิก (ถ้าบันทึกพลาด ยังพาไปปลายทางได้ตามปกติ)
  try {
    await query(
      `INSERT INTO clicks (url_id, source, ip_address, user_agent, referrer)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        url.id,
        req.query.src === 'qr' ? 'qr' : 'link',
        req.ip || null,
        req.get('user-agent') || null,
        req.get('referer') || null,
      ]
    );
  } catch (err) {
    console.error('บันทึกการคลิกไม่สำเร็จ:', err.message);
  }

  res.redirect(302, url.original_url);
});

// หน้า HTML สั้นๆ สำหรับกรณีไม่พบลิงก์ / หมดอายุ
function page(title, detail) {
  return `<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f7fb;color:#222}
div{text-align:center;padding:24px}h1{font-size:24px}p{color:#666}</style></head>
<body><div><h1>${title}</h1><p>${detail}</p></div></body></html>`;
}

export default router;
