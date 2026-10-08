/* Aviso discreto quando não há ligação à internet. Mesma moldura/estilo do banner e do toast da app. */
export default function Offline({ fr }) {
  return (
    <div style={{ position: 'fixed', left: '50%', top: '50%', width: fr.w, height: fr.h, transform: 'translate(-50%,-50%) ' + fr.scale, pointerEvents: 'none', zIndex: 2 }}>
      <div role="status" aria-live="polite" style={{ position: 'absolute', left: '50%', top: 'calc(' + fr.top + ' + 6px)', transform: 'translateX(-50%)', zIndex: 89, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 8px 12px', borderRadius: 18, background: 'rgba(24,40,33,.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(198,167,102,.32)', boxShadow: '0 16px 36px -14px rgba(0,0,0,.9)', color: '#EEE7D7', font: '500 12px Jost,sans-serif', whiteSpace: 'nowrap' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C6A766" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11 5M5 12.9a10 10 0 0 1 3.4-2M19 12.9a10 10 0 0 0-3.4-2M8.5 16.4a5 5 0 0 1 7 0" />
          <circle cx="12" cy="20" r="1" fill="#C6A766" stroke="none" />
          <path d="M3 3l18 18" />
        </svg>
        <span>Sem ligação à internet</span>
      </div>
    </div>
  );
}
