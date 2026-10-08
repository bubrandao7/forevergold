import fs from 'node:fs';
/* Caminho do Chromium: PW_CHROMIUM, o instalado em /opt/pw-browsers, ou o do próprio Playwright. */
export function chromiumPath() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const dir = '/opt/pw-browsers';
  if (fs.existsSync(dir)) {
    const d = fs.readdirSync(dir).filter((n) => /^chromium-\d+$/.test(n)).sort().pop();
    if (d && fs.existsSync(`${dir}/${d}/chrome-linux/chrome`)) return `${dir}/${d}/chrome-linux/chrome`;
  }
  return undefined;
}
