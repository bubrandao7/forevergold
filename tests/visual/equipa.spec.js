import { test, expect } from '@playwright/test';
import { par, pinRec, CONTAS } from './helpers.js';
import { runner, clica, tab, scrollTo, pausa, percorre } from './flows.js';

const pins = Object.fromEntries(CONTAS.filter((c) => c !== 'cliente').map((c) => [c, pinRec('1234')]));
const ri = (re) => (p) => p.getByRole('button', { name: re }).first().click();
const fo = (re) => (p) => p.locator('[data-sheet-panel]').getByRole('button', { name: re }).first().click();
const preenche = (ph, txt) => (p) => p.getByPlaceholder(ph).fill(txt);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64');

test('loja dona (valbom): início, lojas, detalhe, edição, peças', async ({ browser }) => {
  const pg = await par(browser, { conta: 'forevervalbom', pins });
  const r = runner(pg);
  await r.run('val-inicio', pausa(600));
  await percorre(r, 'val-inicio');
  await r.run('val-lojas', async (p) => { await scrollTo(0)(p); await tab('Lojas')(p); await p.waitForTimeout(500); });
  await r.run('val-loja', async (p) => { await p.locator('button', { hasText: 'à venda' }).first().click(); await p.waitForTimeout(600); });
  await r.run('val-loja-cat', ri(/^Relógios/));
  await r.run('val-loja-cat-todas', ri(/^Tudo/));
  await r.run('val-editar-info', async (p) => { await p.getByRole('button', { name: /editar info/i }).click(); await p.waitForTimeout(700); });
  await r.run('val-editar-info-erro', async (p) => { await p.locator('textarea').first().fill('x'); await p.getByRole('button', { name: /^guardar/i }).click(); await p.waitForTimeout(300); });
  await r.run('val-editar-info-ok', async (p) => { await p.locator('textarea').first().fill('Rua Nova, 123, Valbom 4420-226'); await p.getByRole('button', { name: /^guardar/i }).click(); await p.waitForTimeout(900); });
  await r.run('val-peca-dono', async (p) => { await p.locator('button', { hasText: 'Par de alianças clássicas' }).first().click(); await p.waitForTimeout(700); });
  await r.run('val-peca-estado', fo(/^Reservada/));
  await r.run('val-peca-apagar-confirma', fo(/^apagar/i));
  await r.run('val-peca-apagar-cancela', ri(/^cancelar$/i));
  await r.run('val-peca-editar', fo(/^editar/i));
  await r.run('val-peca-erro', async (p) => { await p.getByPlaceholder('ex.: Par de alianças clássicas').fill(''); await p.locator('[data-sheet-panel]').getByRole('button', { name: /guardar alterações/i }).click(); await p.waitForTimeout(300); });
  await r.run('val-peca-cancelar', fo(/^fechar/i));
  await r.run('val-nova-peca', async (p) => { await p.getByRole('button', { name: /nova peça/i }).click(); await p.waitForTimeout(700); });
  await r.run('val-nova-peca-erro', async (p) => { await p.getByRole('button', { name: /publicar peça/i }).click(); await p.waitForTimeout(300); });
  await r.run('val-nova-peca-preenche', async (p) => {
    await p.getByPlaceholder('ex.: Par de alianças clássicas').fill('Brincos de teste');
    await p.getByPlaceholder('ex.: 129,90').fill('1.234,56').catch(async () => { await p.locator('input[inputmode=decimal]').first().fill('1.234,56'); });
    await p.locator('input[inputmode=decimal]').nth(1).fill('3,2');
    await p.locator('[data-sheet-panel]').getByRole('button', { name: /^Brincos/ }).click();
    await p.locator('[data-sheet-panel]').getByRole('button', { name: /Prata 925/ }).click();
    await p.locator('input[type=file]').first().setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: png });
    await p.waitForTimeout(900);
  });
  await r.run('val-nova-peca-publicar', async (p) => { await p.getByRole('button', { name: /publicar peça/i }).click(); await p.waitForTimeout(900); });
  await r.run('val-nova-peca-lista', scrollTo(600));
  expect(r.erros.join('\n')).toBe('');
});

test('loja: chat, equipa, cotação, lucro, publicidade, avisos', async ({ browser }) => {
  const pg = await par(browser, { conta: 'forevervalbom', pins });
  const r = runner(pg);
  await r.run('chat', async (p) => { await tab('Chat')(p); await p.waitForTimeout(700); });
  await r.run('chat-escreve', preenche('Escreva para toda a equipa…', 'Olá equipa, teste.'));
  await r.run('chat-urgente', ri(/^Urgente/));
  await r.run('chat-envia-urgente', async (p) => { await p.locator('button[aria-label], button').filter({ hasText: /enviar/i }).first().click().catch(async () => { await p.getByPlaceholder('Escreva o aviso urgente…').press('Control+Enter'); }); await p.waitForTimeout(600); });
  await r.run('equipa-hub', async (p) => { await tab('Equipa')(p); await p.waitForTimeout(600); });
  await r.run('cot', async (p) => { await p.getByRole('button', { name: /^cotação diária/i }).click(); await p.waitForTimeout(800); });
  await r.run('cot-serie-prata', ri(/^Prata\s*fina/i));
  await r.run('cot-semana2', ri(/^Semana 1/));
  await r.run('cot-mes-anterior', ri(/Mês anterior/));
  await r.run('cot-mes-seguinte', ri(/Mês seguinte/));
  await r.run('cot-escrever-erro', async (p) => { await p.getByRole('button', { name: /publicar e avisar/i }).click(); await p.waitForTimeout(300); });
  await r.run('cot-escrever', async (p) => {
    const ins = p.locator('input[inputmode=decimal]'); await ins.nth(0).fill('63 400'); await ins.nth(1).fill('58 000'); await ins.nth(2).fill('850'); await ins.nth(3).fill('700');
    await p.locator('textarea').last().fill('Nota de teste'); await p.waitForTimeout(200);
  });
  await r.run('cot-publicar', async (p) => { await p.getByRole('button', { name: /publicar e avisar/i }).click(); await p.waitForTimeout(500); }, ['canvas']);
  await r.run('cot-corrigir', async (p) => { await p.waitForTimeout(3600); await p.getByRole('button', { name: /corrigir|editar/i }).first().click(); await p.waitForTimeout(400); });
  await r.run('cot-cancelar-edicao', ri(/^cancelar$/i));
  await r.run('lucro', async (p) => { await p.getByRole('button', { name: /^Equipa/i }).first().click().catch(() => {}); await p.getByRole('button', { name: /‹ Equipa|Equipa/ }).first().click(); await p.waitForTimeout(500); await p.getByRole('button', { name: /^lucro do mês/i }).click(); await p.waitForTimeout(900); });
  await percorre(r, 'lucro');
  await r.run('lucro-erro', async (p) => { await scrollTo(0)(p); await p.locator('input[aria-label="Lucro do mês em euros"]').fill('abc'); await p.getByRole('button', { name: /^registar/i }).first().click(); await p.waitForTimeout(300); });
  await r.run('lucro-confirma', async (p) => { await p.locator('input[aria-label="Lucro do mês em euros"]').fill('12.450,50'); await p.getByRole('button', { name: /^registar/i }).first().click(); await p.waitForTimeout(500); });
  await r.run('lucro-registado', async (p) => { await p.locator('[data-cf-ok]').click(); await p.waitForTimeout(700); }, ['canvas']);
  await r.run('lucro-corrigir', async (p) => { await p.waitForTimeout(3600); await p.getByRole('button', { name: /corrigir/i }).first().click(); await p.waitForTimeout(400); });
  await r.run('lucro-regras', async (p) => { await p.getByRole('button', { name: /ler as regras/i }).click().catch(() => {}); await p.waitForTimeout(400); });
  await r.run('pub-lista', async (p) => { await p.getByRole('button', { name: /^‹ Equipa/ }).click(); await p.waitForTimeout(400); await p.getByRole('button', { name: /^publicidade/i }).click(); await p.waitForTimeout(800); });
  await r.run('pub-copiar', async (p) => { await p.getByRole('button', { name: /copiar texto/i }).first().click(); await p.waitForTimeout(300); });
  await r.run('pub-partilhar', async (p) => { await p.locator('[data-share]').first().click(); await p.waitForTimeout(500); }, ['canvas']);
  await r.run('pub-desfazer', async (p) => { await p.waitForTimeout(3600); await p.locator('[data-share]').first().click(); await p.waitForTimeout(400); });
  await r.run('avisos', async (p) => { await p.getByRole('button', { name: /novas?$|avisos/i }).first().click(); await p.waitForTimeout(700); });
  await r.run('perfil', async (p) => { await p.getByRole('button', { name: /^fechar/i }).first().click(); await p.waitForTimeout(400); await p.getByRole('button', { name: 'Perfil' }).click(); await p.waitForTimeout(700); });
  await r.run('apagar-exemplos-confirma', ri(/apagar os dados de exemplo/i));
  await r.run('apagar-exemplos-ok', async (p) => { await p.locator('[data-cf-ok]').click(); await p.waitForTimeout(600); });
  expect(r.erros.join('\n')).toBe('');
});

test('BU: publicidade (criar, editar, apagar)', async ({ browser }) => {
  const pg = await par(browser, { conta: 'foreverbu', pins });
  const r = runner(pg);
  await r.run('bu-equipa', async (p) => { await tab('Equipa')(p); await p.waitForTimeout(600); });
  await r.run('bu-pub', async (p) => { await p.getByRole('button', { name: /^publicidade/i }).click(); await p.waitForTimeout(800); });
  await r.run('bu-nova', async (p) => { await p.getByRole('button', { name: /nova publica/i }).click(); await p.waitForTimeout(700); });
  await r.run('bu-nova-erro', async (p) => { await p.getByRole('button', { name: /publicar para a equipa/i }).click(); await p.waitForTimeout(300); });
  await r.run('bu-nova-preenche', async (p) => {
    await p.getByPlaceholder('ex.: Campanha de Natal').fill('Campanha de teste');
    await p.locator('textarea').first().fill('Texto pronto a copiar #forevergold');
    await p.locator('input[type=file]').first().setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: png });
    await p.waitForTimeout(900);
  });
  await r.run('bu-nova-publica', async (p) => { await p.getByRole('button', { name: /publicar para a equipa/i }).click(); await p.waitForTimeout(900); });
  await r.run('bu-editar', async (p) => { await p.getByRole('button', { name: /^editar/i }).first().click(); await p.waitForTimeout(700); });
  await r.run('bu-editar-cancela', async (p) => { await p.getByRole('button', { name: /^fechar/i }).first().click(); await p.waitForTimeout(400); });
  await r.run('bu-apagar', async (p) => { await p.getByRole('button', { name: /^apagar/i }).first().click(); await p.waitForTimeout(400); });
  await r.run('bu-apagar-ok', async (p) => { await p.locator('[data-cf-ok]').click(); await p.waitForTimeout(600); });
  expect(r.erros.join('\n')).toBe('');
});

test('oficina e Filipe: hub sem jogo; loja não dona', async ({ browser }) => {
  for (const conta of ['foreveroficina', 'foreverfilipe']) {
    const pg = await par(browser, { conta, pins });
    const r = runner(pg);
    await r.run(conta + '-inicio', pausa(600));
    await r.run(conta + '-equipa', async (p) => { await tab('Equipa')(p); await p.waitForTimeout(600); });
    await r.run(conta + '-lucro', async (p) => { await p.getByRole('button', { name: /^lucro do mês/i }).click(); await p.waitForTimeout(900); });
    await r.run(conta + '-loja', async (p) => { await tab('Lojas')(p); await p.waitForTimeout(500); await p.locator('button', { hasText: 'à venda' }).nth(2).click(); await p.waitForTimeout(600); });
    expect(r.erros.join('\n')).toBe('');
  }
});

test('banner de mensagem nova (outra janela)', async ({ browser }) => {
  const pg = await par(browser, { conta: 'foreverstovidio', pins });
  const r = runner(pg);
  await r.run('banner-antes', pausa(300));
  await r.run('banner', async (p) => {
    const q = await p.context().newPage(); await q.goto(p.url()); await q.waitForTimeout(800);
    await q.evaluate(() => { const d = JSON.parse(localStorage.getItem('fg-app-v1')); d.chat.push({ id: 'cX', by: 'foreverfilipe', at: Date.now() + 5000, txt: 'Mensagem de teste para o banner.', urg: true }); localStorage.setItem('fg-app-v1', JSON.stringify(d)); });
    await q.close(); await p.waitForTimeout(800);
  });
  expect(r.erros.join('\n')).toBe('');
});
