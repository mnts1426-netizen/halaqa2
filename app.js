/**
 * ==========================================================================
 * app.js - المحرك الرئيسي للنظام، الصلاحيات، صلاحية التقارير المالية، والتحضير الذاتي
 * ==========================================================================
 */

window.currentUser = null;

// المخزن العام - يبدأ نظيفاً تماماً بدون أي طلاب أو معلمين افتراضيين
window.appStore = window.appStore || {
  users: [],
  students: [],
  teachers: [],
  circles: [],
  attendance: [],
  teacherAttendance: [],
  tests: [],
  profileRequests: [],
  tasmeea: [],
  screenOrder: [],
  circlesOrder: [],
  notifications: [],
  trophyStudentId: null,
  settings: null,
};

// الإعدادات الافتراضية المعتمدة للهوية واسم المدير
window.DEFAULT_SETTINGS = {
  orgName: "مَجْمَع عبدالله بن مهدي القرآني",
  subTitle: "جامع الهدى",
  directorName: "صالح ال ناشع",
  logoNew: "logo12.jpeg",
  logoOld: "logo_transparent_1.png",
  logoLogin: "logo_transparent_2.png",
  headerFontSize: "13px",
  location: "",
};

// تعريف الأدوار والصلاحيات
window.ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
  SCREEN: "screen",
};

window.ROLE_PERMISSIONS = {
  admin: [
    "view-dashboard",
    "view-circles",
    "view-attendance",
    "view-tasmeea",
    "view-teacher-notes",
    "view-screen",
    "view-accounts",
    "view-tests",
    "view-reports",
    "view-finance",
    "view-notifications",
    "view-settings",
  ],
  teacher: ["view-dashboard", "view-tasmeea", "view-notifications"],
  student: ["view-student-home", "view-student-lessons", "view-notifications"],
  screen: ["view-screen"],
};

document.addEventListener("DOMContentLoaded", () => {
  try {
    applyAppIdentity();
    syncHeaderDateTime();
  } catch (e) {
    console.warn("Init notice:", e);
  }

  // ربط نماذج تسجيل الدخول
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.onsubmit = function (e) {
      if (e) e.preventDefault();
      return handleLoginFormSubmit(e);
    };
  }

  const studentLoginForm = document.getElementById("student-login-form");
  if (studentLoginForm) {
    studentLoginForm.onsubmit = function (e) {
      if (e) e.preventDefault();
      return handleStudentLoginFormSubmit(e);
    };
  }

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) btnLogout.onclick = handleLogout;

  const sidebarToggle = document.getElementById("sidebar-toggle");
  if (sidebarToggle) {
    sidebarToggle.onclick = () => {
      document.querySelector(".sidebar")?.classList.toggle("mobile-open");
    };
  }

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.onclick = function (e) {
      e.preventDefault();
      const targetView = this.getAttribute("data-target");
      if (targetView) navigateTo(targetView);
    };
  });

  try {
    updateCircleDropdowns();
  } catch (e) {
    console.warn(e);
  }

  detectPortalFromUrl();
  checkSavedSession();
});

// دالة تسجيل الدخول الموحدة
window.handleLoginFormSubmit = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const userVal = (
    document.getElementById("login-username")?.value || ""
  ).trim();
  const passVal = (
    document.getElementById("login-password")?.value || ""
  ).trim();

  if (!userVal) {
    alert("يرجى إدخال اسم المستخدم أو رقم الهوية.");
    return false;
  }

  const userLower = userVal.toLowerCase();

  // 1. حساب المدير الرئيسي
  if (
    userLower === "admin" ||
    userVal === "123456" ||
    userVal === "مدير" ||
    userVal === "المدير" ||
    userVal === "صالح ال ناشع"
  ) {
    const adminUser = (window.appStore?.users || []).find(
      (u) =>
        u.username === "123456" ||
        u.username === "admin" ||
        u.role === window.ROLES.ADMIN,
    ) || {
      id: "u_admin_main",
      name: "صالح ال ناشع",
      role: window.ROLES.ADMIN,
      username: userVal,
      phone: "0500000000",
      createdAt: Date.now(),
    };
    doLogin(adminUser, false);
    return false;
  }

  // 2. حساب شاشة التميز الأسبوعي
  if (userVal === "121212") {
    const screenUser = {
      id: "u_screen_fixed",
      name: "التميز الأسبوعي",
      role: window.ROLES.SCREEN,
      username: "121212",
      createdAt: Date.now(),
    };
    doLogin(screenUser, false);
    return false;
  }

  // 3. حسابات المعلمين
  const teachers = window.appStore?.teachers || [];
  const foundTeacher = teachers.find(
    (t) =>
      t.phone === userVal ||
      t.name === userVal ||
      t.id === userVal ||
      (t.name && t.name.toLowerCase() === userLower),
  );

  if (foundTeacher) {
    if (foundTeacher.status === "suspended") {
      alert("⚠️ هذا الحساب موقوف حالياً.");
      return false;
    }
    const teacherSessionUser = {
      id: foundTeacher.id,
      teacherId: foundTeacher.id,
      userId: foundTeacher.userId || foundTeacher.id,
      name: foundTeacher.name,
      phone: foundTeacher.phone,
      role: window.ROLES.TEACHER,
      createdAt: foundTeacher.createdAt || Date.now(),
    };
    doLogin(teacherSessionUser, false);
    return false;
  }

  // 4. حسابات الطلاب
  const students = window.appStore?.students || [];
  const foundStudent = students.find(
    (s) =>
      s.phone === userVal ||
      s.nationalId === userVal ||
      s.name === userVal ||
      s.id === userVal,
  );

  if (foundStudent) {
    if (foundStudent.status === "archived") {
      alert("⚠️ هذا الحساب موقوف (مؤرشف).");
      return false;
    }
    const studentSessionUser = {
      id: foundStudent.id,
      name: foundStudent.name,
      phone: foundStudent.phone,
      role: window.ROLES.STUDENT,
      circleId: foundStudent.circleId,
      createdAt: foundStudent.createdAt || Date.now(),
    };
    doLogin(studentSessionUser, false);
    return false;
  }

  // 5. حسابات المستخدمين العامة
  const users = window.appStore?.users || [];
  const foundUser = users.find(
    (u) => u.username === userVal || u.phone === userVal || u.id === userVal,
  );

  if (foundUser) {
    doLogin(foundUser, false);
    return false;
  }

  alert(
    "⚠️ اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير مسجل بالنظام.",
  );
  return false;
};

window.handleStudentLoginFormSubmit = function (e) {
  if (e && e.preventDefault) e.preventDefault();
  const identifier = (
    document.getElementById("stu-login-identifier")?.value || ""
  ).trim();
  if (!identifier) {
    alert("يرجى إدخال رقم الهوية أو الجوال.");
    return false;
  }

  const students = window.appStore?.students || [];
  const foundStudent = students.find(
    (s) =>
      s.phone === identifier ||
      s.nationalId === identifier ||
      s.name === identifier,
  );

  if (foundStudent) {
    const studentSessionUser = {
      id: foundStudent.id,
      name: foundStudent.name,
      phone: foundStudent.phone,
      role: window.ROLES.STUDENT,
      circleId: foundStudent.circleId,
      createdAt: foundStudent.createdAt || Date.now(),
    };
    doLogin(studentSessionUser, false);
    return false;
  }

  alert(
    "⚠️ رقم الهوية أو الجوال غير مسجل بالنظام. يرجى مراجعة إدارة المَجْمَع.",
  );
  return false;
};

window.doLogin = function (user, isAutoSession = false) {
  if (!user) return;

  window.currentUser = user;
  try {
    localStorage.setItem("HALAQAT_SESSION_USER", JSON.stringify(user));
  } catch (e) {
    console.warn(e);
  }

  const loginView = document.getElementById("view-login");
  const stuLoginView = document.getElementById("view-student-login");
  const appContainer = document.getElementById("app-container");

  if (loginView) {
    loginView.classList.remove("active");
    loginView.style.display = "none";
  }
  if (stuLoginView) {
    stuLoginView.classList.remove("active");
    stuLoginView.style.display = "none";
  }
  if (appContainer) {
    appContainer.classList.remove("style-hidden");
    appContainer.style.display = "flex";
  }

  const nameEl = document.getElementById("current-user-name");
  const roleEl = document.getElementById("current-user-role");
  const avatarEl = document.getElementById("current-user-avatar");
  const welcomeEl = document.getElementById("welcome-message");

  if (nameEl) nameEl.textContent = user.name || "مستخدم";
  if (roleEl) {
    roleEl.textContent =
      user.role === window.ROLES.ADMIN
        ? "المدير"
        : user.role === window.ROLES.TEACHER
          ? "معلم"
          : user.role === window.ROLES.SCREEN
            ? "التميز الأسبوعي"
            : "طالب";
  }
  if (avatarEl) avatarEl.textContent = user.name ? user.name.charAt(0) : "ص";
  if (welcomeEl) welcomeEl.textContent = `مرحباً ${user.name || ""}`;

  try {
    syncHeaderDateTime();
    applyAppIdentity();
  } catch (e) {
    console.warn(e);
  }

  adjustSidebarAndViewsForRole(user.role);
};

function adjustSidebarAndViewsForRole(role) {
  const adminNav = document.querySelector(".role-section-admin");
  const studentNav = document.querySelector(".role-section-student");
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");
  const topHeader = document.querySelector(".top-header");

  if (role === window.ROLES.SCREEN) {
    if (adminNav) adminNav.style.display = "none";
    if (studentNav) studentNav.style.display = "none";
    if (sidebar) sidebar.style.display = "flex";
    if (mainContent) mainContent.style.marginRight = "";
    if (topHeader) topHeader.style.display = "flex";

    navigateTo("view-screen");
    try {
      if (typeof renderScreenView === "function") renderScreenView();
    } catch (e) {
      console.warn(e);
    }
  } else if (role === window.ROLES.STUDENT) {
    if (sidebar) sidebar.style.display = "none";
    if (mainContent) mainContent.style.marginRight = "0";
    if (topHeader) topHeader.style.display = "none";

    navigateTo("view-student-home");
    try {
      renderStudentData();
    } catch (e) {
      console.warn(e);
    }
  } else {
    if (sidebar) sidebar.style.display = "flex";
    if (mainContent) mainContent.style.marginRight = "";
    if (topHeader) topHeader.style.display = "flex";

    if (studentNav) studentNav.style.display = "none";
    if (adminNav) adminNav.style.display = "block";

    const user = window.currentUser;
    const isFinancialTeacher =
      user &&
      user.role === window.ROLES.TEACHER &&
      window.appStore?.settings?.financialTeacherId ===
        (user.teacherId || user.id);

    if (role === window.ROLES.TEACHER) {
      document.querySelectorAll(".sidebar .nav-admin-only").forEach((el) => {
        el.style.display = "none";
      });
      document.querySelectorAll(".sidebar .nav-teacher-only").forEach((el) => {
        el.style.display = "flex";
      });

      const financeNav = document.getElementById("nav-finance-link");
      if (financeNav) {
        financeNav.style.display = isFinancialTeacher ? "flex" : "none";
      }
    } else {
      document.querySelectorAll(".sidebar .nav-admin-only").forEach((el) => {
        el.style.display = "flex";
      });
      document.querySelectorAll(".sidebar .nav-teacher-only").forEach((el) => {
        el.style.display = "none";
      });
      const financeNav = document.getElementById("nav-finance-link");
      if (financeNav) financeNav.style.display = "flex";
    }

    navigateTo("view-dashboard");
    try {
      refreshAllViews();
    } catch (e) {
      console.warn(e);
    }
  }
}

window.navigateTo = function (targetViewId) {
  if (!window.currentUser) {
    showMainLoginView();
    return;
  }

  // التحقق من صلاحية شاشة التقارير المالية
  if (targetViewId === "view-finance") {
    const user = window.currentUser;
    const isAllowed =
      user.role === window.ROLES.ADMIN ||
      (user.role === window.ROLES.TEACHER &&
        window.appStore?.settings?.financialTeacherId ===
          (user.teacherId || user.id));

    if (!isAllowed) {
      alert("⚠️ غير مصرح لك بالدخول إلى قسم التقارير المالية.");
      return;
    }
  }

  document.querySelectorAll(".content-view").forEach((view) => {
    view.classList.remove("active");
    view.style.display = "none";
  });
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });

  const targetEl = document.getElementById(targetViewId);
  if (targetEl) {
    targetEl.classList.add("active");
    targetEl.style.display = "block";
  }

  const activeLink = document.querySelector(
    `.nav-link[data-target="${targetViewId}"]`,
  );
  if (activeLink) activeLink.classList.add("active");

  document.querySelector(".sidebar")?.classList.remove("mobile-open");

  try {
    refreshActiveView(targetViewId);
  } catch (e) {
    console.warn(e);
  }
};

function detectPortalFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const portal = urlParams.get("portal");
  if (portal === "student" || window.location.hash === "#student") {
    showStudentLoginView();
  }
}

function showStudentLoginView() {
  const loginView = document.getElementById("view-login");
  const stuLoginView = document.getElementById("view-student-login");
  const appContainer = document.getElementById("app-container");

  if (loginView) {
    loginView.classList.remove("active");
    loginView.style.display = "none";
  }
  if (stuLoginView) {
    stuLoginView.classList.add("active");
    stuLoginView.style.display = "flex";
  }
  if (appContainer) {
    appContainer.style.display = "none";
  }
}

function showMainLoginView() {
  const loginView = document.getElementById("view-login");
  const stuLoginView = document.getElementById("view-student-login");
  const appContainer = document.getElementById("app-container");

  if (stuLoginView) {
    stuLoginView.classList.remove("active");
    stuLoginView.style.display = "none";
  }
  if (loginView) {
    loginView.classList.add("active");
    loginView.style.display = "flex";
  }
  if (appContainer) {
    appContainer.style.display = "none";
  }
}

function applyAppIdentity() {
  const settings = window.appStore?.settings || window.DEFAULT_SETTINGS;
  const orgName = settings.orgName || "مَجْمَع عبدالله بن مهدي القرآني";
  const mosqueName = settings.subTitle || "جامع الهدى";
  const logoNew = settings.logoNew || "logo12.jpeg";
  const logoOld = settings.logoOld || "logo_transparent_1.png";
  const logoLogin = settings.logoLogin || "logo_transparent_2.png";
  const directorName = settings.directorName || "صالح ال ناشع";

  const sidebarOrg = document.getElementById("sidebar-org-name");
  if (sidebarOrg) sidebarOrg.textContent = orgName;
  const sidebarMosque = document.getElementById("sidebar-mosque-name");
  if (sidebarMosque) sidebarMosque.textContent = mosqueName;
  const sidebarLogoImg = document.getElementById("sidebar-logo-img");
  if (sidebarLogoImg) sidebarLogoImg.src = logoNew;

  const loginHeroTitle = document.getElementById("login-hero-title");
  if (loginHeroTitle) loginHeroTitle.textContent = orgName;
  const loginHeroSub = document.getElementById("login-hero-sub");
  if (loginHeroSub) loginHeroSub.textContent = mosqueName;
  const loginHeroLogo = document.getElementById("login-hero-logo");
  if (loginHeroLogo) loginHeroLogo.src = logoLogin;

  const printOrgName = document.getElementById("print-org-name");
  if (printOrgName) printOrgName.textContent = orgName;
  const printMosqueName = document.getElementById("print-mosque-name");
  if (printMosqueName) printMosqueName.textContent = `بـ ${mosqueName}`;

  const printLogoNew = document.getElementById("print-logo-new");
  if (printLogoNew) printLogoNew.src = logoNew;
  const printLogoOld = document.getElementById("print-logo-old");
  if (printLogoOld) printLogoOld.src = logoOld;

  const printDirector = document.getElementById("print-director-name");
  if (printDirector) printDirector.textContent = directorName;
}

function syncHeaderDateTime() {
  const headerDateEl = document.getElementById("header-date");
  if (headerDateEl) {
    const now = new Date();
    headerDateEl.textContent = now.toLocaleDateString("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

function checkSavedSession() {
  const savedUserStr = localStorage.getItem("HALAQAT_SESSION_USER");
  if (savedUserStr) {
    try {
      const user = JSON.parse(savedUserStr);
      doLogin(user, true);
    } catch (e) {
      showMainLoginView();
    }
  } else {
    detectPortalFromUrl();
  }
}

function checkStudentCurrentWeekTamayuz(studentId) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - dayOfWeek);

  const weekDays = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    weekDays.push(`${y}-${m}-${day}`);
  }

  let attendedCount = 0;
  let hasDisqualifyingRating = false;

  const isDisqualifying = (r) => {
    if (!r) return false;
    const clean = r.trim();
    if (clean === "" || clean === "—" || clean === "لا يوجد") return false;
    return !clean.includes("ممتاز");
  };

  for (const day of weekDays) {
    const att = (window.appStore?.attendance || []).find(
      (a) => a.studentId === studentId && a.date === day,
    );
    if (att && (att.status === "present" || att.status === "late")) {
      attendedCount++;
    } else if (att && att.status === "absent") {
      return false;
    }

    const tasm = (window.appStore?.tasmeea || []).find(
      (t) => t.studentId === studentId && t.date === day,
    );
    if (tasm) {
      if (
        isDisqualifying(tasm.hifzRating) ||
        isDisqualifying(tasm.murajaaRating) ||
        isDisqualifying(tasm.tilawaRating) ||
        isDisqualifying(tasm.rating)
      ) {
        hasDisqualifyingRating = true;
      }
    }
  }

  return attendedCount === 4 && !hasDisqualifyingRating;
}

// دالة تسجيل الحضور الذاتي للمدير والمعلم
window.handleTeacherSelfCheckIn = function () {
  const user = window.currentUser;
  if (
    !user ||
    (user.role !== window.ROLES.TEACHER && user.role !== window.ROLES.ADMIN)
  ) {
    alert("⚠️ هذه الخاصية متاحة للمدير والمعلم فقط.");
    return;
  }

  const attId =
    user.role === window.ROLES.ADMIN ? "admin_main" : user.teacherId || user.id;
  const todayStr = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const recordId = `t_att_${attId}_${todayStr}`;

  if (!window.appStore.teacherAttendance)
    window.appStore.teacherAttendance = [];

  let record = window.appStore.teacherAttendance.find((a) => a.id === recordId);
  if (record && record.status === "present") {
    alert(
      `ℹ️ لقد تم تسجيل حضورك مسبقاً اليوم في تمام الساعة (${record.time || nowTime}).`,
    );
    return;
  }

  if (!record) {
    record = {
      id: recordId,
      teacherId: attId,
      teacherName: user.name,
      date: todayStr,
      time: nowTime,
      status: "present",
      notes:
        user.role === window.ROLES.ADMIN
          ? "تحضير ذاتي (المدير)"
          : "تحضير ذاتي (معلم)",
      updatedBy: "self",
      createdAt: Date.now(),
    };
    window.appStore.teacherAttendance.push(record);
  } else {
    record.status = "present";
    record.time = nowTime;
    record.notes =
      user.role === window.ROLES.ADMIN
        ? "تحضير ذاتي (المدير)"
        : "تحضير ذاتي (معلم)";
  }

  if (typeof saveToCloud === "function") {
    saveToCloud("teacherAttendance", record.id, record);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  alert(
    `✅ تم تسجيل حضورك بنجاح في تمام الساعة (${nowTime})! تقبل الله طاعتكم.`,
  );
  renderDashboardView();
};

function renderStudentData() {
  if (!window.currentUser || window.currentUser.role !== window.ROLES.STUDENT)
    return;

  const studentId = window.currentUser.id;
  const student =
    (window.appStore?.students || []).find((s) => s.id === studentId) ||
    window.currentUser;
  const circle = (window.appStore?.circles || []).find(
    (c) => c.id === student.circleId,
  );
  const circleName = circle ? circle.name : "جامع الهدى";

  const studentTasmeea = (window.appStore?.tasmeea || []).filter(
    (t) => t.studentId === studentId,
  );
  const studentAtt = (window.appStore?.attendance || []).filter(
    (a) => a.studentId === studentId,
  );

  const presentCount = studentAtt.filter(
    (a) => a.status === "present" || a.status === "late",
  ).length;
  const absentCount = studentAtt.filter((a) => a.status === "absent").length;
  const tamayuzCount = studentTasmeea.filter(
    (t) =>
      (t.rating || "").includes("ممتاز") ||
      (t.hifzRating || "").includes("ممتاز"),
  ).length;

  const countRating = (records, field, type) => {
    return records.filter((r) => {
      const val = (r[field] || "").trim();
      if (type === "ممتاز") return val.includes("ممتاز");
      if (type === "جيد جداً") return val.includes("جيد جداً");
      if (type === "جيد") return val === "جيد" || val === "جيد مرتفع";
      if (type === "يعيد")
        return val === "يعيد" || val === "إعادة" || val === "ضعيف";
      return false;
    }).length;
  };

  const hifzMumtaz = countRating(studentTasmeea, "hifzRating", "ممتاز");
  const hifzJayyidJiddan = countRating(
    studentTasmeea,
    "hifzRating",
    "جيد جداً",
  );
  const hifzJayyid = countRating(studentTasmeea, "hifzRating", "جيد");
  const hifzRe = countRating(studentTasmeea, "hifzRating", "يعيد");

  const murajaaMumtaz = countRating(studentTasmeea, "murajaaRating", "ممتاز");
  const murajaaJayyidJiddan = countRating(
    studentTasmeea,
    "murajaaRating",
    "جيد جداً",
  );
  const murajaaJayyid = countRating(studentTasmeea, "murajaaRating", "جيد");
  const murajaaRe = countRating(studentTasmeea, "murajaaRating", "يعيد");

  const tilawaMumtaz = countRating(studentTasmeea, "tilawaRating", "ممتاز");
  const tilawaJayyidJiddan = countRating(
    studentTasmeea,
    "tilawaRating",
    "جيد جداً",
  );
  const tilawaJayyid = countRating(studentTasmeea, "tilawaRating", "جيد");
  const tilawaRe = countRating(studentTasmeea, "tilawaRating", "يعيد");

  const isDistinguishedThisWeek = checkStudentCurrentWeekTamayuz(studentId);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayRecord = studentTasmeea.find((t) => t.date === todayStr) || {};
  const todayAttRecord = studentAtt.find((a) => a.date === todayStr);

  let attStatusBadge =
    '<span class="badge" style="background:#e0e0e0; color:#555;">لم يُسجَّل بعد</span>';
  if (todayAttRecord) {
    if (todayAttRecord.status === "present")
      attStatusBadge = '<span class="badge badge-active">🟢 حاضر</span>';
    else if (todayAttRecord.status === "absent")
      attStatusBadge = '<span class="badge badge-danger">🔴 غائب</span>';
    else if (todayAttRecord.status === "late")
      attStatusBadge = '<span class="badge badge-warning">🟡 متأخر</span>';
    else if (todayAttRecord.status === "excused")
      attStatusBadge =
        '<span class="badge" style="background:#e3f2fd; color:#1565c0;">🔵 مستأذن</span>';
  }

  const studentNotifs = (window.appStore?.notifications || []).filter((n) => {
    return (
      n.recipient === "all" ||
      n.recipient === "students" ||
      (n.recipient === "specific_student" &&
        (n.targetId === student.id || n.targetName === student.name))
    );
  });

  const container = document.getElementById("view-student-home");
  if (!container) return;

  const logoNew = "logo12.jpeg";
  const logoOld = "logo_transparent_1.png";

  container.innerHTML = `
    <div class="card mb-3" style="background: linear-gradient(135deg, var(--primary-brown) 0%, var(--primary-dark) 100%); color: #ffffff; border-radius: 12px; padding: 1.5rem; position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
      <button onclick="handleLogout()" class="btn btn-danger btn-sm" style="position: absolute; top: 12px; left: 12px; font-size: 0.8rem; padding: 5px 12px; border-radius: 6px; z-index: 10;">
        🚪 تسجيل الخروج
      </button>

      <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
        <img src="${logoNew}" alt="شعار المَجْمَع" style="height: 65px; width: auto; object-fit: contain; background: transparent; padding: 4px; border-radius: 8px;" />
        <div style="text-align: center; flex: 1;">
          <h2 style="font-size: 1.4rem; font-weight: 900; margin-bottom: 4px;">${student.name}</h2>
          <p style="font-size: 0.95rem; opacity: 0.9; margin-bottom: 8px;">مَجْمَع عبدالله بن مهدي القرآني — جامع الهدى</p>
          <span style="background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700;">
            🕌 حلقة: ${circleName}
          </span>
        </div>
        <img src="${logoOld}" alt="شعار المَجْمَع" style="height: 65px; width: auto; object-fit: contain; background: transparent; padding: 4px; border-radius: 8px; mix-blend-mode: screen;" />
      </div>
    </div>

    <!-- صندوق الإشعارات -->
    <div class="card mb-3" style="border-right: 4px solid #0b6b7d;">
      <div class="card-header flex-between">
        <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--primary-brown); margin: 0;">
          📬 إشعارات وتنبيهات الإدارة
        </h3>
        <span class="badge badge-active">${studentNotifs.length} رسائل</span>
      </div>
      <div class="card-body p-2" id="student-inbox-notifications">
        ${
          studentNotifs.length === 0
            ? '<p class="text-muted p-2" style="font-size:0.88rem;">لا توجد إشعارات أو رسائل جديدة حالياً</p>'
            : studentNotifs
                .map(
                  (n) => `
              <div class="mb-2 p-2" style="background:#f4f9f9; border: 1px solid var(--border-color); border-radius: 6px;">
                <div class="flex-between">
                  <strong style="color:var(--primary-brown); font-size:0.92rem;">${n.title || "تنبيه"}</strong>
                  <small class="text-muted">${n.date || ""}</small>
                </div>
                <p style="margin: 4px 0 0 0; font-size: 0.88rem; color: #333;">${n.body || ""}</p>
                <div style="font-size:0.75rem; color:#777; margin-top:3px;">المرسل: ${n.sender || "إدارة المَجْمَع"}</div>
              </div>
            `,
                )
                .join("")
        }
      </div>
    </div>

    ${
      isDistinguishedThisWeek
        ? `
      <div class="card mb-3" style="background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%); border: 2px solid #b78103; border-radius: 10px; padding: 1rem 1.25rem; text-align: center;">
        <h3 style="color: #b78103; font-weight: 900; font-size: 1.2rem; margin-bottom: 4px;">
          🎉 مبارك حصولك على التميز لهذا الأسبوع 🌟
        </h3>
        <p style="color: #6d4c41; font-size: 0.88rem; margin: 0; font-weight: 700;">
          نظير حرصك والتزامك الكامل بالحضور والتسميع المتقن، سائلين الله لك دوام التوفيق والرفعة.
        </p>
      </div>
    `
        : ""
    }

    <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--primary-brown); margin-bottom: 0.6rem;">📊 الإحصائيات الشاملة للإنجاز والحضور:</h3>
    <div class="student-stats-report-grid">
      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">أيام الحضور</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #2e7d32;">${presentCount}</h3>
      </div>
      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">أيام الغياب</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #c62828;">${absentCount}</h3>
      </div>
      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">مرات التميز</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: var(--primary-brown);">${tamayuzCount}</h3>
      </div>

      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">الدرس الجديد: ممتاز</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #2e7d32;">${hifzMumtaz}</h3>
      </div>
      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">الدرس الجديد: ج.جداً</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #0b6b7d;">${hifzJayyidJiddan}</h3>
      </div>
      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">الدرس الجديد: جيد/يعيد</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #b78103;">${hifzJayyid + hifzRe}</h3>
      </div>

      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">مراجعة: ممتاز</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #2e7d32;">${murajaaMumtaz}</h3>
      </div>
      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">مراجعة: ج.جداً</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #0b6b7d;">${murajaaJayyidJiddan}</h3>
      </div>
      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">مراجعة: جيد/يعيد</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #b78103;">${murajaaJayyid + murajaaRe}</h3>
      </div>

      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">تلاوة: ممتاز</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #2e7d32;">${tilawaMumtaz}</h3>
      </div>
      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">تلاوة: ج.جداً</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #0b6b7d;">${tilawaJayyidJiddan}</h3>
      </div>
      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">تلاوة: جيد/يعيد</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #b78103;">${tilawaJayyid + tilawaRe}</h3>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header flex-between">
        <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--primary-brown); margin: 0;">📖 مقرر اليوم والتسميع</h3>
        <div class="flex-align-gap">
          <span style="font-size: 0.85rem; font-weight: 700;">حالة الحضور:</span>
          ${attStatusBadge}
        </div>
      </div>
      <div class="card-body p-2">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.8rem;">
          <div style="background: #f4f9f9; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);">
            <strong style="color: var(--primary-brown); font-size: 0.85rem;">📖 الدرس الجديد:</strong>
            <p style="margin-top: 4px; font-weight: 700;">${todayRecord.hifzSurah || "لم يسجل بعد"}</p>
            ${todayRecord.hifzRating ? `<span class="badge badge-active mt-1">${todayRecord.hifzRating}</span>` : ""}
          </div>
          <div style="background: #f4f9f9; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);">
            <strong style="color: var(--primary-brown); font-size: 0.85rem;">🔄 المراجعة:</strong>
            <p style="margin-top: 4px; font-weight: 700;">${todayRecord.murajaaSurah || "لم يسجل بعد"}</p>
            ${todayRecord.murajaaRating ? `<span class="badge badge-active mt-1">${todayRecord.murajaaRating}</span>` : ""}
          </div>
          <div style="background: #f4f9f9; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);">
            <strong style="color: var(--primary-brown); font-size: 0.85rem;">🎧 التلاوة:</strong>
            <p style="margin-top: 4px; font-weight: 700;">${todayRecord.tilawaSurah || "لم يسجل بعد"}</p>
            ${todayRecord.tilawaRating ? `<span class="badge badge-active mt-1">${todayRecord.tilawaRating}</span>` : ""}
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateCircleDropdowns() {
  const circlesList = window.appStore?.circles || [];
  const dropdownIds = [
    "stu-circle",
    "filter-student-circle",
    "attendance-circle-select",
    "tasmeea-circle-select",
    "report-circle-select",
    "test-circle-select",
    "edit-test-circle-select",
    "edit-comp-circle",
    "bulk-target-circle",
    "filter-teacher-notes-circle",
  ];

  dropdownIds.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;

    const currentVal = select.value;
    let defaultText = "— اختر الحلقة —";
    if (
      id === "filter-student-circle" ||
      id === "report-circle-select" ||
      id === "filter-teacher-notes-circle" ||
      id === "filter-test-circle"
    ) {
      defaultText = "كل الحلقات";
    }

    let optionsHtml = `<option value="${id.includes("filter") || id.includes("report") ? "all" : ""}">${defaultText}</option>`;
    circlesList.forEach((c) => {
      optionsHtml += `<option value="${c.id}">${c.name}</option>`;
    });

    select.innerHTML = optionsHtml;
    if (currentVal) select.value = currentVal;
  });
}

function refreshAllViews() {
  try {
    updateCircleDropdowns();
    applyAppIdentity();
    renderDashboardView();
    syncHeaderDateTime();
    if (typeof renderCirclesCards === "function") renderCirclesCards();
    if (typeof renderTeachersTable === "function") renderTeachersTable();
    if (typeof renderStudentsTable === "function") renderStudentsTable();
    if (typeof renderTestsTable === "function") renderTestsTable();
    if (typeof renderTeacherNotesTable === "function")
      renderTeacherNotesTable();
    if (typeof renderAccountsTable === "function") renderAccountsTable();
    if (typeof renderScreenView === "function") renderScreenView();
    renderNotificationsView();
  } catch (e) {
    console.warn(e);
  }
}

function refreshActiveView(viewId) {
  try {
    updateCircleDropdowns();
    applyAppIdentity();
    syncHeaderDateTime();
    if (viewId === "view-dashboard") renderDashboardView();
    if (viewId === "view-circles") {
      if (typeof renderCirclesCards === "function") renderCirclesCards();
      if (typeof renderTeachersTable === "function") renderTeachersTable();
      if (typeof renderStudentsTable === "function") renderStudentsTable();
    }
    if (
      viewId === "view-attendance" &&
      typeof renderAttendanceTable === "function"
    )
      renderAttendanceTable();
    if (
      viewId === "view-tasmeea" &&
      typeof renderTasmeeaStudents === "function"
    )
      renderTasmeeaStudents();
    if (
      viewId === "view-teacher-notes" &&
      typeof renderTeacherNotesTable === "function"
    )
      renderTeacherNotesTable();
    if (viewId === "view-accounts" && typeof renderAccountsTable === "function")
      renderAccountsTable();
    if (viewId === "view-screen" && typeof renderScreenView === "function")
      renderScreenView();
    if (viewId === "view-tests" && typeof renderTestsTable === "function")
      renderTestsTable();
    if (viewId === "view-notifications") renderNotificationsView();
    if (viewId === "view-student-home") renderStudentData();
  } catch (e) {
    console.warn(e);
  }
}

function renderDashboardView() {
  const user = window.currentUser;
  if (!user) return;

  const isTeacher = user.role === window.ROLES.TEACHER;
  const isAdmin = user.role === window.ROLES.ADMIN;
  const teacherDashCols = document.getElementById("teacher-dash-columns");
  const tamayuzBoardCard = document.getElementById("tamayuz-board-card");
  const selfAttCard = document.getElementById("teacher-self-attendance-card");
  const todayStr = new Date().toISOString().split("T")[0];

  if (tamayuzBoardCard) {
    tamayuzBoardCard.style.display = isTeacher ? "none" : "block";
  }

  // بطاقة التحضير الذاتي
  if (selfAttCard) {
    selfAttCard.style.display = isAdmin || isTeacher ? "block" : "none";
    const attId = isAdmin ? "admin_main" : user.teacherId || user.id;
    const selfAttRecord = (window.appStore?.teacherAttendance || []).find(
      (a) => a.teacherId === attId && a.date === todayStr,
    );
    const checkinBadge = document.getElementById(
      "teacher-self-checkin-status-badge",
    );
    const checkinBtn = document.getElementById("btn-teacher-self-checkin");

    if (checkinBadge) {
      if (selfAttRecord && selfAttRecord.status === "present") {
        checkinBadge.innerHTML = `<span class="badge badge-active">🟢 حاضر اليوم (${selfAttRecord.time || "تم التحضير"})</span>`;
        if (checkinBtn) {
          checkinBtn.textContent = "✅ تم تسجيل حضورك اليوم بنجاح";
          checkinBtn.classList.remove("btn-success");
          checkinBtn.classList.add("btn-outline-brown");
        }
      } else {
        checkinBadge.innerHTML = `<span class="badge" style="background:#fff8e1; color:#b78103;">⏳ بانتظار تأكيد حضورك اليوم بالمسجد</span>`;
        if (checkinBtn) {
          checkinBtn.textContent = "✅ تسجيل حضوري اليوم بالمسجد";
          checkinBtn.classList.remove("btn-outline-brown");
          checkinBtn.classList.add("btn-success");
        }
      }
    }
  }

  if (isTeacher) {
    if (teacherDashCols) teacherDashCols.style.display = "grid";

    const teacherObj = (window.appStore?.teachers || []).find(
      (t) =>
        t.userId === user.id || t.id === user.teacherId || t.id === user.id,
    );
    const teacherId = teacherObj ? teacherObj.id : user.id;

    const teacherCircles = (window.appStore?.circles || []).filter(
      (c) =>
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(teacherId)) ||
        c.teacherId === teacherId,
    );
    const teacherCircleIds = teacherCircles.map((c) => c.id);

    const teacherStudents = (window.appStore?.students || []).filter(
      (s) => teacherCircleIds.includes(s.circleId) && s.status === "active",
    );

    const todayAtt = (window.appStore?.attendance || []).filter(
      (a) => a.date === todayStr && teacherCircleIds.includes(a.circleId),
    );
    const absentCount = todayAtt.filter((a) => a.status === "absent").length;
    const presentCount = todayAtt.filter(
      (a) => a.status === "present" || a.status === "late",
    ).length;

    const el1 = document.getElementById("val-stat-1");
    const el2 = document.getElementById("val-stat-2");
    const el3 = document.getElementById("val-stat-3");
    const el4 = document.getElementById("val-stat-4");
    if (el1) {
      document.getElementById("lbl-stat-1").textContent = "حلقاتي";
      el1.textContent = teacherCircles.length;
    }
    if (el2) {
      document.getElementById("lbl-stat-2").textContent = "طلابي";
      el2.textContent = teacherStudents.length;
    }
    if (el3) {
      document.getElementById("lbl-stat-3").textContent = "غياب اليوم";
      el3.textContent = absentCount;
    }
    if (el4) {
      document.getElementById("lbl-stat-4").textContent = "حاضرون اليوم";
      el4.textContent = presentCount;
    }
  } else {
    if (teacherDashCols) teacherDashCols.style.display = "none";

    const activeStudents = (window.appStore?.students || []).filter(
      (s) => s.status === "active",
    );
    const studentsCount = activeStudents.length;
    const teachersCount = (window.appStore?.teachers || []).filter(
      (t) => t.status === "active",
    ).length;
    const circlesCount = (window.appStore?.circles || []).length;

    const todayAtt = (window.appStore?.attendance || []).filter(
      (a) => a.date === todayStr,
    );
    const presentCount = todayAtt.filter(
      (a) => a.status === "present" || a.status === "late",
    ).length;

    const todayTasmeea = (window.appStore?.tasmeea || []).filter(
      (t) => t.date === todayStr,
    );
    const recitedStudentIds = new Set(
      todayTasmeea
        .filter(
          (t) => t.hifzSurah || t.murajaaSurah || t.tilawaSurah || t.rating,
        )
        .map((t) => t.studentId),
    );

    const recitedCount = activeStudents.filter((s) =>
      recitedStudentIds.has(s.id),
    ).length;
    const notRecitedCount = Math.max(0, studentsCount - recitedCount);

    const el1 = document.getElementById("val-stat-1");
    const el2 = document.getElementById("val-stat-2");
    const el3 = document.getElementById("val-stat-3");
    const el4 = document.getElementById("val-stat-4");
    const elRecited = document.getElementById("val-stat-recited-today");
    const elNotRecited = document.getElementById("val-stat-not-recited-today");

    if (el1) {
      document.getElementById("lbl-stat-1").textContent = "الطلاب";
      el1.textContent = studentsCount;
    }
    if (el2) {
      document.getElementById("lbl-stat-2").textContent = "المعلمون";
      el2.textContent = teachersCount;
    }
    if (el3) {
      document.getElementById("lbl-stat-3").textContent = "الحلقات";
      el3.textContent = circlesCount;
    }
    if (el4) {
      document.getElementById("lbl-stat-4").textContent = "حاضرون اليوم";
      el4.textContent = presentCount;
    }
    if (elRecited) elRecited.textContent = recitedCount;
    if (elNotRecited) elNotRecited.textContent = notRecitedCount;

    if (typeof renderTamayuzBoard === "function") {
      try {
        renderTamayuzBoard();
      } catch (e) {
        console.warn(e);
      }
    }
  }
}

// نافذة تفاصيل من سمّع ومن لم يسمّع اليوم
window.currentTasmeeaModalType = "recited";
window.openTasmeeaDetailsModal = function (type) {
  window.currentTasmeeaModalType = type;
  const titleEl = document.getElementById("tasmeea-details-modal-title");
  const tbody = document.getElementById("tasmeea-details-tbody");
  if (!tbody) return;

  const todayStr = new Date().toISOString().split("T")[0];
  const activeStudents = (window.appStore?.students || []).filter(
    (s) => s.status === "active",
  );
  const todayTasmeea = (window.appStore?.tasmeea || []).filter(
    (t) => t.date === todayStr,
  );

  const tasmeeaMap = new Map();
  todayTasmeea.forEach((t) => tasmeeaMap.set(t.studentId, t));

  let list = [];
  if (type === "recited") {
    if (titleEl)
      titleEl.textContent = `📖 قائمة الطلاب الذين سمّعوا اليوم (${todayStr})`;
    list = activeStudents.filter((s) => tasmeeaMap.has(s.id));
  } else {
    if (titleEl)
      titleEl.textContent = `⏳ قائمة الطلاب الذين لم يسمّعوا اليوم (${todayStr})`;
    list = activeStudents.filter((s) => !tasmeeaMap.has(s.id));
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted p-4">لا توجد بيانات لهذه القائمة اليوم</td></tr>`;
  } else {
    let html = "";
    list.forEach((s, idx) => {
      const circle = (window.appStore?.circles || []).find(
        (c) => c.id === s.circleId,
      );
      const circleName = circle ? circle.name : "غير مسجل";
      const tasm = tasmeeaMap.get(s.id) || {};
      const statusBadge =
        type === "recited"
          ? '<span class="badge badge-active">تم التسميع</span>'
          : '<span class="badge badge-danger">لم يسمّع</span>';

      html += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 700;">${s.name}</td>
          <td><span style="font-weight: 600; color: var(--text-dark);">${circleName}</span></td>
          <td>${statusBadge}</td>
          <td>${tasm.hifzSurah || "—"}</td>
          <td>${tasm.murajaaSurah || "—"}</td>
          <td>${tasm.tilawaSurah || "—"}</td>
          <td><span class="badge badge-active">${tasm.rating || tasm.hifzRating || "—"}</span></td>
          <td>${tasm.studentNotes || tasm.adminNotes || "—"}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }

  openModal("modal-tasmeea-status-details");
};

window.filterTasmeeaDetailsModal = function () {
  const query = (
    document.getElementById("search-modal-tasmeea-status")?.value || ""
  )
    .trim()
    .toLowerCase();
  document.querySelectorAll("#tasmeea-details-tbody tr").forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(query)
      ? ""
      : "none";
  });
};

window.exportTasmeeaDetailsExcel = function () {
  const table = document.getElementById("tasmeea-details-table");
  if (!table || table.rows.length <= 1) {
    alert("⚠️ لا توجد بيانات للتصدير!");
    return;
  }
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "تسميع_اليوم" });
  const fileName =
    window.currentTasmeeaModalType === "recited"
      ? "الطلاب_الذين_سمعوا_اليوم"
      : "الطلاب_الذين_لم_يسمعوا_اليوم";
  XLSX.writeFile(
    wb,
    `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

window.exportTasmeeaDetailsPDF = function () {
  if (typeof exportElementToPDF === "function") {
    exportElementToPDF(
      "modal-tasmeea-status-details",
      "تفاصيل_تسميع_الطلاب",
      "تفاصيل تسميع الطلاب",
    );
  } else {
    window.print();
  }
};

window.printTasmeeaDetails = function () {
  window.exportTasmeeaDetailsPDF();
};

function renderNotificationsView() {
  const notifContainer = document.getElementById(
    "unified-notifications-container",
  );
  if (!notifContainer) return;

  const allNotifs = window.appStore?.notifications || [];
  if (allNotifs.length === 0) {
    notifContainer.innerHTML = `<div class="empty-state-card p-3"><p class="text-muted">لا توجد إشعارات جديدة حالياً</p></div>`;
    return;
  }

  notifContainer.innerHTML = allNotifs
    .map(
      (n) => `
      <div class="notification-item-card mb-2 p-3" style="background: #fafcfb; border: 1px solid var(--border-color); border-radius: 8px;">
        <h4 style="font-weight: 800; color: var(--primary-brown); margin-bottom: 4px;">${n.title}</h4>
        <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 6px;">${n.body}</p>
        <div class="flex-between" style="font-size: 0.75rem; color: #888;">
          <span>من: ${n.sender || "الإدارة"}</span>
          <span>${n.date || ""}</span>
        </div>
      </div>
    `,
    )
    .join("");
}

window.handleUserProfileSave = function (e) {
  if (e && e.preventDefault) e.preventDefault();
  const user = window.currentUser;
  if (!user) return;

  if (user.role !== window.ROLES.ADMIN) {
    alert("⚠️ هذه الخاصية متاحة لمدير المَجْمَع فقط.");
    return;
  }

  const newName = (
    document.getElementById("set-profile-name")?.value || ""
  ).trim();
  const newPhone = (
    document.getElementById("set-profile-phone")?.value || ""
  ).trim();
  const newPass = (
    document.getElementById("set-profile-password")?.value || ""
  ).trim();

  if (!newName) {
    alert("يرجى إدخال الاسم الكامل.");
    return;
  }

  user.name = newName;
  user.phone = newPhone;

  if (!window.appStore.users) window.appStore.users = [];
  let userRec = window.appStore.users.find(
    (u) =>
      u.id === user.id ||
      u.role === window.ROLES.ADMIN ||
      u.username === user.username ||
      u.username === "123456" ||
      u.username === "admin",
  );

  if (userRec) {
    userRec.name = newName;
    userRec.phone = newPhone;
    if (newPass) userRec.pass = newPass;
    if (typeof saveToCloud === "function") {
      saveToCloud("users", userRec.id, userRec);
    }
  } else {
    userRec = {
      id: user.id || "u_admin_main",
      name: newName,
      role: window.ROLES.ADMIN,
      username: user.username || "123456",
      phone: newPhone,
      pass: newPass || "1234",
      status: "active",
      createdAt: Date.now(),
    };
    window.appStore.users.push(userRec);
    if (typeof saveToCloud === "function") {
      saveToCloud("users", userRec.id, userRec);
    }
  }

  if (typeof saveLocalStore === "function") saveLocalStore();

  localStorage.setItem("HALAQAT_SESSION_USER", JSON.stringify(user));

  const nameEl = document.getElementById("current-user-name");
  const welcomeEl = document.getElementById("welcome-message");
  const avatarEl = document.getElementById("current-user-avatar");
  if (nameEl) nameEl.textContent = newName;
  if (welcomeEl) welcomeEl.textContent = `مرحباً ${newName}`;
  if (avatarEl) avatarEl.textContent = newName ? newName.charAt(0) : "ص";

  alert("✅ تم حفظ وتحديث البيانات الشخصية للمدير بنجاح!");
};

window.handleLogout = function () {
  window.currentUser = null;
  localStorage.removeItem("HALAQAT_SESSION_USER");
  showMainLoginView();
};

window.openModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
};

window.closeModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
};
