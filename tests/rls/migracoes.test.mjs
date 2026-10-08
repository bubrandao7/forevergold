import test from 'node:test';
import assert from 'node:assert/strict';
import { novaBase, como } from './db.mjs';

test('as migrações aplicam-se numa base vazia e o seed carrega os exemplos', async () => {
  const b = await novaBase();
  const n = async (t) => Number((await b.c.query(`select count(*) from public.${t}`)).rows[0].count);
  assert.equal(await n('lojas'), 5);
  assert.equal(await n('contas'), 8);
  assert.equal(await n('pecas'), 16);
  assert.equal(await n('chat'), 3);
  assert.equal(await n('cotacoes'), 12);
  assert.equal(await n('pub'), 1);
  assert.equal(await n('vistos'), 32);
  // segundo seed não duplica
  await b.c.query('select fg.seed()');
  assert.equal(await n('pecas'), 16);
  await b.c.end();
});
