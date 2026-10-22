// Service worker «Заезды на виду»: оболочка из кеша (работает без связи), данные — сеть, потом кеш.
var VER = "zz-202610221158";
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./logo-light.svg", "./logo-dark.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VER).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VER; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function isData(url) { return /data\.json$|feed\.txt$/.test(url.pathname) || /gist\.githubusercontent\.com|script\.google|googleusercontent\.com/.test(url.hostname); }
self.addEventListener("fetch", function (e) {
  var req = e.request; if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (isData(url)) { // данные: сеть, при обрыве — последняя копия
    e.respondWith(fetch(req).then(function (r) { if (r.ok) { var cp = r.clone(); caches.open(VER).then(function (c) { c.put(req, cp); }); } return r; }).catch(function () { return caches.match(req); }));
    return;
  }
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html")) { // страница: сеть, при обрыве — кеш
    e.respondWith(fetch(req).then(function (r) { if (r.ok) { var cp = r.clone(); caches.open(VER).then(function (c) { c.put("./index.html", cp); }); } return r; }).catch(function () { return caches.match("./index.html"); }));
    return;
  }
  if (url.origin === location.origin) { // иконки, логотипы: кеш, обновление в фоне
    e.respondWith(caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (r) { if (r.ok) { var cp = r.clone(); caches.open(VER).then(function (c) { c.put(req, cp); }); } return r; }).catch(function () { return hit; });
      return hit || net;
    }));
  }
});
