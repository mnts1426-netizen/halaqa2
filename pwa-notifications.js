/**
 * ==========================================================================
 * pwa-notifications.js - تثبيت التطبيق (PWA) وتفعيل إشعارات Push عبر OneSignal
 * الزر متاح للمدير والمعلم والطالب (نسخة داخل الشريط الجانبي، ونسخة أخرى
 * داخل صفحة الطالب) - كلها تشترك بنفس الأصناف js-install-notify-btn/status
 * ==========================================================================
 */

let deferredInstallPrompt = null;

// علامة دائمة (بالجهاز/المتصفح) لإخفاء بطاقة "ثبّت التطبيق" نهائياً من صفحة الطالب
// بعد أول تفعيل ناجح (تثبيت أو تفعيل إشعارات) بدل ظهورها في كل زيارة بلا داعٍ
const PWA_BANNER_DISMISSED_KEY = "halaqat_pwa_banner_dismissed_v1";
function isPwaInstallBannerDismissed() {
  try {
    return localStorage.getItem(PWA_BANNER_DISMISSED_KEY) === "1";
  } catch (e) {
    return false;
  }
}
function dismissPwaInstallBannerPermanently() {
  try {
    localStorage.setItem(PWA_BANNER_DISMISSED_KEY, "1");
  } catch (e) {
    // تجاهل بأمان لو تعذّر الوصول للتخزين المحلي - البطاقة تبقى تظهر فقط، بلا كسر لأي شيء
  }
  if (
    window.currentUser &&
    window.currentUser.role === window.ROLES?.STUDENT &&
    typeof renderStudentData === "function"
  ) {
    renderStudentData();
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallNotifyStatus("✅ التطبيق مثبت على هذا الجهاز");
  dismissPwaInstallBannerPermanently();
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

// الآيفون/الآيباد: آبل لا تسمح لأي موقع بإظهار نافذة "تثبيت" بضغطة زر (هذه الخاصية في أندرويد
// فقط)، فالتثبيت يكون من زر المشاركة في المتصفح نفسه. لذا يعرض الزر على الآيفون خطوات واضحة.
function isAppleMobileDevice() {
  const ua = navigator.userAgent || "";
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isRunningAsInstalledApp() {
  return (
    (window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true
  );
}

function showIosInstallGuide() {
  let modal = document.getElementById("modal-ios-install");
  if (!modal) {
    const ua = navigator.userAgent || "";
    const notSafari = /CriOS|FxiOS|EdgiOS|OPiOS|Instagram|FBAN|FBAV|Snapchat|Line\//i.test(
      ua,
    );
    modal = document.createElement("div");
    modal.id = "modal-ios-install";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 420px;">
        <div class="modal-header">
          <h3>📲 تثبيت التطبيق على الآيفون</h3>
          <button class="modal-close" onclick="closeModal('modal-ios-install')">&times;</button>
        </div>
        <div class="modal-body" style="line-height: 1.9; font-weight: 700;">
          <p style="margin-top: 0;">شركة آبل لا تسمح بالتثبيت بضغطة زر، لكنه سهل بثلاث خطوات:</p>
          ${notSafari ? '<p style="color:#c62828;">⚠️ افتح هذه الصفحة أولاً من متصفح <b>Safari</b> (انسخ الرابط والصقه فيه).</p>' : ""}
          <div>1️⃣ اضغط زر <b>المشاركة</b> <span style="display:inline-block;border:2px solid #0a84ff;border-radius:6px;padding:0 6px;color:#0a84ff;">⬆</span> أسفل الشاشة (أو أعلاها في الآيباد).</div>
          <div>2️⃣ مرّر للأسفل واختر <b>"إضافة إلى الشاشة الرئيسية"</b> ➕</div>
          <div>3️⃣ اضغط <b>"إضافة"</b> في أعلى الشاشة.</div>
          <p style="margin-bottom: 0; color: var(--text-muted);">بعدها يظهر التطبيق بين تطبيقاتك ويفتح مباشرة بدون شريط المتصفح.</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" onclick="closeModal('modal-ios-install')">فهمت</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.classList.add("active");
}

// دالة الزر الموحّد: تثبيت التطبيق + تفعيل الإشعارات بضغطة واحدة
window.handleInstallAndEnableNotifications = async function () {
  if (isAppleMobileDevice()) {
    if (isRunningAsInstalledApp()) {
      updateInstallNotifyStatus("✅ التطبيق مثبت على هذا الجهاز");
    } else {
      showIosInstallGuide();
    }
    return;
  }

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
        dismissPwaInstallBannerPermanently();
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
// ملاحظة أمنية: هذا الاستدعاء غير آمن أصلاً من داخل المتصفح مباشرة (لأن الموقع
// فيه صفحة تسجيل عامة لا تتطلب دخولاً، فأي كود بالصفحة يظهر لأي زائر) - لذا
// window.ONESIGNAL_REST_API_KEY فارغ الآن عمداً حتى يُبنى خادم وسيط آمن يحمل
// المفتاح بدلاً من المتصفح. الدالة تتوقف بأمان دون أي تأثير طالما المفتاح فارغ.
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
