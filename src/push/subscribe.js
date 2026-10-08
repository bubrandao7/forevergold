/* Notificações push (Web Push): guarda/retira a subscrição deste telemóvel para a conta que entrou. */
import { VAPID_PUBLIC_KEY } from '../data/config.js';

const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4), r = (s + p).replace(/-/g, '+').replace(/_/g, '/'), raw = atob(r); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); };

export const suportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID_PUBLIC_KEY;

/* Cria (se faltar) a subscrição deste telemóvel e regista-a para a conta atual. Exige permissão já concedida. */
export async function subscrever(sb) {
  if (!suportado() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC_KEY) });
  const j = sub.toJSON();
  const { error } = await sb.rpc('fg_push_registar', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: (navigator.userAgent || '').slice(0, 200) });
  if (error) throw new Error(error.message);
  return true;
}

/* Ao sair da conta: este telemóvel deixa de receber avisos dessa conta. */
export async function retirar(sb) {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    if (sub) await sb.from('push_subs').delete().eq('endpoint', sub.endpoint);
  } catch (e) { /* sem ligação: a subscrição morta é limpa pelo servidor na próxima falha */ }
}
