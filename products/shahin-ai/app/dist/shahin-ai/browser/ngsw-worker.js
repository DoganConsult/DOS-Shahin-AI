// Kill-switch service worker.
// Replaces the real Angular ngsw-worker.js to break the registration on
// existing user devices. Was caching /api/auth/oidc/* and replaying
// duplicate /start requests, overwriting the OIDC state cookie and
// triggering STATE_MISMATCH on the callback. New visits will fetch this
// file as an SW update; the worker installs, claims clients, then
// unregisters itself and clears all caches. Subsequent loads have no SW.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());

  event.waitUntil(
    self.registration.unregister().then(() => {
      console.log('ngsw kill-switch: unregistered stale Angular service worker');
    }),
  );

  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))),
  );
});

self.addEventListener('fetch', (event) => {
  // Always pass through to network — never serve cached responses.
  event.respondWith(fetch(event.request));
});
