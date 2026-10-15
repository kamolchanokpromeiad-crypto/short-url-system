// StatsModal.jsx — สถิติของลิงก์เดียว: ยอดรวม, กราฟรายวัน 30 วัน, การคลิกล่าสุด
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { downloadCsv, csvDate, today } from '../csv.js';

// แปลง user agent เป็นข้อความสั้นๆ ที่อ่านง่าย
function device(ua = '') {
  if (!ua) return 'ไม่ทราบ';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'อื่นๆ';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /curl/i.test(ua) ? 'curl' : '';
  return browser ? `${browser} · ${os}` : os;
}

function DailyChart({ daily }) {
  const W = 640, H = 180, P = { l: 32, r: 22, t: 12, b: 28 };
  const max = Math.max(1, ...daily.map((d) => d.clicks));
  const step = (W - P.l - P.r) / daily.length;
  const bw = Math.max(4, step * 0.65);
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / max);
  const ticks = [0, Math.ceil(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="กราฟจำนวนคลิกรายวัน 30 วันล่าสุด">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="grid" />
          <text x={P.l - 6} y={y(t) + 4} textAnchor="end" className="tick">{t}</text>
        </g>
      ))}
      {daily.map((d, i) => {
        const x = P.l + i * step + (step - bw) / 2;
        const h = H - P.b - y(d.clicks);
        const label = new Date(`${d.day}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        return (
          <g key={d.day}>
            <rect x={x} y={y(d.clicks)} width={bw} height={Math.max(h, d.clicks ? 2 : 0)} rx="2" className="bar">
              <title>{`${label}: ${d.clicks} คลิก`}</title>
            </rect>
            {(daily.length - 1 - i) % 7 === 0 && (
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="tick">{label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function StatsModal({ item, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.stats(item.id).then(setData).catch((e) => setError(e.message));
  }, [item.id]);

  // กด Esc เพื่อปิด
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const u = data?.url;

  // Export สถิติของลิงก์นี้: สรุป + จำนวนคลิกรายวัน + การคลิกล่าสุด
  function exportCsv() {
    const rows = [
      ['Short URL', item.short_url],
      ['Full URL', item.original_url],
      ['คลิกทั้งหมด', u.total_clicks],
      ['คลิกจากลิงก์', u.total_clicks - u.qr_scans],
      ['สแกน QR', u.qr_scans],
      [],
      ['วันที่', 'จำนวนคลิก'],
      ...data.daily.map((d) => [d.day, d.clicks]),
      [],
      ['การคลิกล่าสุด: เวลา', 'ที่มา', 'อุปกรณ์'],
      ...data.recent.map((c) => [csvDate(c.clicked_at), c.source === 'qr' ? 'สแกน QR' : 'คลิกลิงก์', device(c.user_agent)]),
    ];
    downloadCsv(`stats-${item.short_code}-${today()}.csv`, rows);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`สถิติของ /${item.short_code}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>สถิติ /{item.short_code}</h2>
            <div className="original muted" title={item.original_url}>{item.original_url}</div>
          </div>
          <div className="row-gap">
            {u && <button type="button" className="btn sm" onClick={exportCsv}>⬇ Export CSV</button>}
            <button type="button" className="btn sm ghost" onClick={onClose} aria-label="ปิด">✕</button>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}
        {!data && !error && <p className="muted">กำลังโหลด...</p>}

        {u && (
          <>
            <div className="summary">
              <div><strong>{u.total_clicks.toLocaleString('th-TH')}</strong><span>คลิกทั้งหมด</span></div>
              <div><strong>{(u.total_clicks - u.qr_scans).toLocaleString('th-TH')}</strong><span>จากลิงก์</span></div>
              <div><strong>{u.qr_scans.toLocaleString('th-TH')}</strong><span>จากสแกน QR</span></div>
            </div>

            <h3>จำนวนคลิกรายวัน (30 วันล่าสุด)</h3>
            <DailyChart daily={data.daily} />

            <h3>การคลิกล่าสุด</h3>
            {data.recent.length === 0 ? (
              <p className="muted">ยังไม่มีคนคลิกลิงก์นี้</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>เวลา</th><th>ที่มา</th><th>อุปกรณ์</th></tr>
                  </thead>
                  <tbody>
                    {data.recent.map((c, idx) => (
                      <tr key={idx}>
                        <td className="nowrap">{new Date(c.clicked_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' })}</td>
                        <td>{c.source === 'qr' ? <span className="badge">สแกน QR</span> : <span className="badge muted-badge">คลิกลิงก์</span>}</td>
                        <td>{device(c.user_agent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
