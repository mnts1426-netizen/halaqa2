/**
 * ==========================================================================
 * firebase.js - محرك الاتصال بـ Firebase وقاعدة البيانات النظيفة للمجمع
 * ==========================================================================
 */

let dbFirestore = null;
let firebaseAuth = null;
let isFirebaseOnline = false;

// كائن تخزين البيانات العام
window.appStore = {
  users: [],
  students: [],
  teachers: [],
  circles: [],
  attendance: [],
  tasmeea: [],
  tests: [],
  notifications: [],
  messages: [],
  screenOrder: [],
  settings: { ...DEFAULT_SETTINGS },
  logs: [],
};

// تهيئة Firebase والاتصال بـ Firestore
function initFirebaseApp() {
  try {
    if (typeof firebase !== "undefined") {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
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

// تحميل البيانات الأولية
function loadInitialData() {
  const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (localData) {
    try {
      window.appStore = JSON.parse(localData);
      if (!window.appStore.screenOrder) window.appStore.screenOrder = [];

      // التأكد من وجود الحسابات الرسمية
      const hasAdmin = (window.appStore.users || []).some(
        (u) => u.username === "123456" && u.role === ROLES.ADMIN,
      );
      const hasTeacher = (window.appStore.users || []).some(
        (u) => u.username === "123123" && u.role === ROLES.TEACHER,
      );
      const hasStudent = (window.appStore.students || []).some(
        (s) => s.phone === "0537466925",
      );

      if (!hasAdmin || !hasTeacher || !hasStudent) {
        seedProductionAdminOnly();
      }
    } catch (e) {
      console.error("خطأ في قراءة LocalStorage:", e);
      seedProductionAdminOnly();
    }
  } else {
    seedProductionAdminOnly();
  }

  // مزامنة البيانات مع Firestore إذا كان متصلاً
  if (isFirebaseOnline && dbFirestore) {
    syncDataFromCloud();
  }
}

// حفظ الحالة في التخزين المحلي
function saveLocalStore() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(window.appStore));
  } catch (e) {
    console.error("فشل حفظ البيانات في LocalStorage:", e);
  }
}

// إنشاء الحسابات الرسمية وتجهيز قاعدة البيانات
function seedProductionAdminOnly() {
  const baseTime = Date.now();
  window.appStore = {
    users: [
      {
        id: "u_admin_main",
        name: "أحمد بن عبدالله بن مهدي",
        role: ROLES.ADMIN,
        username: "123456",
        pass: "1234",
        phone: "0500000000",
        status: "active",
        createdAt: baseTime,
      },
      {
        id: "u_screen_fixed",
        name: "شاشة المسجد (فرسان التميز)",
        role: ROLES.SCREEN,
        username: "121212",
        pass: "1234",
        phone: "0500000000",
        status: "active",
        createdAt: baseTime,
      },
      {
        id: "u_teacher_main",
        teacherId: "t_main",
        name: "معلم الحلقة",
        role: ROLES.TEACHER,
        username: "123123",
        pass: "1234",
        phone: "0501111111",
        status: "active",
        createdAt: baseTime,
      },
      {
        id: "s_main_user",
        name: "طالب المجمع",
        role: ROLES.STUDENT,
        username: "0537466925",
        pass: "1234",
        phone: "0537466925",
        circleId: "c_main",
        status: "active",
        createdAt: baseTime,
      },
    ],
    teachers: [
      {
        id: "t_main",
        userId: "u_teacher_main",
        name: "معلم الحلقة",
        phone: "0501111111",
        status: "active",
        lastLogin: "—",
        createdAt: baseTime,
      },
    ],
    circles: [
      {
        id: "c_main",
        name: "حلقة النور",
        mosque: "جامع الهدى",
        teacherId: "t_main",
        teacherIds: ["t_main"],
        status: "نشطة",
      },
    ],
    students: [
      {
        id: "s_main_user",
        name: "طالب المجمع",
        nationalId: "1000000001",
        phone: "0537466925",
        parentName: "ولي الأمر",
        parentRelation: "أب",
        parentPhone: "0500000000",
        circleId: "c_main",
        status: "active",
        createdAt: baseTime,
      },
    ],
    attendance: [],
    tasmeea: [],
    tests: [],
    notifications: [],
    messages: [],
    screenOrder: [],
    settings: { ...DEFAULT_SETTINGS },
    logs: [
      {
        id: "log_" + baseTime,
        userName: "أحمد بن عبدالله بن مهدي",
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
          window.appStore.settings = items[0] || DEFAULT_SETTINGS;
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

// حفظ أو حذف مستند في السحابة
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
