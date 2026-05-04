#!/usr/bin/env node
/**
 * DOS Master L33 — atomic admin cert rotation.
 *
 * Re-mints a single leaf cert against the existing admin CA, replaces
 * the cert files in-place (atomic rename), then asks the user to run
 * the env-source restart recipe. Idempotent — safe to re-run.
 *
 * Usage:  node scripts/dos-master/rotate-admin-cert.mjs <service-code>
 *   e.g.  node scripts/dos-master/rotate-admin-cert.mjs dr-os
 *
 * Doctrine binding: §10 (no autonomous cert mint without ops nod —
 * this script PRINTS the openssl commands first and exits unless
 * --apply is passed).
 */
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, renameSync, statSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const svc = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');
if (!svc) {
  console.error('usage: rotate-admin-cert.mjs <service-code> [--apply]');
  process.exit(2);
}

const DIR = 'platform/config-center/secrets/admin-mtls';
const CA  = join(DIR, 'ca.crt');
const KEY = join(DIR, 'ca.key');
if (!existsSync(CA) || !existsSync(KEY)) {
  console.error(`admin CA missing at ${DIR}`);
  process.exit(1);
}
const tgtCert = join(DIR, `${svc}.crt`);
const tgtKey  = join(DIR, `${svc}.key`);
if (!existsSync(tgtCert)) {
  console.error(`unknown admin service: ${svc} (no existing cert at ${tgtCert})`);
  process.exit(1);
}

const cnf = `[req]
default_bits=4096
prompt=no
distinguished_name=dn
req_extensions=v3_req
[dn]
CN=${svc}
O=DOS Admin Zone
[v3_req]
subjectAltName=@alt
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth,clientAuth
[alt]
DNS.1=${svc}
DNS.2=localhost
IP.1=127.0.0.1
`;
const cnfPath = `/tmp/rotate-${svc}.cnf`;
writeFileSync(cnfPath, cnf);

const tmpKey  = join(DIR, `${svc}.key.new`);
const tmpCsr  = join(DIR, `${svc}.csr.new`);
const tmpCert = join(DIR, `${svc}.crt.new`);

const cmds = [
  `openssl genrsa -out ${tmpKey} 4096`,
  `openssl req -new -key ${tmpKey} -out ${tmpCsr} -config ${cnfPath}`,
  `openssl x509 -req -in ${tmpCsr} -CA ${CA} -CAkey ${KEY} -CAcreateserial ` +
    `-out ${tmpCert} -days 825 -sha256 -extensions v3_req -extfile ${cnfPath}`,
];

if (!apply) {
  console.log(`[rotate-admin-cert] DRY-RUN for ${svc}. Re-run with --apply to commit.`);
  cmds.forEach((c) => console.log('  $ ' + c));
  console.log(`Then atomic swap:`);
  console.log(`  mv ${tmpKey} ${tgtKey}`);
  console.log(`  mv ${tmpCert} ${tgtCert}`);
  console.log(`  pm2 restart ${svc}-service --update-env`);
  process.exit(0);
}

for (const c of cmds) {
  console.log(`+ ${c}`);
  execSync(c, { stdio: 'inherit' });
}
chmodSync(tmpKey, 0o600);
renameSync(tmpKey, tgtKey);
renameSync(tmpCert, tgtCert);
try { execSync(`rm -f ${tmpCsr}`); } catch {}

const exp = execSync(`openssl x509 -in ${tgtCert} -noout -enddate`, { encoding: 'utf8' });
console.log(`[rotate-admin-cert] OK ${svc} rotated. ${exp.trim()}`);
console.log(`[rotate-admin-cert] Next: restart ${svc}-service via env-source recipe.`);
