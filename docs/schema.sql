-- schema.sql — โครงสร้างฐานข้อมูลระบบ Short URL (PostgreSQL)
-- ตรงกับ docs/er-diagram.png
-- วิธีใช้: psql -U postgres -d short_url -f docs/schema.sql

-- ผู้ใช้งาน (เจ้าของลิงก์)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,          -- เก็บรหัสผ่านที่ hash ด้วย bcrypt แล้วเท่านั้น
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ลิงก์ที่ย่อ: ผู้ใช้ 1 คน สร้างได้หลายลิงก์
CREATE TABLE IF NOT EXISTS urls (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_url TEXT         NOT NULL,
  short_code   VARCHAR(10)  NOT NULL UNIQUE,    -- เช่น rAJMO → https://<domain>/rAJMO
  expires_at   TIMESTAMPTZ  NULL,               -- NULL = ไม่มีวันหมดอายุ
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ประวัติการคลิก: ลิงก์ 1 ลิงก์ ถูกคลิกได้หลายครั้ง
CREATE TABLE IF NOT EXISTS clicks (
  id         BIGSERIAL PRIMARY KEY,
  url_id     INTEGER     NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  source     VARCHAR(10) NOT NULL DEFAULT 'link', -- 'link' = คลิกลิงก์, 'qr' = สแกน QR Code
  ip_address VARCHAR(45),                         -- รองรับทั้ง IPv4 และ IPv6
  user_agent TEXT,
  referrer   TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- index สำหรับค้นหาเร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_urls_user_id   ON urls(user_id);
CREATE INDEX IF NOT EXISTS idx_clicks_url_id  ON clicks(url_id);

-- ตัวอย่าง: ประวัติลิงก์ของผู้ใช้ พร้อมจำนวนคลิก
-- SELECT u.id, u.original_url, u.short_code, u.created_at,
--        COUNT(c.id)                               AS total_clicks,
--        COUNT(c.id) FILTER (WHERE c.source = 'qr') AS qr_scans
-- FROM urls u
-- LEFT JOIN clicks c ON c.url_id = u.id
-- WHERE u.user_id = $1
-- GROUP BY u.id
-- ORDER BY u.created_at DESC;
