// Foundation Console app bootstrap.
// Doctrine: zero hardcoded URLs/realms/clients. Fetch /config.json from gateway first,
// then bootstrap Angular with that runtime config. App is a renderer; DB drives UI.
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

async function loadRuntimeConfig(): Promise<unknown> {
  const res = await fetch('/config.json', { credentials: 'include' });
  if (!res.ok) throw new Error(`/config.json failed: ${res.status}`);
  return res.json();
}

(async () => {
  const runtimeConfig = await loadRuntimeConfig();
  await bootstrapApplication(AppComponent, appConfig(runtimeConfig));
})().catch((err) => {
  // No fallback. Visible diagnostic. Doctrine: empty data = empty UI.
  // eslint-disable-next-line no-console
  console.error('[fc/app] bootstrap failed', err);
  document.body.innerText = 'Foundation Console: bootstrap failed (see console).';
});
