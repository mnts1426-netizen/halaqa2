/**
 * ==========================================================================
 * pwa-notifications.js - تثبيت التطبيق (PWA) وتفعيل إشعارات Push عبر OneSignal
 * الزر متاح للمدير والمعلم والطالب (نسخة داخل الشريط الجانبي، ونسخة أخرى
 * داخل صفحة الطالب) - كلها تشترك بنفس الأصناف js-install-notify-btn/status
 * ==========================================================================
 */

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallNotifyStatus("✅ التطبيق مثبت على هذا الجهاز");
});

// تحديث كل نسخ زر/شريط التثبيت الموجودة بالصفحة (شريط جانبي للمدير/المعلم + بطاقة صفحة الطالب)
function updateInstallNotifyStatus(text) {
  document.querySelectorAll(".js-install-notify-status").forEach((el) => {
    el.textContent = text;
  });
}

function setInstallNotifyButtonsDisabled(disabled) {
  document.querySelectorAll(".js-install-notify-btn").forEach((el) => {
    el.disabled = disabled;
  });
}

function isOneSignalConfigured() {
  return Boolean(window.ONESIGNAL_APP_ID);
}

// تهيئة OneSignal فور تحميل الصفحة (بدون طلب إذن تلقائي - الطلب يتم فقط عند ضغط المدير على الزر)
window.OneSignalDeferred = window.OneSignalDeferred || [];
if (isOneSignalConfigured()) {
  OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.init({
        appId: window.ONESIGNAL_APP_ID,
        serviceWorkerPath: "sw.js",
        serviceWorkerParam: { scope: "/" },
      });

      if (window.currentUser && OneSignal.User.PushSubscription.optedIn) {
        updateInstallNotifyStatus("✅ الإشعارات مفعّلة على هذا الجهاز");
      }
    } catch (e) {
      console.warn("تعذر تهيئة OneSignal:", e);
    }
  });
}

// دالة الزر الموحّد: تثبيت التطبيق + تفعيل الإشعارات بضغطة واحدة
window.handleInstallAndEnableNotifications = async function () {
  setInstallNotifyButtonsDisabled(true);
  updateInstallNotifyStatus("جاري التنفيذ...");

  // 1. تثبيت التطبيق على الجهاز (إن كان المتصفح يدعم ذلك ولم يثبت مسبقاً)
  try {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
    }
  } catch (e) {
    console.warn("تعذر عرض نافذة تثبيت التطبيق:", e);
  }

  // 2. تفعيل إشعارات Push عبر OneSignal
  if (!isOneSignalConfigured()) {
    updateInstallNotifyStatus(
      "⚠️ لم يتم ربط خدمة الإشعارات بعد (راجع ONESIGNAL_APP_ID في config.js)",
    );
    setInstallNotifyButtonsDisabled(false);
    return;
  }

  const currentRole = (window.currentUser && window.currentUser.role) || "admin";

  OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.Notifications.requestPermission();

      if (OneSignal.Notifications.permission) {
        OneSignal.User.addTag("role", currentRole);
        updateInstallNotifyStatus("✅ تم تفعيل الإشعارات الفورية بنجاح");
      } else {
        updateInstallNotifyStatus("⚠️ لم يتم منح إذن الإشعارات من المتصفح");
      }
    } catch (e) {
      console.error("خطأ أثناء تفعيل الإشعارات:", e);
      updateInstallNotifyStatus("⚠️ حدث خطأ أثناء تفعيل الإشعارات");
    } finally {
      setInstallNotifyButtonsDisabled(false);
    }
  });
};

// إرسال إشعار Push فوري لأجهزة المدير المفعّلة (عبر REST API الخاص بـ OneSignal)
// ملاحظة أمنية: يتم استدعاء هذا مباشرة من المتصفح (بدون سيرفر خاص)، لذا مفتاح
// ONESIGNAL_REST_API_KEY يكون ظاهراً في كود الصفحة. هذا مقبول لتطبيق داخلي
// صغير كهذا، لكن لا يصلح لتطبيق عام كبير الحجم.
window.sendAdminPushNotification = async function (title, message) {
  if (!window.ONESIGNAL_APP_ID || !window.ONESIGNAL_REST_API_KEY) return;

  try {
    await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Key ${window.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: window.ONESIGNAL_APP_ID,
        target_channel: "push",
        filters: [{ field: "tag", key: "role", relation: "=", value: "admin" }],
        headings: { ar: title, en: title },
        contents: { ar: message, en: message },
      }),
    });
  } catch (e) {
    console.warn("تعذر إرسال إشعار Push للمدير:", e);
  }
};
