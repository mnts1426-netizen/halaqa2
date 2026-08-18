/**
 * ==========================================================================
 * firebase.js - محرك الاتصال بـ Firebase ومزامنة قواعد البيانات والسجلات
 * ==========================================================================
 */

let dbFirestore = null;
let firebaseAuth = null;
let isFirebaseOnline = false;

// كائن تخزين البيانات المحلي (الديناميكي في الذاكرة وفي LocalStorage)
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

// تحميل البيانات الأولية (من LocalStorage أو إنشائها تجريبياً)
function loadInitialData() {
  const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (localData) {
    try {
      window.appStore = JSON.parse(localData);
    } catch (e) {
      console.error("خطأ في قراءة LocalStorage:", e);
      seedDefaultDemoData();
    }
  } else {
    seedDefaultDemoData();
  }

  // إذا كان الفايربيز متصلاً، جلب البيانات الحية من السحابة
  if (isFirebaseOnline && dbFirestore) {
    syncDataFromCloud();
  }
}

// حفظ الحالة الحالية في التخزين المحلي
function saveLocalStore() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(window.appStore));
  } catch (e) {
    console.error("فشل حفظ البيانات في LocalStorage:", e);
  }
}

// تعبئة البيانات الافتراضية التجريبية (المطابقة للصور المطلوبة)
function seedDefaultDemoData() {
  window.appStore = {
    users: [
      {
        id: "u_admin",
        name: "الأستاذ عبدالله المدير",
        role: ROLES.ADMIN,
        username: "admin",
        pass: "123456",
        phone: "0500000000",
      },
      {
        id: "u_t1",
        name: "الشيخ أحمد بن يوسف",
        role: ROLES.TEACHER,
        username: "teacher1",
        pass: "123456",
        phone: "0501234567",
        qualification: "بكالوريوس شريعة",
        hireDate: "2020-09-01",
        status: "active",
      },
      {
        id: "u_t2",
        name: "الشيخ محمد بن سالم",
        role: ROLES.TEACHER,
        username: "teacher2",
        pass: "123456",
        phone: "0507654321",
        qualification: "ماجستير قراءات",
        hireDate: "2019-01-15",
        status: "active",
      },
      {
        id: "u_t3",
        name: "الشيخ عمر بن ناصر",
        role: ROLES.TEACHER,
        username: "teacher3",
        pass: "123456",
        phone: "0509998887",
        qualification: "بكالوريوس قرآن",
        hireDate: "2022-03-20",
        status: "active",
      },
    ],
    teachers: [
      {
        id: "t1",
        userId: "u_t1",
        name: "الشيخ أحمد بن يوسف",
        phone: "0501234567",
        qualification: "بكالوريوس شريعة",
        hireDate: "2020-09-01",
        circlesCount: 2,
        studentsCount: 4,
        lastLogin: "2026-08-05 12:36 ص",
        status: "active",
      },
      {
        id: "t2",
        userId: "u_t2",
        name: "الشيخ محمد بن سالم",
        phone: "0507654321",
        qualification: "ماجستير قراءات",
        hireDate: "2019-01-15",
        circlesCount: 1,
        studentsCount: 2,
        lastLogin: "2026-08-05 12:36 ص",
        status: "active",
      },
      {
        id: "t3",
        userId: "u_t3",
        name: "الشيخ عمر بن ناصر",
        phone: "0509998887",
        qualification: "بكالوريوس قرآن",
        hireDate: "2022-03-20",
        circlesCount: 0,
        studentsCount: 0,
        lastLogin: "—",
        status: "active",
      },
    ],
    circles: [
      {
        id: "c1",
        name: "حلقة الفجر",
        mosque: "جامع الملك فهد",
        teacherId: "t1",
        capacity: 15,
        studentsCount: 3,
        status: "نشطة",
      },
      {
        id: "c2",
        name: "حلقة العصر",
        mosque: "جامع النور",
        teacherId: "t2",
        capacity: 20,
        studentsCount: 2,
        status: "نشطة",
      },
      {
        id: "c3",
        name: "حلقة المغرب",
        mosque: "جامع الرحمة",
        teacherId: "t1",
        capacity: 12,
        studentsCount: 1,
        status: "نشطة",
      },
    ],
    students: [
      {
        id: "s1",
        name: "عبدالرحمن محمد العتيبي",
        nationalId: "1098765432",
        phone: "0551112233",
        level: "المتوسطة",
        circleId: "c1",
        status: "active",
      },
      {
        id: "s2",
        name: "سعد بن خالد الدوسري",
        nationalId: "1087654321",
        phone: "0552223344",
        level: "الابتدائية",
        circleId: "c1",
        status: "active",
      },
      {
        id: "s3",
        name: "عمر فهد القحطاني",
        nationalId: "1076543210",
        phone: "0553334455",
        level: "الثانوية",
        circleId: "c1",
        status: "active",
      },
      {
        id: "s4",
        name: "إبراهيم يوسف الغامدي",
        nationalId: "1065432109",
        phone: "0554445566",
        level: "المتوسطة",
        circleId: "c2",
        status: "active",
      },
      {
        id: "s5",
        name: "ياسر بن صالح الزهراني",
        nationalId: "1054321098",
        phone: "0555556677",
        level: "الابتدائية",
        circleId: "c2",
        status: "active",
      },
      {
        id: "s6",
        name: "علي بن حسن الشمري",
        nationalId: "1043210987",
        phone: "0556667788",
        level: "الجامعية",
        circleId: "c3",
        status: "active",
      },
    ],
    attendance: [],
    tasmeea: [],
    tests: [],
    notifications: [],
    messages: [],
    settings: { ...DEFAULT_SETTINGS },
    logs: [
      {
        id: "log_1",
        userName: "الأستاذ عبدالله المدير",
        action: "دخول . النظام",
        timestamp: "2026/8/5 6:44 م",
      },
      {
        id: "log_2",
        userName: "خالد بن سعد",
        action: "خروج . النظام",
        timestamp: "2026/8/5 6:43 م",
      },
      {
        id: "log_3",
        userName: "خالد بن سعد",
        action: "دخول . النظام",
        timestamp: "2026/8/5 6:41 م",
      },
      {
        id: "log_4",
        userName: "الأستاذ عبدالله المدير",
        action: "خروج . النظام",
        timestamp: "2026/8/5 6:39 م",
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
      "students",
      "teachers",
      "circles",
      "attendance",
      "tasmeea",
      "tests",
      "notifications",
      "messages",
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

// حفظ مستند في السحابة
async function saveToCloud(collectionName, docId, data) {
  saveLocalStore();
  if (isFirebaseOnline && dbFirestore) {
    try {
      await dbFirestore
        .collection(collectionName)
        .doc(docId)
        .set(data, { merge: true });
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
