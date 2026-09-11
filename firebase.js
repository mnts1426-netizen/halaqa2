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
    "financeRevenues",
    "financeExpenses",
    "payroll",
  ];

  try {
    // جلب "شواهد الحذف" أولاً لبناء قائمة استبعاد: بدونها، أي سجل حُذف فعلياً من جهاز
    // ما كان "يعود من الموت" بمجرد مزامنة جهاز آخر (أو نفس الجهاز بتبويب قديم) لا يزال
    // يحمل نسخة محلية قديمة منه - لأن دمج البيانات أدناه لا يحذف أي سجل محلي أبداً
    // بتصميمه (لحماية البيانات غير المرفوعة بعد)، وهذا بالضبط سبب "عودة المحذوفات"
    const deletedSets = {};
    try {
      const tombSnapshot = await dbFirestore
        .collection("deletedTombstones")
        .get();
      tombSnapshot.docs.forEach((doc) => {
        const d = doc.data();
        if (d && d.collection && d.docId) {
          if (!deletedSets[d.collection]) deletedSets[d.collection] = new Set();
          deletedSets[d.collection].add(String(d.docId));
        }
      });
    } catch (e) {
      console.warn("تعذّر جلب سجل شواهد الحذف (deletedTombstones):", e);
    }

    for (const col of allCollections) {
      const deletedIds = deletedSets[col];
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
          // ترقية من حقل "الكأس المفرد" القديم إلى قائمة (كأس واحد لكل حلقة) دون فقدان
          // أي اختيار سابق كان قد حدّده المدير قبل هذا التحديث
          const cloudTrophyIds = cloudItems[0]?.trophyStudentIds;
          window.appStore.trophyStudentIds = Array.isArray(cloudTrophyIds)
            ? cloudTrophyIds
            : cloudItems[0]?.trophyStudentId
              ? [cloudItems[0].trophyStudentId]
              : [];
          window.appStore.trophyStudentId = null;
        } else {
          // دمج البيانات السحابية مع المحلية بالمعرف (ID) لمنع ضياع أي سجل غير مرفوع -
          // باستثناء أي معرّف له "شاهد حذف" فيُستبعد نهائياً من الطرفين
          const localItems = Array.isArray(window.appStore[col])
            ? window.appStore[col]
            : [];
          const mergedMap = new Map();

          localItems.forEach((it) => {
            if (
              it &&
              it.id &&
              !(deletedIds && deletedIds.has(String(it.id)))
            ) {
              mergedMap.set(String(it.id), it);
            }
          });
          cloudItems.forEach((it) => {
            if (
              it &&
              it.id &&
              !(deletedIds && deletedIds.has(String(it.id)))
            ) {
              const existing = mergedMap.get(String(it.id));
              // تفضيل السحابة افتراضياً كما كان، إلا إذا كانت النسخة المحلية موجودة
              // وتحمل ختم وقت أحدث فعلياً من النسخة السحابية - فتُبقى المحلية كما هي
              // بدل أن "تُرجعها" مزامنة قرأت نسخة سحابية لم تتحدّث بعد بتعديل المدير
              // الأخير (وهو السبب الفعلي وراء ظهور التعديلات وكأنها "لا تُحفظ")
              if (
                existing &&
                typeof existing.updatedAt === "number" &&
                typeof it.updatedAt === "number" &&
                existing.updatedAt > it.updatedAt
              ) {
                return;
              }
              mergedMap.set(String(it.id), { ...(existing || {}), ...it });
            }
          });

          window.appStore[col] = Array.from(mergedMap.values());
        }
      } else if (deletedIds && Array.isArray(window.appStore[col])) {
        // المجموعة السحابية فارغة بالكامل لكن توجد شواهد حذف: نظّف المحلي منها احتياطاً
        window.appStore[col] = window.appStore[col].filter(
          (it) => !(it && it.id && deletedIds.has(String(it.id))),
        );
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
            });
        }
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
      // إظهار الخطأ فعلياً للمستخدم بدل فشل صامت لا يلاحظه أحد إلا لاحقاً عندما
      // "يعود" التعديل لحالته القديمة بصمت تام - هذا كان سبب غموض مشكلة عدم الحفظ
      alert(
        `⚠️ تعذّر حفظ هذا التعديل على الخادم السحابي، وقد يعود لحالته السابقة لاحقاً!\n\nالسبب التقني: ${e?.message || e}\n\nيرجى التأكد من اتصال الإنترنت وإعادة المحاولة. إن تكرر ظهور هذه الرسالة أبلغ مطوّر النظام بنصها بالضبط.`,
      );
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
