/**
 * ==========================================================================
 * firebase.js - محرك الاتصال بـ Firebase، الحفظ الآمن الشامل، ومنع فقدان البيانات
 * ==========================================================================
 */

let dbFirestore = null;
let firebaseAuth = null;
let isFirebaseOnline = false;

// تحصين ضد حقن HTML/جافاسكريبت (XSS): يُستخدم عند إدراج أي نص مصدره المستخدم
// (اسم، ملاحظة، رقم جوال...) داخل innerHTML، خصوصاً النصوص القادمة من نماذج
// عامة لا تتطلب تسجيل دخول (مثل استمارة طلب الالتحاق) حيث يمكن لأي زائر كتابة
// أي نص فيها - بدون هذا التحصين قد يُنفَّذ كودٌ ضار داخل متصفح المدير نفسه
window.escapeHtml = function (value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// الطالب له حلقة أساسية (circleId) وقد يكون له حلقات إضافية (extraCircleIds) دون
// أن يخرج من حلقته الأساسية. من ليس له حلقات إضافية يعمل بالضبط كما كان سابقاً.
window.studentInCircle = function (student, circleId) {
  if (!student || !circleId) return false;
  return (
    student.circleId === circleId ||
    (Array.isArray(student.extraCircleIds) &&
      student.extraCircleIds.includes(circleId))
  );
};

// المراحل (المرحليات) من الأولى إلى الخامسة عشرة بالترتيب، تُستخدم في كل القوائم المنسدلة
// والتقارير. الكتابة بدون همزة (المرحلية الاولى) لتطابق السجلات المحفوظة سابقاً.
window.MARHALIYA_NAMES = [
  "المرحلية الاولى",
  "المرحلية الثانية",
  "المرحلية الثالثة",
  "المرحلية الرابعة",
  "المرحلية الخامسة",
  "المرحلية السادسة",
  "المرحلية السابعة",
  "المرحلية الثامنة",
  "المرحلية التاسعة",
  "المرحلية العاشرة",
  "المرحلية الحادية عشرة",
  "المرحلية الثانية عشرة",
  "المرحلية الثالثة عشرة",
  "المرحلية الرابعة عشرة",
  "المرحلية الخامسة عشرة",
];

window.normalizeMarhaliya = function (text) {
  return String(text || "")
    .replace(/[أإآ]/g, "ا")
    .replace(/\s+/g, " ")
    .trim();
};

// ترتيب المرحلية (0 = الأولى ... 14 = الخامسة عشرة)؛ أي قيمة غير معروفة تأتي في النهاية
window.marhaliyaOrder = function (text) {
  const key = normalizeMarhaliya(text);
  const idx = window.MARHALIYA_NAMES.findIndex(
    (n) => normalizeMarhaliya(n) === key,
  );
  return idx < 0 ? 999 : idx;
};

window.sameMarhaliya = function (a, b) {
  return normalizeMarhaliya(a) === normalizeMarhaliya(b);
};

// خيارات <option> للقائمة المنسدلة. firstOption = {value, label}. وإن كانت القيمة
// المحفوظة غير موجودة في القائمة (سجل قديم مكتوب يدوياً) تُضاف كخيار حتى لا تضيع.
window.buildMarhaliyaOptionsHtml = function (selected, firstOption) {
  const esc = (v) =>
    String(v)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const sel = String(selected || "");
  const known = window.MARHALIYA_NAMES.some((n) => sameMarhaliya(n, sel));
  let html = firstOption
    ? `<option value="${esc(firstOption.value)}">${esc(firstOption.label)}</option>`
    : "";
  window.MARHALIYA_NAMES.forEach((n) => {
    html += `<option value="${esc(n)}"${sameMarhaliya(n, sel) ? " selected" : ""}>${esc(n)}</option>`;
  });
  if (sel && !known) {
    html += `<option value="${esc(sel)}" selected>${esc(sel)}</option>`;
  }
  return html;
};

window.studentInAnyCircle = function (student, circleIds) {
  return (circleIds || []).some((id) => studentInCircle(student, id));
};

// الإعدادات الافتراضية
const SAFE_DEFAULT_SETTINGS = window.DEFAULT_SETTINGS || {
  orgName: "مَجْمَع عبدالله بن مهدي القرآني",
  subTitle: "جامع الهدى",
  directorName: "صالح ال ناشع",
  logoNew: "logo12.jpeg",
  logoOld: "logo_transparent_1.png",
  logoLogin: "logo_transparent_2.png",
  headerFontSize: "13px",
  location: "",
};

const SAFE_ROLES = window.ROLES || {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
  SCREEN: "screen",
};

const STORAGE_KEY =
  typeof LOCAL_STORAGE_KEY !== "undefined"
    ? LOCAL_STORAGE_KEY
    : window.LOCAL_STORAGE_KEY || "HALAQAT_DATA_STORAGE_V1";

// كائن تخزين البيانات العام المحمي
window.appStore = window.appStore || {
  users: [],
  students: [],
  teachers: [],
  circles: [],
  attendance: [],
  teacherAttendance: [],
  tasmeea: [],
  tasmeeaKashf: [],
  tests: [],
  notifications: [],
  messages: [],
  screenOrder: [],
  circlesOrder: [],
  trophyStudentId: null,
  trophyStudentIds: [],
  settings: { ...SAFE_DEFAULT_SETTINGS },
  logs: [],
  financeRevenues: [],
  financeExpenses: [],
  payroll: [],
};

// تهيئة Firebase والاتصال بـ Firestore
function initFirebaseApp() {
  try {
    const config =
      typeof FIREBASE_CONFIG !== "undefined"
        ? FIREBASE_CONFIG
        : window.FIREBASE_CONFIG;

    if (typeof firebase !== "undefined" && config) {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      dbFirestore = firebase.firestore();
      firebaseAuth = firebase.auth();
      isFirebaseOnline = true;
      console.log("✅ تم الاتصال بـ Firebase بنجاح");
    } else {
      console.warn("⚠️ مكتبات Firebase غير محملة. تم استخدام التخزين المحلي.");
      isFirebaseOnline = false;
    }
  } catch (error) {
    console.warn(
      "⚠️ حدث خطأ في الاتصال بـ Firebase، سيتم العمل بالوضع المحلي:",
      error,
    );
    isFirebaseOnline = false;
  }

  loadInitialData();
}

// تحميل البيانات واسترجاعها محلياً وسحابياً دون أي تصفير أو حذف
function loadInitialData() {
  const localData = localStorage.getItem(STORAGE_KEY);
  // لا توجد نسخة محلية (جهاز جديد أو مُسحت بياناته): المزامنة القادمة كاملة
  if (!localData) clearSyncState();
  if (localData) {
    try {
      const parsedData = JSON.parse(localData);
      window.appStore = Object.assign(window.appStore, parsedData);

      // التأكد من بنية المصفوفات لضمان عدم توقف النظام
      const expectedArrays = [
        "users",
        "students",
        "teachers",
        "circles",
        "attendance",
        "teacherAttendance",
        "tasmeea",
        "tests",
        "notifications",
        "messages",
        "screenOrder",
        "logs",
        "financeRevenues",
        "financeExpenses",
        "payroll",
      ];
      expectedArrays.forEach((key) => {
        if (!Array.isArray(window.appStore[key])) {
          window.appStore[key] = [];
        }
      });

      // التحقق من حساب المدير
      let adminUser = window.appStore.users.find(
        (u) =>
          (u.username === "123456" || u.username === "admin") &&
          u.role === SAFE_ROLES.ADMIN,
      );

      if (!adminUser) {
        window.appStore.users.push({
          id: "u_admin_main",
          name: "صالح ال ناشع",
          role: SAFE_ROLES.ADMIN,
          username: "123456",
          pass: "1234",
          phone: "0500000000",
          status: "active",
          createdAt: Date.now(),
        });
      } else {
        adminUser.name = "صالح ال ناشع";
      }

      // التحقق من حساب الشاشة
      const hasScreen = window.appStore.users.some(
        (u) => u.username === "121212" && u.role === SAFE_ROLES.SCREEN,
      );

      if (!hasScreen) {
        window.appStore.users.push({
          id: "u_screen_fixed",
          name: "التميز الأسبوعي",
          role: SAFE_ROLES.SCREEN,
          username: "121212",
          pass: "1234",
          phone: "0500000000",
          status: "active",
          createdAt: Date.now(),
        });
      }

      migrateAllPasswordsRoleBased();
      saveLocalStore();
    } catch (e) {
      console.error("خطأ في قراءة LocalStorage:", e);
      clearSyncState();
      seedProductionAdminOnly();
    }
  } else {
    seedProductionAdminOnly();
  }

  // مزامنة السحابة
  if (isFirebaseOnline && dbFirestore) {
    syncAndPurgeDataFromCloud();
    watchForAppUpdates();
    watchAppTheme();
  }
}

// هوية المنصة (يختارها المدير من الإعدادات): classic = الهوية الحالية بلا تغيير.
// تُحفظ في مستند مستقل (meta/appTheme) وتصل لكل الأجهزة المفتوحة فوراً عند الحفظ
const APP_THEMES = ["classic", "islamic", "modern", "heritage"];
const APP_THEME_STORAGE_KEY = "HALAQAT_APP_THEME";
window.savedAppTheme = "classic";

window.applyAppTheme = function (theme, persist = true) {
  const t = APP_THEMES.includes(theme) ? theme : "classic";
  if (t === "classic") {
    document.documentElement.removeAttribute("data-app-theme");
  } else {
    document.documentElement.setAttribute("data-app-theme", t);
  }
  if (persist) {
    window.savedAppTheme = t;
    try {
      localStorage.setItem(APP_THEME_STORAGE_KEY, t);
    } catch (e) {}
  }
  return t;
};

try {
  const cachedTheme = localStorage.getItem(APP_THEME_STORAGE_KEY);
  if (APP_THEMES.includes(cachedTheme)) window.savedAppTheme = cachedTheme;
} catch (e) {}

function watchAppTheme() {
  if (!dbFirestore) return;
  try {
    dbFirestore
      .collection("meta")
      .doc("appTheme")
      .onSnapshot(
        (doc) => {
          const theme = doc.exists ? doc.data().theme : "classic";
          window.previewAppThemeValue = null;
          applyAppTheme(theme);
          if (typeof renderThemePicker === "function") renderThemePicker();
        },
        (error) => {
          console.warn("تنبيه أثناء قراءة هوية المنصة:", error);
        },
      );
  } catch (err) {
    console.warn("خطأ في تفعيل متابعة هوية المنصة:", err);
  }
}

const APP_BUILD_VERSION = "2026-09-02-1";

function watchForAppUpdates() {
  if (!dbFirestore) return;
  try {
    dbFirestore
      .collection("meta")
      .doc("appVersion")
      .onSnapshot(
        (doc) => {
          if (!doc.exists) return;
          const latest = doc.data().latest;
          if (latest && latest !== APP_BUILD_VERSION) {
            console.warn(
              "⚠️ يوجد إصدار أحدث من التطبيق، سيتم تحديث الصفحة تلقائياً...",
            );
            window.location.reload();
          }
        },
        (error) => {
          console.warn("تنبيه أثناء التحقق من إصدار التطبيق:", error);
        },
      );
  } catch (err) {
    console.warn("خطأ في تفعيل التحقق من إصدار التطبيق:", err);
  }
}

function migrateAllPasswordsRoleBased() {
  let hasChanges = false;
  if (Array.isArray(window.appStore.users)) {
    window.appStore.users.forEach((user) => {
      if (user.role === SAFE_ROLES.STUDENT || user.role === "student") {
        // يُعبّى الرقم السري الافتراضي فقط إن كان مفقوداً أصلاً - وليس كلما كان
        // مختلفاً عن "1111"، لأن الشرط السابق كان يُرجع أي رقم سري خاص يضبطه
        // المدير يدوياً من "إدارة الحسابات" إلى الافتراضي بصمت في أول مزامنة تالية
        if (!user.pass || user.pass === "") {
          user.pass = "1111";
          hasChanges = true;
          if (typeof saveToCloud === "function") {
            saveToCloud("users", user.id, user);
          }
        }
      } else if (user.role === SAFE_ROLES.TEACHER || user.role === "teacher") {
        if (!user.pass || user.pass === "") {
          user.pass = "1234";
          hasChanges = true;
          if (typeof saveToCloud === "function") {
            saveToCloud("users", user.id, user);
          }
        }
      }
    });
  }

  if (Array.isArray(window.appStore.students)) {
    window.appStore.students.forEach((stu) => {
      let userRec = (window.appStore.users || []).find((u) => u.id === stu.id);
      if (!userRec) {
        userRec = {
          id: stu.id,
          name: stu.name,
          phone: stu.phone || stu.parentPhone,
          role: "student",
          username: stu.nationalId || stu.phone || stu.id,
          pass: "1111",
          status: stu.status || "active",
          createdAt: stu.createdAt || Date.now(),
        };
        window.appStore.users.push(userRec);
        hasChanges = true;
        if (typeof saveToCloud === "function") {
          saveToCloud("users", userRec.id, userRec);
        }
      }
    });
  }

  if (hasChanges) {
    saveLocalStore();
  }
}

// حفظ الحالة في التخزين المحلي فوراً وبشكل دائم
function saveLocalStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.appStore));
    return true;
  } catch (e) {
    console.error("فشل حفظ البيانات في LocalStorage:", e);
    // النسخة المحلية المحفوظة لم تعد مطابقة لمؤشرات "التغييرات فقط"، فالمزامنة القادمة
    // تكون كاملة حتى لا تفوت أي بيانات
    clearSyncState();
    return false;
  }
}

function seedProductionAdminOnly() {
  const baseTime = Date.now();
  window.appStore = {
    users: [
      {
        id: "u_admin_main",
        name: "صالح ال ناشع",
        role: SAFE_ROLES.ADMIN,
        username: "123456",
        pass: "1234",
        phone: "0500000000",
        status: "active",
        createdAt: baseTime,
      },
      {
        id: "u_screen_fixed",
        name: "التميز الأسبوعي",
        role: SAFE_ROLES.SCREEN,
        username: "121212",
        pass: "1234",
        phone: "0500000000",
        status: "active",
        createdAt: baseTime,
      },
    ],
    teachers: [],
    circles: [],
    students: [],
    attendance: [],
    teacherAttendance: [],
    tasmeea: [],
    tests: [],
    notifications: [],
    messages: [],
    screenOrder: [],
    circlesOrder: [],
    trophyStudentId: null,
    trophyStudentIds: [],
    settings: { ...SAFE_DEFAULT_SETTINGS },
    logs: [
      {
        id: "log_" + baseTime,
        userName: "صالح ال ناشع",
        action: "تهيئة النظام وتدشين الحسابات",
        timestamp: new Date().toLocaleDateString("ar-SA"),
      },
    ],
    financeRevenues: [],
    financeExpenses: [],
    payroll: [],
  };
  saveLocalStore();
}

const CLOUD_SYNC_MIN_INTERVAL_MS = 2 * 60 * 1000;
const LAST_SYNC_KEY = "HALAQAT_LAST_CLOUD_SYNC_AT";

// ==========================================================================
// تقليل القراءات: "جلب التغييرات فقط"
// كل جهاز يحتفظ بنسخته المحلية، وبعد أول مزامنة كاملة يسأل Firestore في كل مزامنة
// تالية عن المستندات التي تغيّرت فقط منذ آخر مرة (بدل قراءة كل المستندات كل مرة).
// - كل حفظ عبر saveToCloud يضع ختم وقت من ساعة الخادم نفسه (_srvAt) فلا تؤثر ساعة الجهاز.
// - ويُسأل أيضاً بختم updatedAt (ساعة الجهاز) مع هامش 10 دقائق، حتى تصل تعديلات أي جهاز
//   ما زال يعمل بنسخة قديمة من البرنامج لا تضع ختم الخادم.
// - مزامنة كاملة تلقائياً: أول مرة على الجهاز، أو بعد مسح بياناته، أو مرة كل 7 أيام، أو
//   إذا فشل حفظ النسخة المحلية، أو إذا فشلت مزامنة التغييرات لأي سبب.
// - طريقة الدمج نفسها (المحلي يفوز إلا إذا كانت السحابية أحدث مؤكداً) وشواهد الحذف لم تتغيّر.
// ==========================================================================
const DELTA_SYNC_ENABLED = true;
const SYNC_STATE_KEY = "HALAQAT_SYNC_STATE_V1";
const FULL_SYNC_EVERY_MS = 7 * 24 * 60 * 60 * 1000;
const SERVER_STAMP_FIELD = "_srvAt";
const DELTA_OVERLAP_SERVER_MS = 60 * 1000;
const DELTA_OVERLAP_CLIENT_MS = 10 * 60 * 1000;

const CLOUD_SYNC_COLLECTIONS = [
  "users",
  "students",
  "teachers",
  "circles",
  "settings",
  "logs",
  "attendance",
  "teacherAttendance",
  "tasmeea",
  "tasmeeaKashf",
  "tests",
  "notifications",
  "messages",
  "screenOrder",
  "financeRevenues",
  "financeExpenses",
  "payroll",
];

// مجموعات المستند الواحد ذات المعالجة الخاصة: عند تغيّر أي مستند فيها تُقرأ كاملة (مستندان
// أو أقل) وتُطبَّق بنفس منطق المزامنة الكاملة تماماً حتى لا يتغيّر أي سلوك
const SPECIAL_SYNC_COLLECTIONS = ["settings", "screenOrder"];

function readSyncState() {
  try {
    const s = JSON.parse(localStorage.getItem(SYNC_STATE_KEY) || "null");
    return s && s.v === 1 ? s : null;
  } catch (e) {
    return null;
  }
}

function writeSyncState(state) {
  try {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    clearSyncState();
    return false;
  }
}

function clearSyncState() {
  try {
    localStorage.removeItem(SYNC_STATE_KEY);
  } catch (e) {}
}

function stampMillis(v) {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number")
    return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
  return 0;
}

function newSyncCursor() {
  return { srv: 0, upd: 0 };
}

function advanceSyncCursor(cursor, data, updField) {
  if (!data) return;
  const srv = stampMillis(data[SERVER_STAMP_FIELD]);
  if (srv > cursor.srv) cursor.srv = srv;
  const upd = data[updField];
  // يُتجاهل ختم جهاز ساعته متقدمة كثيراً حتى لا يقفز المؤشر للمستقبل فتفوت تعديلات لاحقة
  if (
    typeof upd === "number" &&
    upd > cursor.upd &&
    upd <= Date.now() + 5 * 60 * 1000
  ) {
    cursor.upd = upd;
  }
}

// مستند سحابي ← عنصر محلي (ختم الخادم يخص المزامنة فقط فلا يُخزَّن محلياً)
function cloudDocToLocalItem(doc) {
  const data = doc.data() || {};
  delete data[SERVER_STAMP_FIELD];
  return { id: doc.id, ...data };
}

function isDeltaSyncUsable(state) {
  if (!DELTA_SYNC_ENABLED || !state || !state.cursors || !state.tombs)
    return false;
  const now = Date.now();
  if (!state.lastFullAt || now - state.lastFullAt > FULL_SYNC_EVERY_MS)
    return false;
  // ساعة الجهاز رجعت للخلف بشكل واضح: الأسلم مزامنة كاملة
  if (now < state.lastFullAt - 24 * 60 * 60 * 1000) return false;
  if (!state.cursors.deletedTombstones) return false;
  return CLOUD_SYNC_COLLECTIONS.every((c) => state.cursors[c]);
}

window.isFullCloudSyncDue = function () {
  return !isDeltaSyncUsable(readSyncState());
};

// بصمة مستند (ختم الخادم + ختم الجهاز) لمعرفة هل تغيّر فعلاً منذ آخر تطبيق
function specialDocSignature(doc) {
  const d = doc.data() || {};
  return `${stampMillis(d[SERVER_STAMP_FIELD])}|${d.updatedAt ?? ""}`;
}

function recordSpecialSignatures(state, col, docs) {
  if (!state.specialSigs) state.specialSigs = {};
  const sigs = {};
  docs.forEach((doc) => {
    sigs[doc.id] = specialDocSignature(doc);
  });
  state.specialSigs[col] = sigs;
}

// تطبيق مجموعات المستند الواحد (نفس منطق المزامنة الكاملة السابق حرفياً)
function applySpecialCloudCollection(col, cloudItems) {
  if (col === "settings") {
    window.appStore.settings = cloudItems[0] || SAFE_DEFAULT_SETTINGS;
  } else if (col === "screenOrder") {
    window.appStore.screenOrder = cloudItems[0]?.order || [];
    // ترقية من حقل "الكأس المفرد" القديم إلى قائمة (كأس واحد لكل حلقة) دون فقدان
    // أي اختيار سابق كان قد حدّده المدير قبل هذا التحديث
    const cloudTrophyIds = cloudItems[0]?.trophyStudentIds;
    window.appStore.trophyStudentIds = Array.isArray(cloudTrophyIds)
      ? cloudTrophyIds
      : cloudItems[0]?.trophyStudentId
        ? [cloudItems[0].trophyStudentId]
        : [];
    window.appStore.trophyStudentId = null;
  }
}

// دمج عناصر سحابية مع المحلية بالمعرف (ID) لمنع ضياع أي سجل غير مرفوع - باستثناء أي
// معرّف له "شاهد حذف" فيُستبعد نهائياً من الطرفين. يُستخدم للمزامنة الكاملة (كل المستندات)
// ولمزامنة التغييرات (المستندات المتغيّرة فقط) بنفس المنطق تماماً
function mergeCloudItemsIntoLocal(col, cloudItems, deletedIds) {
  const localItems = Array.isArray(window.appStore[col])
    ? window.appStore[col]
    : [];
  const mergedMap = new Map();

  localItems.forEach((it) => {
    if (it && it.id && !(deletedIds && deletedIds.has(String(it.id)))) {
      mergedMap.set(String(it.id), it);
    }
  });
  cloudItems.forEach((it) => {
    if (it && it.id && !(deletedIds && deletedIds.has(String(it.id)))) {
      const existing = mergedMap.get(String(it.id));
      // تفضيل النسخة المحلية افتراضياً عند أي التباس (بدل تفضيل السحابة كما كان
      // سابقاً): تُستبدَل المحلية بالسحابية فقط إذا كانت السحابية تحمل ختم وقت
      // "أحدث فعلياً وبشكل مؤكد" من المحلية. أي حالة غموض (ختم وقت مفقود من أي
      // طرف، تساوي الختمين، إلخ) تُبقي المحلية كما هي - لأن تفضيل السحابة
      // افتراضياً كان يُرجع تعديلات المدير الأخيرة لحالتها القديمة بصمت كلما
      // قرأت المزامنة الدورية نسخة سحابية لم تتحدّث بعد بتعديله (وهو السبب
      // الفعلي وراء ظهور التعديلات وكأنها "لا تُحفظ")
      const cloudIsConfirmedNewer =
        typeof it.updatedAt === "number" &&
        (!existing ||
          typeof existing.updatedAt !== "number" ||
          it.updatedAt > existing.updatedAt);
      if (existing && !cloudIsConfirmedNewer) {
        return;
      }
      mergedMap.set(String(it.id), { ...(existing || {}), ...it });
    }
  });

  window.appStore[col] = Array.from(mergedMap.values());
}

function removeTombstonedLocalItems(col, deletedIds) {
  if (!deletedIds || !Array.isArray(window.appStore[col])) return;
  window.appStore[col] = window.appStore[col].filter(
    (it) => !(it && it.id && deletedIds.has(String(it.id))),
  );
}

function tombsToSets(tombs) {
  const sets = {};
  Object.keys(tombs || {}).forEach((col) => {
    sets[col] = new Set((tombs[col] || []).map(String));
  });
  return sets;
}

// المستندات التي تغيّرت بعد المؤشر: بختم الخادم أو بختم الجهاز (لأجهزة النسخة القديمة)
async function fetchChangedCloudDocs(col, cursor, updField) {
  const ref = dbFirestore.collection(col);
  const srvFrom = firebase.firestore.Timestamp.fromMillis(
    Math.max(0, cursor.srv - DELTA_OVERLAP_SERVER_MS),
  );
  const updFrom = Math.max(0, cursor.upd - DELTA_OVERLAP_CLIENT_MS);
  const [bySrv, byUpd] = await Promise.all([
    ref.where(SERVER_STAMP_FIELD, ">", srvFrom).get(),
    ref.where(updField, ">", updFrom).get(),
  ]);
  const byId = new Map();
  bySrv.docs.forEach((d) => byId.set(d.id, d));
  byUpd.docs.forEach((d) => byId.set(d.id, d));
  return Array.from(byId.values());
}

// المزامنة الكاملة (نفس السابق) + حساب مؤشرات التغييرات لكل مجموعة
async function runFullCloudSync() {
  const state = {
    v: 1,
    lastFullAt: Date.now(),
    cursors: {},
    tombs: {},
  };
  let stateUsable = true;

  // جلب "شواهد الحذف" أولاً لبناء قائمة استبعاد: بدونها، أي سجل حُذف فعلياً من جهاز
  // ما يبقى موجوداً في النسخة المحلية لجهاز آخر لأن الدمج لا يحذف أي سجل محلي
  // بتصميمه (لحماية البيانات غير المرفوعة بعد)، وهذا بالضبط سبب "عودة المحذوفات"
  const deletedSets = {};
  try {
    const tombCursor = newSyncCursor();
    const tombSnapshot = await dbFirestore
      .collection("deletedTombstones")
      .get();
    tombSnapshot.docs.forEach((doc) => {
      const d = doc.data();
      advanceSyncCursor(tombCursor, d, "deletedAt");
      if (d && d.collection && d.docId) {
        if (!deletedSets[d.collection]) deletedSets[d.collection] = new Set();
        deletedSets[d.collection].add(String(d.docId));
      }
    });
    state.cursors.deletedTombstones = tombCursor;
  } catch (e) {
    console.warn("تعذّر جلب سجل شواهد الحذف (deletedTombstones):", e);
    stateUsable = false;
  }

  for (const col of CLOUD_SYNC_COLLECTIONS) {
    const deletedIds = deletedSets[col];
    const cursor = newSyncCursor();
    const snapshot = await dbFirestore.collection(col).get();
    snapshot.docs.forEach((doc) =>
      advanceSyncCursor(cursor, doc.data(), "updatedAt"),
    );
    state.cursors[col] = cursor;
    if (SPECIAL_SYNC_COLLECTIONS.includes(col)) {
      recordSpecialSignatures(state, col, snapshot.docs);
    }

    if (!snapshot.empty) {
      const cloudItems = snapshot.docs.map(cloudDocToLocalItem);
      if (SPECIAL_SYNC_COLLECTIONS.includes(col)) {
        applySpecialCloudCollection(col, cloudItems);
      } else {
        mergeCloudItemsIntoLocal(col, cloudItems, deletedIds);
      }
    } else if (deletedIds) {
      // المجموعة السحابية فارغة بالكامل لكن توجد شواهد حذف: نظّف المحلي منها احتياطاً
      removeTombstonedLocalItems(col, deletedIds);
    }
  }

  Object.keys(deletedSets).forEach((col) => {
    state.tombs[col] = Array.from(deletedSets[col]);
  });
  return stateUsable ? state : null;
}

// مزامنة التغييرات فقط منذ آخر مزامنة
async function runDeltaCloudSync(prevState) {
  const state = JSON.parse(JSON.stringify(prevState));

  const tombCursor = state.cursors.deletedTombstones;
  const tombDocs = await fetchChangedCloudDocs(
    "deletedTombstones",
    tombCursor,
    "deletedAt",
  );
  const newTombs = {};
  tombDocs.forEach((doc) => {
    const d = doc.data();
    advanceSyncCursor(tombCursor, d, "deletedAt");
    if (d && d.collection && d.docId) {
      if (!state.tombs[d.collection]) state.tombs[d.collection] = [];
      if (!state.tombs[d.collection].includes(String(d.docId))) {
        state.tombs[d.collection].push(String(d.docId));
      }
      if (!newTombs[d.collection]) newTombs[d.collection] = new Set();
      newTombs[d.collection].add(String(d.docId));
    }
  });
  const deletedSets = tombsToSets(state.tombs);
  Object.keys(newTombs).forEach((col) =>
    removeTombstonedLocalItems(col, newTombs[col]),
  );

  const changes = await Promise.all(
    CLOUD_SYNC_COLLECTIONS.map(async (col) => ({
      col,
      docs: await fetchChangedCloudDocs(col, state.cursors[col], "updatedAt"),
    })),
  );

  for (const { col, docs } of changes) {
    const cursor = state.cursors[col];
    docs.forEach((doc) => advanceSyncCursor(cursor, doc.data(), "updatedAt"));
    if (docs.length === 0) continue;

    if (SPECIAL_SYNC_COLLECTIONS.includes(col)) {
      // الهامش الزمني يُرجع آخر مستند مرة أخرى دائماً؛ لا تُعاد القراءة إلا إذا اختلف
      // ختم أي مستند عمّا طُبّق آخر مرة (تغيير فعلي)
      const knownSigs = (state.specialSigs && state.specialSigs[col]) || null;
      const reallyChanged =
        !knownSigs ||
        docs.some((doc) => knownSigs[doc.id] !== specialDocSignature(doc));
      if (!reallyChanged) continue;
      const snapshot = await dbFirestore.collection(col).get();
      recordSpecialSignatures(state, col, snapshot.docs);
      if (!snapshot.empty) {
        applySpecialCloudCollection(
          col,
          snapshot.docs.map(cloudDocToLocalItem),
        );
      }
    } else {
      mergeCloudItemsIntoLocal(
        col,
        docs.map(cloudDocToLocalItem),
        deletedSets[col],
      );
    }
  }

  return state;
}

let cloudSyncInFlight = null;

// مزامنة ذكية تدمج البيانات ولا تحذف أي سجلات سابقة نهائياً
// options.forceFull: مزامنة كاملة الآن (زر المدير) متجاوزة الحد الأدنى بين مزامنتين
async function syncAndPurgeDataFromCloud(options) {
  if (!dbFirestore) return;
  const forceFull = !!(options && options.forceFull);

  // مزامنة واحدة فقط في نفس الوقت (كانت تبدأ مزامنتان كاملتان معاً عند الدخول ثم فتح
  // التسميع مباشرة قبل انتهاء الأولى فتتضاعف القراءات)
  if (cloudSyncInFlight) return cloudSyncInFlight;

  const lastSync = Number(localStorage.getItem(LAST_SYNC_KEY) || 0);
  if (!forceFull && Date.now() - lastSync < CLOUD_SYNC_MIN_INTERVAL_MS) {
    return;
  }

  cloudSyncInFlight = (async () => {
    try {
      const prevState = readSyncState();
      let newState = null;
      let mode = "full";

      if (!forceFull && isDeltaSyncUsable(prevState)) {
        try {
          newState = await runDeltaCloudSync(prevState);
          mode = "delta";
        } catch (deltaErr) {
          console.warn(
            "تعذّرت مزامنة التغييرات فقط، سيتم إجراء مزامنة كاملة بدلاً منها:",
            deltaErr,
          );
          newState = null;
        }
      }
      if (mode === "full") {
        newState = await runFullCloudSync();
      }

      migrateAllPasswordsRoleBased();
      const savedLocally = saveLocalStore();
      if (savedLocally && newState) writeSyncState(newState);
      else clearSyncState();
      localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
      window.lastCloudSyncMode = mode;

      // تمرير الشاشة الظاهرة فعلياً حتى تُعاد كتابتها ببيانات المزامنة الجديدة (حذف
      // طالب من قبل المدير، تغيير حالة تحضير...) - بدون تمرير المعرّف هنا لا تُنفَّذ
      // أي دالة عرض خاصة بالشاشة (كل شروط "if (viewId === ...)" في refreshActiveView
      // تبقى معطَّلة)، فتبقى الشاشة المفتوحة بالبيانات القديمة حتى يُعاد تحميل الصفحة
      if (typeof refreshActiveView === "function") {
        const activeViewId = document.querySelector(".content-view.active")?.id;
        refreshActiveView(activeViewId);
      }
      return mode;
    } catch (err) {
      console.warn(
        "لم تتم المزامنة مع Firestore، تم الاعتماد على النسخة المحلية المعتمدة:",
        err,
      );
      return null;
    } finally {
      cloudSyncInFlight = null;
    }
  })();
  return cloudSyncInFlight;
}

// ==========================================================================
// شاشة العرض (حساب الشاشة فقط): "الاستماع للتغييرات" بدل مزامنة دورية كل 5 دقائق.
// لا تُحسب أي قراءة طالما لم يتغيّر شيء، وكل تعديل يُقرأ مرة واحدة فقط ويظهر على الشاشة
// عند التبديل التالي للشرائح. تُعاد تهيئة الاستماع كل ساعتين بمؤشرات محدَّثة.
// ==========================================================================
const SCREEN_LIVE_COLLECTIONS = [
  "students",
  "teachers",
  "circles",
  "attendance",
  "tasmeea",
  "screenOrder",
  "settings",
];
const SCREEN_LIVE_RESTART_MS = 2 * 60 * 60 * 1000;

let screenLiveUnsubs = [];
let screenLiveState = null;
let screenLiveRestartTimer = null;
let screenLivePersistTimer = null;
let screenLiveSpecialTimers = {};

function persistScreenLiveState() {
  if (!screenLiveState) return;
  const saved = saveLocalStore();
  if (!saved) return;
  // دمج مع المحفوظ (قد تكون مزامنة أخرى حدّثته) بأخذ الأحدث لكل مؤشر
  const stored = readSyncState();
  if (stored && stored.cursors && stored.tombs) {
    Object.keys(screenLiveState.cursors).forEach((col) => {
      const a = screenLiveState.cursors[col];
      const b = stored.cursors[col];
      if (b) {
        a.srv = Math.max(a.srv || 0, b.srv || 0);
        a.upd = Math.max(a.upd || 0, b.upd || 0);
      }
    });
    Object.keys(stored.cursors).forEach((col) => {
      if (!screenLiveState.cursors[col])
        screenLiveState.cursors[col] = stored.cursors[col];
    });
    Object.keys(stored.tombs).forEach((col) => {
      const set = new Set(screenLiveState.tombs[col] || []);
      (stored.tombs[col] || []).forEach((id) => set.add(id));
      screenLiveState.tombs[col] = Array.from(set);
    });
    screenLiveState.lastFullAt = Math.max(
      screenLiveState.lastFullAt || 0,
      stored.lastFullAt || 0,
    );
  }
  writeSyncState(screenLiveState);
}

function scheduleScreenLivePersist() {
  window.__screenDataDirty = true;
  clearTimeout(screenLivePersistTimer);
  screenLivePersistTimer = setTimeout(persistScreenLiveState, 3000);
}

function handleScreenLiveDocs(col, docs) {
  if (!screenLiveState || docs.length === 0) return;
  const updField = col === "deletedTombstones" ? "deletedAt" : "updatedAt";
  const cursor =
    screenLiveState.cursors[col] ||
    (screenLiveState.cursors[col] = newSyncCursor());
  docs.forEach((doc) => advanceSyncCursor(cursor, doc.data(), updField));

  if (col === "deletedTombstones") {
    docs.forEach((doc) => {
      const d = doc.data();
      if (!d || !d.collection || !d.docId) return;
      if (!screenLiveState.tombs[d.collection])
        screenLiveState.tombs[d.collection] = [];
      if (!screenLiveState.tombs[d.collection].includes(String(d.docId)))
        screenLiveState.tombs[d.collection].push(String(d.docId));
      removeTombstonedLocalItems(d.collection, new Set([String(d.docId)]));
    });
  } else if (SPECIAL_SYNC_COLLECTIONS.includes(col)) {
    // مستند أو مستندان فقط: يُعاد قراءتهما كاملين بنفس منطق المزامنة الكاملة
    clearTimeout(screenLiveSpecialTimers[col]);
    screenLiveSpecialTimers[col] = setTimeout(async () => {
      try {
        const snapshot = await dbFirestore.collection(col).get();
        if (!snapshot.empty) {
          applySpecialCloudCollection(
            col,
            snapshot.docs.map(cloudDocToLocalItem),
          );
          scheduleScreenLivePersist();
        }
      } catch (e) {
        console.warn("تعذّر تحديث إعدادات الشاشة:", e);
      }
    }, 1500);
    return;
  } else {
    const deletedIds = new Set((screenLiveState.tombs[col] || []).map(String));
    mergeCloudItemsIntoLocal(col, docs.map(cloudDocToLocalItem), deletedIds);
  }
  scheduleScreenLivePersist();
}

window.stopScreenLiveSync = function () {
  screenLiveUnsubs.forEach((unsub) => {
    try {
      unsub();
    } catch (e) {}
  });
  screenLiveUnsubs = [];
  clearTimeout(screenLiveRestartTimer);
  screenLiveRestartTimer = null;
  if (screenLiveState) persistScreenLiveState();
  screenLiveState = null;
};

window.isScreenLiveSyncActive = function () {
  return screenLiveUnsubs.length > 0;
};

window.startScreenLiveSync = async function () {
  if (!dbFirestore || !DELTA_SYNC_ENABLED) return false;
  const isScreenUser = () =>
    window.currentUser && window.currentUser.role === SAFE_ROLES.SCREEN;
  if (!isScreenUser()) return false;

  window.stopScreenLiveSync();
  // لا يبدأ الاستماع إلا بعد مزامنة سليمة (كاملة أو تغييرات) حتى تكون المؤشرات صحيحة
  if (cloudSyncInFlight) await cloudSyncInFlight;
  if (!isDeltaSyncUsable(readSyncState())) {
    await syncAndPurgeDataFromCloud({ forceFull: true });
  }
  const state = readSyncState();
  if (!isScreenUser() || !isDeltaSyncUsable(state)) return false;
  screenLiveState = state;

  [...SCREEN_LIVE_COLLECTIONS, "deletedTombstones"].forEach((col) => {
    const updField = col === "deletedTombstones" ? "deletedAt" : "updatedAt";
    const cursor = screenLiveState.cursors[col] || newSyncCursor();
    const ref = dbFirestore.collection(col);
    const queries = [
      ref.where(
        SERVER_STAMP_FIELD,
        ">",
        firebase.firestore.Timestamp.fromMillis(
          Math.max(0, cursor.srv - DELTA_OVERLAP_SERVER_MS),
        ),
      ),
      ref.where(updField, ">", Math.max(0, cursor.upd - DELTA_OVERLAP_CLIENT_MS)),
    ];
    queries.forEach((q) => {
      const unsub = q.onSnapshot(
        (snap) => {
          const changed = snap
            .docChanges()
            .filter((ch) => ch.type !== "removed")
            .map((ch) => ch.doc);
          handleScreenLiveDocs(col, changed);
        },
        (err) => {
          console.warn(`تعذّر الاستماع لتغييرات ${col}:`, err);
        },
      );
      screenLiveUnsubs.push(unsub);
    });
  });

  // إعادة تهيئة دورية بمؤشرات محدَّثة: إن انقطع الاتصال طويلاً لا يُعاد قراءة إلا القليل
  screenLiveRestartTimer = setTimeout(() => {
    if (isScreenUser()) window.startScreenLiveSync();
  }, SCREEN_LIVE_RESTART_MS);
  return true;
};

// دالة الحفظ السحابي المحمية من الأخطاء وحفظ النسخة المحلية فوراً
async function saveToCloud(collectionName, docId, data, isDelete = false) {
  if (!collectionName || !docId) return;
  const validDocId = String(docId);

  // ختم كل تعديل بوقت حفظه فعلياً - يُستخدم لاحقاً في دمج المزامنة السحابية لتفضيل
  // أحدث نسخة (محلية كانت أو سحابية) بدل تفضيل السحابية دائماً بصورة قد "تُرجع" تعديلاً
  // محلياً حديثاً جداً لحالته القديمة إن قرأت المزامنة الدورية نسخة سحابية لم تتحدّث بعد
  if (!isDelete && data && typeof data === "object") {
    data.updatedAt = Date.now();
  }

  // تحديث المخزن المحلي فوراً
  // ملاحظة: "screenOrder" ليست مصفوفة سجلات {id,...} كباقي المجموعات، بل مصفوفة
  // معرّفات نصية بسيطة (ويُدار محتواها يدوياً بدوال ترتيب الشاشة) لذا تُستثنى هنا
  // لمنع تلف بنيتها أو حدوث دائرية عند تمرير المصفوفة نفسها ضمن بيانات الحفظ
  if (
    collectionName !== "screenOrder" &&
    Array.isArray(window.appStore[collectionName])
  ) {
    if (isDelete) {
      window.appStore[collectionName] = window.appStore[collectionName].filter(
        (item) => String(item.id) !== validDocId,
      );
    } else if (data) {
      const idx = window.appStore[collectionName].findIndex(
        (item) => String(item.id) === validDocId,
      );
      if (idx > -1) {
        window.appStore[collectionName][idx] = {
          ...window.appStore[collectionName][idx],
          ...data,
        };
      } else {
        window.appStore[collectionName].push(data);
      }
    }
  }

  saveLocalStore();

  if (isFirebaseOnline && dbFirestore) {
    try {
      if (isDelete) {
        await dbFirestore.collection(collectionName).doc(validDocId).delete();
        // تسجيل "شاهد حذف" دائم يمنع عودة هذا السجل مستقبلاً من أي جهاز/تبويب آخر لا
        // يزال يحمل نسخة محلية قديمة منه عند مزامنته (راجع syncAndPurgeDataFromCloud)
        if (collectionName !== "deletedTombstones") {
          const tombId = `${collectionName}__${validDocId}`;
          await dbFirestore
            .collection("deletedTombstones")
            .doc(tombId)
            .set({
              collection: collectionName,
              docId: validDocId,
              deletedAt: Date.now(),
              ...(firebase.firestore.FieldValue
                ? {
                    [SERVER_STAMP_FIELD]:
                      firebase.firestore.FieldValue.serverTimestamp(),
                  }
                : {}),
            });
        }
      } else if (data) {
        // تنظيف البيانات من أي حقول غير معرّفة (undefined) لمنع خطأ Firestore الشائع
        const cleanData = JSON.parse(JSON.stringify(data));
        // ختم وقت من ساعة الخادم: تعتمد عليه "مزامنة التغييرات فقط" في كل الأجهزة
        if (firebase.firestore.FieldValue) {
          cleanData[SERVER_STAMP_FIELD] =
            firebase.firestore.FieldValue.serverTimestamp();
        }
        await dbFirestore
          .collection(collectionName)
          .doc(validDocId)
          .set(cleanData, { merge: true });
      }
    } catch (e) {
      console.error(`خطأ أثناء الحفظ في Firestore [${collectionName}]:`, e);
      // إظهار الخطأ فعلياً للمستخدم بدل فشل صامت لا يلاحظه أحد إلا لاحقاً عندما
      // "يعود" التعديل لحالته القديمة بصمت تام - هذا كان سبب غموض مشكلة عدم الحفظ
      alert(
        `⚠️ تعذّر حفظ هذا التعديل على الخادم السحابي، وقد يعود لحالته السابقة لاحقاً!\n\nالسبب التقني: ${e?.message || e}\n\nيرجى التأكد من اتصال الإنترنت وإعادة المحاولة. إن تكرر ظهور هذه الرسالة أبلغ مطوّر النظام بنصها بالضبط.`,
      );
      return false;
    }
  }
  return true;
}

// تسجيل العمليات
let __lastLogSignature = null;
let __lastLogSignatureTime = 0;

function addSystemLog(actionDesc) {
  const currentUser = window.currentUser || { name: "النظام" };
  const now = new Date();
  const timeString = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`;
  const nowMs = Date.now();

  const newLog = {
    id: "log_" + nowMs,
    userName: currentUser.name,
    action: actionDesc,
    timestamp: timeString,
    createdAt: nowMs,
  };

  if (!Array.isArray(window.appStore.logs)) window.appStore.logs = [];
  window.appStore.logs.unshift(newLog);
  if (window.appStore.logs.length > 200) {
    window.appStore.logs.pop();
  }

  const signature = currentUser.name + "|" + actionDesc;
  if (
    signature === __lastLogSignature &&
    nowMs - __lastLogSignatureTime < 1000
  ) {
    return;
  }
  __lastLogSignature = signature;
  __lastLogSignatureTime = nowMs;

  saveToCloud("logs", newLog.id, newLog);
}

document.addEventListener("DOMContentLoaded", () => {
  initFirebaseApp();
});
