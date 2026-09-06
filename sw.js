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

// تمرير طلبات ملفات الموقع نفسه فقط للشبكة (يكفي لتحقيق شرط قابلية التثبيت)
// مع تجاهل كامل لأي طلب خارجي (Firestore, Firebase, OneSignal...) أو غير GET
// حتى لا يتدخل هذا العامل إطلاقاً في اتصالات الحفظ السحابي بأي شكل
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET") {
    return; // اترك الطلب يمر كأن لا يوجد Service Worker إطلاقاً
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
