// Fix Cloudflare Rocket Loader crossorigin mismatch on modulepreload links
document.querySelectorAll('link[rel="modulepreload"]').forEach(function(l) {
  if (!l.hasAttribute('crossorigin')) l.setAttribute('crossorigin', '');
});
