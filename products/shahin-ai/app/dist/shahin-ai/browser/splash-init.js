// Fade out splash overlay once Angular has bootstrapped (or on timeout fallback).
(function () {
  var _splashObs = null;
  function removeSplashOverlay() {
    var s = document.getElementById('splash-overlay');
    if (!s) return;
    s.style.opacity = '0';
    setTimeout(function () {
      var t = document.getElementById('splash-overlay');
      if (t) t.remove();
    }, 1400);
    if (_splashObs) {
      try { _splashObs.disconnect(); } catch (e) {}
      _splashObs = null;
    }
  }
  function appRootHasContent(root) {
    return root && root.childNodes && root.childNodes.length > 0;
  }
  _splashObs = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length > 0) {
        removeSplashOverlay();
        break;
      }
    }
  });
  var _appRoot = document.querySelector('app-root');
  // Race: first paint may add children before observe() runs — clear splash immediately if so.
  if (_appRoot && appRootHasContent(_appRoot)) {
    removeSplashOverlay();
  } else if (_appRoot) {
    _splashObs.observe(_appRoot, { childList: true, subtree: false });
  }
  // Second chance after layout: catches edge cases where children appear in same frame as script end.
  requestAnimationFrame(function () {
    var r = document.querySelector('app-root');
    if (r && appRootHasContent(r)) removeSplashOverlay();
  });
  // Fallback: remove after 8s even if Angular fails to bootstrap or script load order hid mutations
  setTimeout(removeSplashOverlay, 8000);
})();
