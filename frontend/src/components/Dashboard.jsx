// Dashboard.jsx — หน้าหลักหลังเข้าสู่ระบบ: สร้างลิงก์ + ผลลัพธ์ (QR) + ประวัติ
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import StatsModal from './StatsModal.jsx';
import { downloadCsv, csvDate, today } from '../csv.js';

const fmtDate = (v) =>
  v ? new Date(v).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('คัดลอกลิงก์นี้', text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button type="button" className={`btn ${className}`} onClick={copy}>
      {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}
    </button>
  );
}

function CreateForm({ onCreated }) {
  const [url, setUrl] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const created = await api.createUrl({
        original_url: url,
        custom_code: customCode || undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      onCreated(created);
      setUrl('');
      setCustomCode('');
      setExpiresAt('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2>สร้าง Short URL</h2>
      <div className="url-row">
        <input
          className="url-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="วางลิงก์ยาวที่นี่ เช่น https://www.synerry.com"
          required
          aria-label="Full URL"
        />
        <button className="btn primary" disabled={loading}>
          {loading ? 'กำลังสร้าง...' : 'ย่อลิงก์'}
        </button>
      </div>

      <button type="button" className="link-btn" onClick={() => setShowMore((v) => !v)}>
        {showMore ? '− ซ่อนตัวเลือกเพิ่มเติม' : '+ ตัวเลือกเพิ่มเติม (ตั้งชื่อลิงก์เอง / วันหมดอายุ)'}
      </button>

      {showMore && (
        <div className="grid-2">
          <label className="field">
            <span>ตั้งชื่อลิงก์เอง (ไม่บังคับ)</span>
            <input value={customCode} onChange={(e) => setCustomCode(e.target.value)} placeholder="เช่น synerry" maxLength={10} pattern="[A-Za-z0-9_\-]{3,10}" title="3-10 ตัว ใช้ได้ a-z, A-Z, 0-9, _ และ -" />
            <small className="muted">3-10 ตัว ใช้ได้ a-z, 0-9, _ และ -</small>
          </label>
          <label className="field">
            <span>วันหมดอายุ (ไม่บังคับ)</span>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            <small className="muted">หลังเวลานี้ ลิงก์จะเปิดไม่ได้</small>
          </label>
        </div>
      )}

      {error && <div className="alert">{error}</div>}
    </form>
  );
}

function ResultCard({ item, onClose }) {
  return (
    <section className="card result" aria-live="polite">
      <div className="result-body">
        <div className="stack">
          {!item.fromHistory && <span className="badge ok">สร้างสำเร็จ</span>}
          <div>
            <div className="label">Short URL</div>
            <a className="short-link big" href={item.short_url} target="_blank" rel="noreferrer">{item.short_url}</a>
          </div>
          <div>
            <div className="label">Full URL</div>
            <div className="original" title={item.original_url}>{item.original_url}</div>
          </div>
          <div className="row-gap">
            <CopyButton text={item.short_url} className="primary" />
            <a className="btn" href={item.short_url} target="_blank" rel="noreferrer">เปิดลิงก์</a>
            <a className="btn" href={`${item.qr_url}?download=1`}>ดาวน์โหลด QR</a>
            <button type="button" className="btn ghost" onClick={onClose}>ปิด</button>
          </div>
        </div>
        <figure className="qr">
          <img src={item.qr_url} alt={`QR Code ของ ${item.short_url}`} width="180" height="180" />
          <figcaption className="muted">สแกนเพื่อเปิดลิงก์</figcaption>
        </figure>
      </div>
    </section>
  );
}

function History({ items, loading, onStats, onDelete, onQr }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => i.original_url.toLowerCase().includes(s) || i.short_code.toLowerCase().includes(s));
  }, [items, q]);

  const totalClicks = items.reduce((s, i) => s + i.total_clicks, 0);
  const totalQr = items.reduce((s, i) => s + i.qr_scans, 0);

  // Export รายการที่แสดงอยู่ (ตามคำค้นหา) เป็น CSV
  function exportCsv() {
    const rows = [
      ['Short URL', 'Full URL', 'คลิกทั้งหมด', 'คลิกจากลิงก์', 'สแกน QR', 'คลิกล่าสุด', 'สร้างเมื่อ', 'หมดอายุ'],
      ...filtered.map((i) => [
        i.short_url,
        i.original_url,
        i.total_clicks,
        i.total_clicks - i.qr_scans,
        i.qr_scans,
        csvDate(i.last_clicked_at),
        csvDate(i.created_at),
        csvDate(i.expires_at),
      ]),
    ];
    downloadCsv(`short-url-history-${today()}.csv`, rows);
  }

  return (
    <section className="card stack">
      <div className="history-head">
        <h2>ประวัติลิงก์ของฉัน</h2>
        <div className="row-gap history-tools">
          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาลิงก์..." aria-label="ค้นหาลิงก์" />
          <button type="button" className="btn" onClick={exportCsv} disabled={filtered.length === 0} title="ดาวน์โหลดรายการลิงก์และสถิติเป็นไฟล์ CSV (เปิดใน Excel ได้)">
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <div className="summary">
        <div><strong>{items.length.toLocaleString('th-TH')}</strong><span>ลิงก์ทั้งหมด</span></div>
        <div><strong>{totalClicks.toLocaleString('th-TH')}</strong><span>คลิกรวม</span></div>
        <div><strong>{totalQr.toLocaleString('th-TH')}</strong><span>สแกน QR</span></div>
      </div>

      {loading ? (
        <p className="muted">กำลังโหลด...</p>
      ) : filtered.length === 0 ? (
        <p className="muted empty">{items.length ? 'ไม่พบลิงก์ที่ค้นหา' : 'ยังไม่มีลิงก์ ลองสร้างลิงก์แรกด้านบนได้เลย'}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Short URL</th>
                <th>Full URL</th>
                <th className="num">คลิก</th>
                <th className="num">สแกน QR</th>
                <th>สร้างเมื่อ</th>
                <th aria-label="จัดการ" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const expired = i.expires_at && new Date(i.expires_at) <= new Date();
                return (
                  <tr key={i.id}>
                    <td>
                      <a className="short-link" href={i.short_url} target="_blank" rel="noreferrer">/{i.short_code}</a>
                      {expired && <span className="badge warn">หมดอายุ</span>}
                    </td>
                    <td className="original-cell" title={i.original_url}>{i.original_url}</td>
                    <td className="num">{i.total_clicks.toLocaleString('th-TH')}</td>
                    <td className="num">{i.qr_scans.toLocaleString('th-TH')}</td>
                    <td className="nowrap">{fmtDate(i.created_at)}</td>
                    <td className="actions">
                      <CopyButton text={i.short_url} className="sm" />
                      <button type="button" className="btn sm" onClick={() => onQr(i)}>QR</button>
                      <button type="button" className="btn sm" onClick={() => onStats(i)}>สถิติ</button>
                      <button type="button" className="btn sm danger" onClick={() => onDelete(i)}>ลบ</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function Dashboard({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [statsFor, setStatsFor] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      setItems(await api.listUrls());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // อัปเดตจำนวนคลิกเมื่อกลับมาที่แท็บนี้ (เช่น หลังไปเปิดลิงก์ในแท็บอื่น)
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  async function remove(item) {
    if (!window.confirm(`ลบลิงก์ /${item.short_code} ใช่ไหม?\nประวัติการคลิกของลิงก์นี้จะถูกลบด้วย`)) return;
    try {
      await api.deleteUrl(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (result?.id === item.id) setResult(null);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand small">
          <span className="brand-mark">🔗</span>
          <strong>Short URL</strong>
        </div>
        <div className="row-gap">
          <span className="muted">สวัสดี, <strong>{user.username}</strong></span>
          <button type="button" className="btn sm" onClick={onLogout}>ออกจากระบบ</button>
        </div>
      </header>

      <main className="container stack-lg">
        <CreateForm onCreated={(created) => { setResult(created); setItems((prev) => [created, ...prev]); }} />
        {result && <ResultCard item={result} onClose={() => setResult(null)} />}
        {error && <div className="alert">{error}</div>}
        <History
          items={items}
          loading={loading}
          onStats={setStatsFor}
          onDelete={remove}
          onQr={(i) => { setResult({ ...i, fromHistory: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        />
      </main>

      {statsFor && <StatsModal item={statsFor} onClose={() => setStatsFor(null)} />}
    </div>
  );
}
