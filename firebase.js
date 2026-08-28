/**
 * ==========================================================================
 * firebase.js - محرك الاتصال بـ Firebase وقاعدة البيانات المحمية للمَجْمَع
 * ==========================================================================
 */

let dbFirestore = null;
let firebaseAuth = null;
let isFirebaseOnline = false;

// الإعدادات والمفاتيح الافتراضية الآمنة لمنع أي خطأ توقف برمجي
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

// كائن تخزين البيانات العام المحمي (يبدأ نظيفاً تماماً بدون أي طلاب أو معلمين)
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

// تحميل البيانات والتحقق من حساب المدير المعتمد فقط
function loadInitialData() {
  const localData = localStorage.getItem(STORAGE_KEY);
  if (localData) {
    try {
      const parsedData = JSON.parse(localData);
      window.appStore = Object.assign(window.appStore, parsedData);

      if (!Array.isArray(window.appStore.users)) window.appStore.users = [];
      if (!Array.isArray(window.appStore.students))
        window.appStore.students = [];
      if (!Array.isArray(window.appStore.teachers))
        window.appStore.teachers = [];
      if (!Array.isArray(window.appStore.circles)) window.appStore.circles = [];
      if (!Array.isArray(window.appStore.attendance))
        window.appStore.attendance = [];
      if (!Array.isArray(window.appStore.teacherAttendance))
        window.appStore.teacherAttendance = [];
      if (!Array.isArray(window.appStore.tasmeea)) window.appStore.tasmeea = [];
      if (!Array.isArray(window.appStore.tests)) window.appStore.tests = [];
      if (!Array.isArray(window.appStore.notifications))
        window.appStore.notifications = [];
      if (!Array.isArray(window.appStore.logs)) window.appStore.logs = [];
      if (!Array.isArray(window.appStore.screenOrder))
        window.appStore.screenOrder = [];

      // ضمان وجود حساب المدير (صالح ال ناشع) وحساب الشاشة فقط
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

      saveLocalStore();
    } catch (e) {
      console.error("خطأ في قراءة LocalStorage:", e);
      seedProductionAdminOnly();
    }
  } else {
    seedProductionAdminOnly();
  }

  // مزامنة البيانات السحابية من Firestore
  if (isFirebaseOnline && dbFirestore) {
    syncDataFromCloud();
  }
}

// حفظ الحالة في التخزين المحلي
function saveLocalStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.appStore));
  } catch (e) {
    console.error("فشل حفظ البيانات في LocalStorage:", e);
  }
}

// إنشاء الحسابات النظيفة الافتراضية دون أي طلاب أو معلمين مسبقين
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

// مزامنة البيانات السحابية من Firestore
async function syncDataFromCloud() {
  if (!dbFirestore) return;
  try {
    const collections = [
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
      "settings",
      "logs",
    ];
    for (const col of collections) {
      const snapshot = await dbFirestore.collection(col).get();
      if (!snapshot.empty) {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (col === "settings") {
          window.appStore.settings = items[0] || SAFE_DEFAULT_SETTINGS;
        } else if (col === "screenOrder") {
          window.appStore.screenOrder = items[0]?.order || [];
        } else {
          window.appStore[col] = items;
        }
      }
    }
    saveLocalStore();
    if (typeof refreshActiveView === "function") {
      refreshActiveView();
    }
  } catch (err) {
    console.warn(
      "لم تتم المزامنة مع Firestore، تم الاعتماد على النسخة المحلية:",
      err,
    );
  }
}

// حفظ أو حذف مستند في السحابة بأمان
async function saveToCloud(collectionName, docId, data, isDelete = false) {
  saveLocalStore();
  if (isFirebaseOnline && dbFirestore) {
    try {
      if (isDelete) {
        await dbFirestore.collection(collectionName).doc(docId).delete();
      } else {
        await dbFirestore
          .collection(collectionName)
          .doc(docId)
          .set(data, { merge: true });
      }
    } catch (e) {
      console.error(`خطأ أثناء الحفظ في Firestore [${collectionName}]:`, e);
    }
  }
}

// تسجيل عملية جديدة في سجل العمليات Logs
function addSystemLog(actionDesc) {
  const currentUser = window.currentUser || { name: "النظام" };
  const now = new Date();
  const timeString = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`;

  const newLog = {
    id: "log_" + Date.now(),
    userName: currentUser.name,
    action: actionDesc,
    timestamp: timeString,
    createdAt: Date.now(),
  };

  if (!Array.isArray(window.appStore.logs)) window.appStore.logs = [];
  window.appStore.logs.unshift(newLog);
  if (window.appStore.logs.length > 200) {
    window.appStore.logs.pop();
  }

  saveToCloud("logs", newLog.id, newLog);
}

// تشغيل الفايربيز عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
  initFirebaseApp();
});
