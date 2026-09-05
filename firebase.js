/**
 * ==========================================================================
 * firebase.js - محرك الاتصال بـ Firebase، الحفظ الآمن الشامل، ومنع فقدان البيانات
 * ==========================================================================
 */

let dbFirestore = null;
let firebaseAuth = null;
let isFirebaseOnline = false;

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
  tests: [],
  notifications: [],
  messages: [],
  screenOrder: [],
  circlesOrder: [],
  trophyStudentId: null,
  settings: { ...SAFE_DEFAULT_SETTINGS },
  logs: [],
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
      seedProductionAdminOnly();
    }
  } else {
    seedProductionAdminOnly();
  }

  // مزامنة السحابة
  if (isFirebaseOnline && dbFirestore) {
    syncAndPurgeDataFromCloud();
    watchForAppUpdates();
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
        if (user.pass !== "1111") {
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
  } catch (e) {
    console.error("فشل حفظ البيانات في LocalStorage:", e);
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
    settings: { ...SAFE_DEFAULT_SETTINGS },
    logs: [
      {
        id: "log_" + baseTime,
        userName: "صالح ال ناشع",
        action: "تهيئة النظام وتدشين الحسابات",
        timestamp: new Date().toLocaleDateString("ar-SA"),
      },
    ],
  };
  saveLocalStore();
}

const CLOUD_SYNC_MIN_INTERVAL_MS = 2 * 60 * 1000;
const LAST_SYNC_KEY = "HALAQAT_LAST_CLOUD_SYNC_AT";

// مزامنة ذكية تدمج البيانات ولا تحذف أي سجلات سابقة نهائياً
async function syncAndPurgeDataFromCloud() {
  if (!dbFirestore) return;

  const lastSync = Number(localStorage.getItem(LAST_SYNC_KEY) || 0);
  if (Date.now() - lastSync < CLOUD_SYNC_MIN_INTERVAL_MS) {
    return;
  }

  const allCollections = [
    "users",
    "students",
    "teachers",
    "circles",
    "settings",
    "logs",
    "attendance",
    "teacherAttendance",
    "tasmeea",
    "tests",
    "notifications",
    "messages",
    "screenOrder",
  ];

  try {
    for (const col of allCollections) {
      const snapshot = await dbFirestore.collection(col).get();
      if (!snapshot.empty) {
        const cloudItems = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (col === "settings") {
          window.appStore.settings = cloudItems[0] || SAFE_DEFAULT_SETTINGS;
        } else if (col === "screenOrder") {
          window.appStore.screenOrder = cloudItems[0]?.order || [];
          window.appStore.trophyStudentId =
            cloudItems[0]?.trophyStudentId || null;
        } else {
          // دمج البيانات السحابية مع المحلية بالمعرف (ID) لمنع ضياع أي سجل غير مرفوع
          const localItems = Array.isArray(window.appStore[col])
            ? window.appStore[col]
            : [];
          const mergedMap = new Map();

          localItems.forEach((it) => {
            if (it && it.id) mergedMap.set(String(it.id), it);
          });
          cloudItems.forEach((it) => {
            if (it && it.id) {
              const existing = mergedMap.get(String(it.id)) || {};
              mergedMap.set(String(it.id), { ...existing, ...it });
            }
          });

          window.appStore[col] = Array.from(mergedMap.values());
        }
      }
    }

    migrateAllPasswordsRoleBased();
    saveLocalStore();
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    if (typeof refreshActiveView === "function") {
      refreshActiveView();
    }
  } catch (err) {
    console.warn(
      "لم تتم المزامنة مع Firestore، تم الاعتماد على النسخة المحلية المعتمدة:",
      err,
    );
  }
}

// دالة الحفظ السحابي المحمية من الأخطاء وحفظ النسخة المحلية فوراً
async function saveToCloud(collectionName, docId, data, isDelete = false) {
  if (!collectionName || !docId) return;
  const validDocId = String(docId);

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
      } else if (data) {
        // تنظيف البيانات من أي حقول غير معرّفة (undefined) لمنع خطأ Firestore الشائع
        const cleanData = JSON.parse(JSON.stringify(data));
        await dbFirestore
          .collection(collectionName)
          .doc(validDocId)
          .set(cleanData, { merge: true });
      }
    } catch (e) {
      console.error(`خطأ أثناء الحفظ في Firestore [${collectionName}]:`, e);
    }
  }
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
