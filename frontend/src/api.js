// api.js — ฟังก์ชันเรียก backend ทั้งหมดอยู่ที่นี่ที่เดียว
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

const TOKEN_KEY = 'shorturl_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

// เรียก API แล้วคืน JSON ถ้า backend ตอบ error จะโยน Error พร้อมข้อความภาษาไทยจาก backend
async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('เชื่อมต่อ server ไม่ได้ กรุณาตรวจว่า backend เปิดอยู่');
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event('auth-expired'));
  }
  if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
  return data;
}

export const api = {
  register: (username, password) => request('/api/auth/register', { method: 'POST', body: { username, password } }),
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/api/auth/me'),
  createUrl: (payload) => request('/api/urls', { method: 'POST', body: payload }),
  listUrls: () => request('/api/urls'),
  stats: (id) => request(`/api/urls/${id}/stats`),
  deleteUrl: (id) => request(`/api/urls/${id}`, { method: 'DELETE' }),
};
