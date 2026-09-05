/**
 * sw.js - Service Worker لتفعيل تثبيت التطبيق (PWA) واستقبال إشعارات OneSignal
 * يجب أن يبقى في جذر الموقع بجانب index.html
 */

// دمج ملف عامل OneSignal داخل نفس الـ Service Worker حتى تعمل الإشعارات وتثبيت التطبيق معاً
try {
  importScripts("https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js");
} catch (e) {
  console.warn("تعذر تحميل عامل OneSignal:", e);
}

const CACHE_NAME = "halaqat-alhuda-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// تمرير الطلبات مباشرة للشبكة (بدون تخزين مؤقت) - يكفي لتحقيق شرط قابلية التثبيت
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
