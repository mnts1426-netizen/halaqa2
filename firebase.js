/**
 * ==========================================================================
 * firebase.js - محرك الاتصال بـ Firebase، التصفير السحابي والمحلي للسجلات، وحماية البيانات الأساسية
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

// تحميل البيانات والتحقق من حساب المدير وتصفير السجلات التشغيلية مع الحفاظ على البيانات الأساسية
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
      if (!Array.isArray(window.appStore.logs)) window.appStore.logs = [];

      // 1. تصفير السجلات التشغيلية محلياً مع الحفاظ التام على الطلاب والمعلمين والحلقات والإعدادات
      const resetFlagKey = "HALAQAT_PURGE_RESET_EXEC_V3";
      if (!localStorage.getItem(resetFlagKey)) {
        window.appStore.attendance = [];
        window.appStore.teacherAttendance = [];
        window.appStore.tasmeea = [];
        window.appStore.tests = [];
        window.appStore.notifications = [];
        window.appStore.messages = [];
        window.appStore.screenOrder = [];
        localStorage.setItem(resetFlagKey, "true");
        console.log(
          "🧹 تم تصفير سجلات التحضير والتسميع والاختبارات والإشعارات والتميز محلياً مع حماية الطلاب والمعلمين والحلقات.",
        );
      } else {
        if (!Array.isArray(window.appStore.attendance))
          window.appStore.attendance = [];
        if (!Array.isArray(window.appStore.teacherAttendance))
          window.appStore.teacherAttendance = [];
        if (!Array.isArray(window.appStore.tasmeea))
          window.appStore.tasmeea = [];
        if (!Array.isArray(window.appStore.tests)) window.appStore.tests = [];
        if (!Array.isArray(window.appStore.notifications))
          window.appStore.notifications = [];
        if (!Array.isArray(window.appStore.messages))
          window.appStore.messages = [];
        if (!Array.isArray(window.appStore.screenOrder))
          window.appStore.screenOrder = [];
      }

      // 2. ضمان وجود حساب المدير وحساب الشاشة
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

      // 3. توحيد الأرقام السرية: 1111 للطلاب و 1234 للمعلمين
      migrateAllPasswordsRoleBased();
      saveLocalStore();
    } catch (e) {
      console.error("خطأ في قراءة LocalStorage:", e);
      seedProductionAdminOnly();
    }
  } else {
    seedProductionAdminOnly();
  }

  // مزامنة وتنظيف البيانات السحابية من Firestore
  if (isFirebaseOnline && dbFirestore) {
    syncAndPurgeDataFromCloud();
  }
}

// دالة توحيد الرقم السري (1111 للطلاب و 1234 للمعلمين) لجميع الحسابات
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
    console.log(
      "🔐 تم توحيد الرقم السري للطلاب إلى (1111) والمعلمين إلى (1234) بنجاح.",
    );
    saveLocalStore();
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

// إنشاء الحسابات النظيفة الافتراضية
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

// تصفير المجموعات السحابية ومزامنة البيانات الأساسية فقط
async function syncAndPurgeDataFromCloud() {
  if (!dbFirestore) return;

  const cloudPurgeFlag = "HALAQAT_CLOUD_PURGE_EXEC_V3";
  const collectionsToPurge = [
    "attendance",
    "teacherAttendance",
    "tasmeea",
    "tests",
    "notifications",
    "messages",
    "screenOrder",
  ];

  // تنفيذ تصفير السحابة مرة واحدة للسجلات الماضية
  if (!localStorage.getItem(cloudPurgeFlag)) {
    for (const colName of collectionsToPurge) {
      try {
        const snapshot = await dbFirestore.collection(colName).get();
        if (!snapshot.empty) {
          const batch = dbFirestore.batch();
          snapshot.docs.forEach((d) => {
            batch.delete(d.ref);
          });
          await batch.commit();
          console.log(
            `🧹 تم مسح مستندات (${colName}) القديمة من Firestore سحابياً.`,
          );
        }
      } catch (err) {
        console.warn(`تنبيه أثناء مسح ${colName}:`, err);
      }
    }
    localStorage.setItem(cloudPurgeFlag, "true");
  }

  // مزامنة المجموعات الأساسية المحمية فقط (الطلاب، المعلمين، الحلقات، الحسابات، الإعدادات)
  try {
    const protectedCollections = [
      "users",
      "students",
      "teachers",
      "circles",
      "settings",
      "logs",
    ];
    for (const col of protectedCollections) {
      const snapshot = await dbFirestore.collection(col).get();
      if (!snapshot.empty) {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (col === "settings") {
          window.appStore.settings = items[0] || SAFE_DEFAULT_SETTINGS;
        } else {
          window.appStore[col] = items;
        }
      }
    }

    // مزامنة المجموعات التشغيلية الجديدة
    for (const col of collectionsToPurge) {
      const snapshot = await dbFirestore.collection(col).get();
      if (!snapshot.empty) {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (col === "screenOrder") {
          window.appStore.screenOrder = items[0]?.order || [];
        } else {
          window.appStore[col] = items;
        }
      }
    }

    migrateAllPasswordsRoleBased();
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

// دالة تنفيذ التصفير اليدوي الآمن عند طلب الإدارة
window.executeSafeOperationalReset = async function () {
  const confirmAction = confirm(
    "هل أنت متأكد من تصفير سجلات التحضير والتسميع والاختبارات والإشعارات السابقة؟\n(الطلاب والمعلمون والحلقات لن تتأثر نهائياً).",
  );
  if (!confirmAction) return;

  const collectionsToPurge = [
    "attendance",
    "teacherAttendance",
    "tasmeea",
    "tests",
    "notifications",
    "messages",
    "screenOrder",
  ];

  collectionsToPurge.forEach((key) => {
    window.appStore[key] = [];
  });

  saveLocalStore();

  if (isFirebaseOnline && dbFirestore) {
    for (const colName of collectionsToPurge) {
      try {
        const snapshot = await dbFirestore.collection(colName).get();
        if (!snapshot.empty) {
          const batch = dbFirestore.batch();
          snapshot.docs.forEach((d) => {
            batch.delete(d.ref);
          });
          await batch.commit();
        }
      } catch (e) {
        console.error(`خطأ أثناء تصفير ${colName}:`, e);
      }
    }
  }

  alert(
    "✅ تم تصفير كافة السجلات التشغيلية السابقة بنجاح وبدء دورة جديدة نظيفة!",
  );
  if (typeof refreshAllViews === "function") refreshAllViews();
};

// حفظ أو حذف مستند في السحابة بأمان وضمان عدم فقدان تعديلات المدير
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
