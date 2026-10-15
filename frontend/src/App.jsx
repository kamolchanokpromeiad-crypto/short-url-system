// App.jsx — ถ้ายังไม่ล็อกอิน แสดงหน้าเข้าสู่ระบบ ถ้าล็อกอินแล้ว แสดงหน้าหลัก
import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import AuthPage from './components/AuthPage.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  // เปิดหน้าเว็บใหม่: ถ้ามี token เก่า ให้ตรวจกับ backend ว่ายังใช้ได้ไหม
  useEffect(() => {
    if (!getToken()) return;
    api.me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  // token หมดอายุระหว่างใช้งาน → กลับไปหน้าเข้าสู่ระบบ
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth-expired', onExpired);
    return () => window.removeEventListener('auth-expired', onExpired);
  }, []);

  function handleAuth({ token, user }) {
    setToken(token);
    setUser(user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  if (checking) return <div className="center-screen muted">กำลังโหลด...</div>;
  return user ? <Dashboard user={user} onLogout={logout} /> : <AuthPage onAuth={handleAuth} />;
}
