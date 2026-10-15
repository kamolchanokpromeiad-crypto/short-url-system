// auth.routes.js — สมัครสมาชิก / เข้าสู่ระบบ / ดูข้อมูลตัวเอง
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register  body: { username, password }
router.post('/register', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (!/^[A-Za-z0-9_]{3,50}$/.test(username)) {
    return res.status(400).json({ error: 'Username ต้องมี 3-50 ตัว ใช้ได้เฉพาะ a-z, 0-9 และ _' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password ต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const result = await query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [username, hash]
    );
    const user = result.rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username นี้ถูกใช้แล้ว' });
    }
    throw err;
  }
});

// POST /api/auth/login  body: { username, password }
router.post('/login', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  const user = result.rows[0];

  // ตอบข้อความเดียวกันทั้งกรณีไม่พบ user และรหัสผิด เพื่อไม่ให้เดาได้ว่า username ไหนมีอยู่จริง
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Username หรือ Password ไม่ถูกต้อง' });
  }

  res.json({
    token: signToken(user),
    user: { id: user.id, username: user.username, created_at: user.created_at },
  });
});

// GET /api/auth/me  (ต้องมี token)
router.get('/me', requireAuth, async (req, res) => {
  const result = await query('SELECT id, username, created_at FROM users WHERE id = $1', [req.user.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
  res.json(result.rows[0]);
});

export default router;
