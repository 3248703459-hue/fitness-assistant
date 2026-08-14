/* jianshen zhushou - service worker */
const VERSION = 'fit-assistant-v1';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './css/style.css',
  './assets/fonts/fonts.css',
  './assets/fonts/varela-round-400.woff2',
  './assets/fonts/nunito-sans-400.woff2',
  './assets/fonts/nunito-sans-600.woff2',
  './assets/fonts/nunito-sans-700.woff2',
  './js/store.js', './js/logic.js', './js/ui.js', './js/app.js',
  './data/zh-names.js', './data/workout-pools.js', './data/recipes.js', './data/exercises.js'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match('./index.html'); }));
    return;
  }
  if (url.pathname.indexOf('/gifs/') >= 0) {
    e.respondWith(caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        return res;
      });
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
      return res;
    });
  }));
});
