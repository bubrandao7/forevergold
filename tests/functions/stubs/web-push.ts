/* Substituto de npm:web-push para os testes: grava cada envio num ficheiro em vez de contactar o serviço de push. */
const FICHEIRO = Deno.env.get('PUSH_STUB_FICHEIRO')!;
export default {
  setVapidDetails() {},
  async sendNotification(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, corpo: string, opts: unknown) {
    if (sub.endpoint.includes('morta')) throw Object.assign(new Error('Gone'), { statusCode: 410 });
    await Deno.writeTextFile(FICHEIRO, JSON.stringify({ endpoint: sub.endpoint, corpo: JSON.parse(corpo), opts }) + '\n', { append: true });
    return { statusCode: 201 };
  }
};
