// End-to-end: drive OIDC registration for a KC user that already exists.
// Simulates the browser: start -> KC auth (password grant) -> callback stub
// Since the user already exists in KC with attributes, the "login" path of
// OIDC can bootstrap them. We simulate by calling the callback handler via
// code exchange: KC issues a code only via browser redirect, so we need to
// drive the authorize flow. Simpler: directly call bootstrapKeycloakRegistration.
import { bootstrapKeycloakRegistration } from '/root/DOS-AIO/services/auth-service/dist/domain/identity/keycloak-bootstrap.service.js';
import pg from 'pg';

const email = process.env.EMAIL;
const ksub  = process.env.USER_ID;
const out = await bootstrapKeycloakRegistration({
  realm: 'dogan',
  keycloakUserId: ksub,
  email,
  username: email,
  companyNameEn: 'E2E Co',
  userName: 'E2E Test',
  consent: 'accepted',
  idempotencyKey: `kc-registration:dogan:${ksub}`,
});
console.log('BOOTSTRAP_OUTCOME=', JSON.stringify(out));
if (out.kind === 'CREATED' || out.kind === 'EXISTING') {
  const { Client } = pg;
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const u = await c.query('SELECT user_id,email,tenant_id,status FROM public.users WHERE user_id=$1', [out.userId]);
  const i = await c.query('SELECT provider,external_subject,user_id FROM public.iam_identities WHERE user_id=$1', [out.userId]);
  console.log('USER_ROW=', JSON.stringify(u.rows[0]));
  console.log('IAM_ROW=', JSON.stringify(i.rows[0]));
  await c.end();
}
