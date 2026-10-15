// AuthPage.jsx — หน้าเข้าสู่ระบบ / สมัครสมาชิก (สลับด้วยแท็บ)
import { useState } from 'react';
import { api } from '../api.js';

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = mode === 'login'
        ? await api.login(username, password)
        : await api.register(username, password);
      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">🔗</span>
          <div>
            <h1>Short URL</h1>
            <p className="muted">ย่อลิงก์ สร้าง QR Code และดูสถิติการคลิก</p>
          </div>
        </div>

        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>
            เข้าสู่ระบบ
          </button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>
            สมัครสมาชิก
          </button>
        </div>

        <form onSubmit={submit} className="stack">
          <label className="field">
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={50} placeholder="เช่น kamolchanok" />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} placeholder="อย่างน้อย 6 ตัวอักษร" />
          </label>
          {error && <div className="alert">{error}</div>}
          <button className="btn primary block" disabled={loading}>
            {loading ? 'กำลังดำเนินการ...' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>
      </div>
    </div>
  );
}
