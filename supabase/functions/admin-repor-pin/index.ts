/* Administração: repõe o código de uma conta (e esquece os telemóveis associados).
   Autorizada por x-admin-secret (ADMIN_SECRET) ou pela sessão da conta foreverfilipe.
   Uso normal: node tools/repor-pin.mjs <conta|todas> [--pin NNNN] */
import { ADMIN_SECRET, admin, pins, servir, tokenDe } from '../_shared/runtime.ts';

servir(async (req, b) => {
  let autorizado = !!ADMIN_SECRET && req.headers.get('x-admin-secret') === ADMIN_SECRET;
  if (!autorizado) {
    const t = tokenDe(req);
    if (t) { const { data } = await admin.auth.getUser(t); autorizado = (data?.user?.app_metadata as any)?.conta === 'foreverfilipe'; }
  }
  if (!autorizado) return { ok: false, erro: 'Sem permissão.' };
  let contas: string[] = [String(b?.conta || '')];
  if (b?.conta === 'todas') {
    const r = await admin.from('contas').select('id');
    if (r.error) throw new Error(r.error.message);
    contas = (r.data as { id: string }[]).map((c) => c.id);
  }
  const res: Record<string, unknown> = {};
  for (const c of contas) res[c] = await pins.adminRepor({ conta: c, pin: b?.pin });
  return { ok: Object.values(res).every((r: any) => r.ok), contas: res };
});
