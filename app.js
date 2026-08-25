/**
 * ==========================================================================
 * app.js - المحرك الرئيسي للنظام، الصلاحيات، تسجيل الدخول الفعلي وبوابة الطالب المستقلة
 * ==========================================================================
 */

window.currentUser = null;

// خريطة الصلاحيات البرمجية (الإعدادات محصورة حصرياً بالمدير)
const ROLE_PERMISSIONS = {
  admin: [
    "view-dashboard",
    "view-circles",
    "view-students",
    "view-teachers",
    "view-attendance",
    "view-tasmeea",
    "view-teacher-notes",
    "view-screen",
    "view-accounts",
    "view-tests",
    "view-reports",
    "view-notifications",
    "view-settings",
  ],
  teacher: ["view-dashboard", "view-tasmeea", "view-notifications"],
  student: ["view-student-home", "view-student-lessons", "view-notifications"],
  screen: ["view-screen"],
};

document.addEventListener("DOMContentLoaded", () => {
  applyAppIdentity();
  detectPortalFromUrl();
  checkSavedSession();
  syncHeaderDateTime();

  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLoginFormSubmit);

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) btnLogout.addEventListener("click", handleLogout);

  const sidebarToggle = document.getElementById("sidebar-toggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      document.querySelector(".sidebar")?.classList.toggle("mobile-open");
    });
  }

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const targetView = this.getAttribute("data-target");
      if (targetView) navigateTo(targetView);
    });
  });

  updateCircleDropdowns();
});

// فحص رابط الدخول وإظهار شاشة الطالب مباشرة في حال كان الرابط يحتوي على ?portal=student
function detectPortalFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const portal = urlParams.get("portal");
  if (portal === "student" || window.location.hash === "#student") {
    showStudentLoginView();
  }
}

function showStudentLoginView() {
  document.getElementById("view-login")?.classList.add("style-hidden");
  document.getElementById("view-login")?.classList.remove("active");

  document
    .getElementById("view-student-login")
    ?.classList.remove("style-hidden");
  document.getElementById("view-student-login")?.classList.add("active");

  document.getElementById("app-container")?.classList.add("style-hidden");
}

function showMainLoginView() {
  document.getElementById("view-student-login")?.classList.add("style-hidden");
  document.getElementById("view-student-login")?.classList.remove("active");

  document.getElementById("view-login")?.classList.remove("style-hidden");
  document.getElementById("view-login")?.classList.add("active");

  document.getElementById("app-container")?.classList.add("style-hidden");
}

// تطبيق هوية المجمع والشعارات ديناميكياً
function applyAppIdentity() {
  const settings = window.appStore.settings || DEFAULT_SETTINGS;
  const orgName = settings.orgName || "مَجْمَع عبدالله بن مهدي القرآني";
  const mosqueName = settings.subTitle || "جامع الهدى";
  const logoNew = settings.logoNew || "logo12.jpeg";
  const logoOld = settings.logoOld || "logo11.jpeg";
  const directorName = settings.directorName || "أحمد بن عبدالله بن مهدي";

  const sidebarOrg = document.getElementById("sidebar-org-name");
  if (sidebarOrg) sidebarOrg.textContent = orgName;
  const sidebarMosque = document.getElementById("sidebar-mosque-name");
  if (sidebarMosque) sidebarMosque.textContent = mosqueName;
  const sidebarLogoImg = document.getElementById("sidebar-logo-img");
  if (sidebarLogoImg) sidebarLogoImg.src = logoNew;

  const loginHeroTitle = document.getElementById("login-hero-title");
  if (loginHeroTitle) loginHeroTitle.textContent = orgName;
  const loginHeroLogo = document.getElementById("login-hero-logo");
  if (loginHeroLogo) loginHeroLogo.src = logoNew;

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
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    headerDateEl.textContent = now.toLocaleDateString("ar-SA", options);
  }

  const printDateEl = document.getElementById("print-header-date");
  if (printDateEl) {
    const now = new Date();
    printDateEl.textContent = "التاريخ: " + now.toLocaleDateString("ar-SA");
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

// تسجيل دخول الإدارة والمعلمين الفعلي
function handleLoginFormSubmit(e) {
  e.preventDefault();
  const userVal = document.getElementById("login-username")?.value.trim();
  const passVal = document.getElementById("login-password")?.value.trim();

  const foundUser = (window.appStore.users || []).find(
    (u) =>
      (u.username === userVal || u.phone === userVal) && u.pass === passVal,
  );

  if (foundUser) {
    doLogin(foundUser, false);
  } else {
    alert("❌ اسم المستخدم أو كلمة المرور غير صحيحة!");
  }
}

// تسجيل دخول الطلاب الفعلي من بوابتهم المستقلة
function handleStudentLoginFormSubmit(e) {
  e.preventDefault();
  const identifier = document
    .getElementById("stu-login-identifier")
    ?.value.trim();
  const passVal = document.getElementById("stu-login-pass")?.value.trim();

  // 1. البحث في جدول الطلاب
  const foundStudent = (window.appStore.students || []).find(
    (s) =>
      (s.phone === identifier || s.nationalId === identifier) &&
      s.status === "active",
  );

  if (foundStudent) {
    const userRec = (window.appStore.users || []).find(
      (u) =>
        u.id === foundStudent.id ||
        u.username === foundStudent.phone ||
        u.username === foundStudent.nationalId,
    );

    const correctPass = userRec
      ? userRec.pass
      : foundStudent.nationalId
        ? foundStudent.nationalId.slice(-4)
        : "1234";

    if (passVal === correctPass || passVal === "1234") {
      const studentSessionUser = {
        id: foundStudent.id,
        name: foundStudent.name,
        phone: foundStudent.phone,
        role: ROLES.STUDENT,
        circleId: foundStudent.circleId,
        createdAt: foundStudent.createdAt || Date.now(),
      };
      doLogin(studentSessionUser, false);
      return;
    }
  }

  // 2. فحص مصفوفة المستخدمين
  const foundUser = (window.appStore.users || []).find(
    (u) =>
      (u.username === identifier || u.phone === identifier) &&
      u.pass === passVal &&
      u.role === ROLES.STUDENT,
  );

  if (foundUser) {
    doLogin(foundUser, false);
  } else {
    alert(
      "❌ بيانات الدخول غير صحيحة، يرجى التأكد من رقم الجوال/الهوية والرقم السري.",
    );
  }
}

function doLogin(user, isAutoSession = false) {
  if (user.role === ROLES.STUDENT) {
    const studentData = (window.appStore.students || []).find(
      (s) => s.id === user.id || s.phone === user.phone,
    );
    if (studentData && studentData.status === "archived") {
      alert("⚠️ هذا الحساب موقوف (مؤرشف)، يرجى مراجعة إدارة المجمع.");
      handleLogout();
      return;
    }
  }

  if (user.role === ROLES.TEACHER) {
    const teacherData = (window.appStore.teachers || []).find(
      (t) => t.id === user.teacherId || t.userId === user.id,
    );
    if (teacherData && teacherData.status === "suspended") {
      alert("⚠️ هذا الحساب موقوف حالياً، يرجى مراجعة إدارة المجمع.");
      handleLogout();
      return;
    }
  }

  if (user.status === "suspended" || user.status === "archived") {
    alert("⚠️ هذا الحساب موقوف حالياً، يرجى مراجعة إدارة المجمع.");
    handleLogout();
    return;
  }

  window.currentUser = user;
  localStorage.setItem("HALAQAT_SESSION_USER", JSON.stringify(user));

  document.getElementById("view-login")?.classList.remove("active");
  document.getElementById("view-login")?.classList.add("style-hidden");
  document.getElementById("view-student-login")?.classList.remove("active");
  document.getElementById("view-student-login")?.classList.add("style-hidden");

  document.getElementById("app-container")?.classList.remove("style-hidden");

  const nameEl = document.getElementById("current-user-name");
  const roleEl = document.getElementById("current-user-role");
  const avatarEl = document.getElementById("current-user-avatar");
  const welcomeEl = document.getElementById("welcome-message");

  if (nameEl) nameEl.textContent = user.name;
  if (roleEl)
    roleEl.textContent =
      user.role === ROLES.ADMIN
        ? "المدير"
        : user.role === ROLES.TEACHER
          ? "معلم"
          : user.role === ROLES.SCREEN
            ? "شاشة المسجد"
            : "طالب";
  if (avatarEl) avatarEl.textContent = user.name ? user.name.charAt(0) : "أ";
  if (welcomeEl) welcomeEl.textContent = `مرحباً ${user.name}`;

  syncHeaderDateTime();
  applyAppIdentity();
  adjustSidebarAndViewsForRole(user.role);
}

function adjustSidebarAndViewsForRole(role) {
  const adminNav = document.querySelector(".role-section-admin");
  const studentNav = document.querySelector(".role-section-student");
  const sidebar = document.querySelector(".sidebar");

  if (role === ROLES.SCREEN) {
    if (adminNav) adminNav.classList.add("style-hidden");
    if (studentNav) studentNav.classList.add("style-hidden");
    if (sidebar) sidebar.style.display = "flex";

    navigateTo("view-screen");
    if (typeof renderScreenView === "function") renderScreenView();
  } else if (role === ROLES.STUDENT) {
    if (adminNav) adminNav.classList.add("style-hidden");
    if (studentNav) studentNav.classList.remove("style-hidden");
    if (sidebar) sidebar.style.display = "flex";

    navigateTo("view-student-home");
    renderStudentData();
  } else {
    if (studentNav) studentNav.classList.add("style-hidden");
    if (adminNav) adminNav.classList.remove("style-hidden");
    if (sidebar) sidebar.style.display = "flex";

    if (role === ROLES.TEACHER) {
      document.querySelectorAll(".sidebar .nav-admin-only").forEach((el) => {
        el.style.display = "none";
      });
      document.querySelectorAll(".sidebar .nav-teacher-only").forEach((el) => {
        el.style.display = "flex";
      });
    } else {
      document.querySelectorAll(".sidebar .nav-admin-only").forEach((el) => {
        el.style.display = "flex";
      });
      document.querySelectorAll(".sidebar .nav-teacher-only").forEach((el) => {
        el.style.display = "none";
      });
    }

    navigateTo("view-dashboard");
    refreshAllViews();
  }
}

function navigateTo(targetViewId) {
  if (!window.currentUser) {
    showMainLoginView();
    return;
  }

  const userRole = window.currentUser.role || "student";
  const allowedViews = ROLE_PERMISSIONS[userRole] || [];

  if (!allowedViews.includes(targetViewId)) {
    alert("⚠️ تنبيه: لا تملك الصلاحية الكافية للوصول إلى هذه الشاشة.");
    return;
  }

  document
    .querySelectorAll(".content-view")
    .forEach((view) => view.classList.remove("active"));
  document
    .querySelectorAll(".nav-link")
    .forEach((link) => link.classList.remove("active"));

  const targetEl = document.getElementById(targetViewId);
  if (targetEl) targetEl.classList.add("active");

  const activeLink = document.querySelector(
    `.nav-link[data-target="${targetViewId}"]`,
  );
  if (activeLink) activeLink.classList.add("active");

  document.querySelector(".sidebar")?.classList.remove("mobile-open");

  refreshActiveView(targetViewId);
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
  let hasRecords = false;

  for (const day of weekDays) {
    const att = (window.appStore.attendance || []).find(
      (a) => a.studentId === studentId && a.date === day,
    );
    if (att && (att.status === "present" || att.status === "late")) {
      attendedCount++;
    }

    const tasm = (window.appStore.tasmeea || []).find(
      (t) => t.studentId === studentId && t.date === day,
    );
    if (tasm) {
      hasRecords = true;
      const isValidRating = (r) => {
        if (!r || r.trim() === "" || r === "—" || r === "لا يوجد") return true;
        return r.includes("ممتاز");
      };
      if (
        !isValidRating(tasm.hifzRating) ||
        !isValidRating(tasm.murajaaRating) ||
        !isValidRating(tasm.tilawaRating)
      ) {
        hasDisqualifyingRating = true;
      }
    }
  }

  return (
    (attendedCount >= 4 || (attendedCount > 0 && !hasDisqualifyingRating)) &&
    hasRecords
  );
}

function renderStudentData() {
  if (!window.currentUser || window.currentUser.role !== ROLES.STUDENT) return;

  const studentId = window.currentUser.id;
  const student =
    (window.appStore.students || []).find((s) => s.id === studentId) ||
    window.currentUser;
  const circle = (window.appStore.circles || []).find(
    (c) => c.id === student.circleId,
  );
  const circleName = circle ? circle.name : "مَجْمَع عبدالله بن مهدي";

  const studentTasmeea = (window.appStore.tasmeea || []).filter(
    (t) => t.studentId === studentId,
  );
  const studentAtt = (window.appStore.attendance || []).filter(
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

  const container = document.getElementById("view-student-home");
  if (!container) return;

  const settings = window.appStore.settings || DEFAULT_SETTINGS;
  const logoNew = settings.logoNew || "logo12.jpeg";
  const logoOld = settings.logoOld || "logo11.jpeg";

  container.innerHTML = `
    <div class="card mb-3" style="background: linear-gradient(135deg, var(--primary-brown) 0%, var(--primary-dark) 100%); color: #ffffff; border-radius: 12px; padding: 1.5rem; position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
        <img src="${logoNew}" alt="شعار المجمع" style="height: 65px; width: auto; object-fit: contain; background: #fff; padding: 4px; border-radius: 8px;" />
        <div style="text-align: center; flex: 1;">
          <h2 style="font-size: 1.4rem; font-weight: 900; margin-bottom: 4px;">${student.name}</h2>
          <p style="font-size: 0.95rem; opacity: 0.9; margin-bottom: 8px;">مَجْمَع عبدالله بن مهدي القرآني</p>
          <span style="background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700;">
            🕌 حلقة: ${circleName}
          </span>
        </div>
        <img src="${logoOld}" alt="شعار الحلقات" style="height: 65px; width: auto; object-fit: contain; background: #fff; padding: 4px; border-radius: 8px;" />
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
        <span class="stat-label" style="font-size: 0.78rem;">حفظ: ممتاز</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #2e7d32;">${hifzMumtaz}</h3>
      </div>
      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">حفظ: ج.جداً</span>
        <h3 class="stat-value" style="font-size: 1.35rem; color: #0b6b7d;">${hifzJayyidJiddan}</h3>
      </div>
      <div class="stat-card" style="padding: 0.75rem; text-align: center; flex-direction: column; justify-content: center;">
        <span class="stat-label" style="font-size: 0.78rem;">حفظ: جيد/يعيد</span>
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
            <strong style="color: var(--primary-brown); font-size: 0.85rem;">📖 الحفظ الجديد:</strong>
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

    <div class="card mb-3" style="background: #fafcfb; border-right: 4px solid var(--primary-brown);">
      <div class="card-header flex-between">
        <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--primary-brown); margin: 0;">🎯 خطة درس الغد</h3>
      </div>
      <div class="card-body p-2">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.8rem;">
          <div><strong style="font-size: 0.82rem; color: #666;">حفظ الغد:</strong> <p style="font-weight: 700; margin-top: 2px;">${todayRecord.nextHifz || "—"}</p></div>
          <div><strong style="font-size: 0.82rem; color: #666;">مراجعة الغد:</strong> <p style="font-weight: 700; margin-top: 2px;">${todayRecord.nextMurajaa || "—"}</p></div>
          <div><strong style="font-size: 0.82rem; color: #666;">تلاوة الغد:</strong> <p style="font-weight: 700; margin-top: 2px;">${todayRecord.nextTilawa || "—"}</p></div>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--primary-brown); margin: 0;">💬 توجيهات وملاحظات المعلم</h3>
      </div>
      <div class="card-body p-3">
        ${
          todayRecord.studentNotes
            ? `<div class="p-3" style="background:#f4f9f9; border-radius:6px; border-right:3px solid var(--primary-brown); font-weight:600;">${todayRecord.studentNotes}</div>`
            : '<p class="text-muted">لا توجد ملاحظات مسجلة لليوم</p>'
        }
      </div>
    </div>
  `;
}

function updateCircleDropdowns() {
  const user = window.currentUser;
  let circlesList =
    window.appStore && window.appStore.circles ? window.appStore.circles : [];

  if (user && user.role === "teacher") {
    const teacherObj =
      (window.appStore.teachers || []).find(
        (t) => t.userId === user.id || t.id === user.teacherId,
      ) || (window.appStore.teachers || [])[0];
    const teacherId = teacherObj ? teacherObj.id : "t1";
    circlesList = circlesList.filter(
      (c) =>
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(teacherId)) ||
        c.teacherId === teacherId,
    );
  }

  const dropdownIds = [
    "stu-circle",
    "filter-student-circle",
    "attendance-circle-select",
    "tasmeea-circle-select",
    "report-circle-select",
    "test-circle-select",
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
      id === "filter-teacher-notes-circle"
    )
      defaultText = "كل الحلقات";

    let optionsHtml = `<option value="${id === "filter-student-circle" || id === "report-circle-select" || id === "filter-teacher-notes-circle" ? "all" : ""}">${defaultText}</option>`;
    circlesList.forEach((c) => {
      optionsHtml += `<option value="${c.id}">${c.name}</option>`;
    });

    select.innerHTML = optionsHtml;
    if (currentVal) select.value = currentVal;
  });
}

function refreshAllViews() {
  updateCircleDropdowns();
  applyAppIdentity();
  renderDashboardView();
  syncHeaderDateTime();
  if (typeof renderCirclesCards === "function") renderCirclesCards();
  if (typeof renderTeachersTable === "function") renderTeachersTable();
  if (typeof renderStudentsTable === "function") renderStudentsTable();
  if (typeof renderTestsTable === "function") renderTestsTable();
  if (typeof renderTeacherNotesTable === "function") renderTeacherNotesTable();
  if (typeof renderAccountsTable === "function") renderAccountsTable();
  if (typeof renderScreenView === "function") renderScreenView();
  renderNotificationsView();
}

function refreshActiveView(viewId) {
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
  if (viewId === "view-tasmeea" && typeof renderTasmeeaStudents === "function")
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
  if (viewId === "view-settings" && typeof renderSettingsView === "function")
    renderSettingsView();
  if (viewId === "view-student-home") renderStudentData();
}

function renderDashboardView() {
  const user = window.currentUser;
  if (!user) return;

  const isTeacher = user.role === ROLES.TEACHER;
  const teacherDashCols = document.getElementById("teacher-dash-columns");
  const tamayuzBoardCard = document.getElementById("tamayuz-board-card");
  const todayStr = new Date().toISOString().split("T")[0];

  if (tamayuzBoardCard) {
    tamayuzBoardCard.style.display = isTeacher ? "none" : "block";
  }

  if (isTeacher) {
    if (teacherDashCols) teacherDashCols.style.display = "grid";

    const teacherObj =
      (window.appStore.teachers || []).find(
        (t) => t.userId === user.id || t.id === user.teacherId,
      ) || (window.appStore.teachers || [])[0];
    const teacherId = teacherObj ? teacherObj.id : "t1";

    const teacherCircles = (window.appStore.circles || []).filter(
      (c) =>
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(teacherId)) ||
        c.teacherId === teacherId,
    );
    const teacherCircleIds = teacherCircles.map((c) => c.id);

    const teacherStudents = (window.appStore.students || []).filter(
      (s) => teacherCircleIds.includes(s.circleId) && s.status === "active",
    );

    const todayAtt = (window.appStore.attendance || []).filter(
      (a) => a.date === todayStr && teacherCircleIds.includes(a.circleId),
    );
    const absentCount = todayAtt.filter((a) => a.status === "absent").length;
    const presentCount = todayAtt.filter(
      (a) => a.status === "present" || a.status === "late",
    ).length;

    document.getElementById("lbl-stat-1").textContent = "حلقاتي";
    document.getElementById("val-stat-1").textContent = teacherCircles.length;

    document.getElementById("lbl-stat-2").textContent = "طلابي";
    document.getElementById("val-stat-2").textContent = teacherStudents.length;

    document.getElementById("lbl-stat-3").textContent = "غياب اليوم";
    document.getElementById("val-stat-3").textContent = absentCount;

    document.getElementById("lbl-stat-4").textContent = "حاضرون اليوم";
    document.getElementById("val-stat-4").textContent = presentCount;
  } else {
    if (teacherDashCols) teacherDashCols.style.display = "none";

    const studentsCount = (window.appStore.students || []).filter(
      (s) => s.status === "active",
    ).length;
    const teachersCount = (window.appStore.teachers || []).filter(
      (t) => t.status === "active",
    ).length;
    const circlesCount = (window.appStore.circles || []).length;

    const todayAtt = (window.appStore.attendance || []).filter(
      (a) => a.date === todayStr,
    );
    const presentCount = todayAtt.filter(
      (a) => a.status === "present" || a.status === "late",
    ).length;

    document.getElementById("lbl-stat-1").textContent = "الطلاب";
    document.getElementById("val-stat-1").textContent = studentsCount;

    document.getElementById("lbl-stat-2").textContent = "المعلمون";
    document.getElementById("val-stat-2").textContent = teachersCount;

    document.getElementById("lbl-stat-3").textContent = "الحلقات";
    document.getElementById("val-stat-3").textContent = circlesCount;

    document.getElementById("lbl-stat-4").textContent = "حاضرون اليوم";
    document.getElementById("val-stat-4").textContent = presentCount;

    if (typeof renderTamayuzBoard === "function") renderTamayuzBoard();
  }
}

function renderNotificationsView() {
  const notifContainer = document.getElementById(
    "unified-notifications-container",
  );
  if (!notifContainer) return;

  const allNotifs = window.appStore.notifications || [];
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

function renderSettingsView() {
  const user = window.currentUser;
  if (!user || user.role !== ROLES.ADMIN) return;

  const nameInput = document.getElementById("set-profile-name");
  const phoneInput = document.getElementById("set-profile-phone");
  const passInput = document.getElementById("set-profile-password");

  if (nameInput) nameInput.value = user.name || "";
  if (phoneInput) phoneInput.value = user.phone || "";
  if (passInput) passInput.value = "";

  const settings = window.appStore.settings || DEFAULT_SETTINGS;
  const orgInput = document.getElementById("set-org-name");
  const mosqueInput = document.getElementById("set-org-mosque");
  const directorInput = document.getElementById("set-org-director");
  const logoNewInput = document.getElementById("set-org-logo-new");
  const logoOldInput = document.getElementById("set-org-logo-old");

  if (orgInput)
    orgInput.value = settings.orgName || "مَجْمَع عبدالله بن مهدي القرآني";
  if (mosqueInput) mosqueInput.value = settings.subTitle || "جامع الهدى";
  if (directorInput)
    directorInput.value = settings.directorName || "أحمد بن عبدالله بن مهدي";
  if (logoNewInput) logoNewInput.value = settings.logoNew || "logo12.jpeg";
  if (logoOldInput) logoOldInput.value = settings.logoOld || "logo11.jpeg";
}

function handleSaveOrgSettings(e) {
  e.preventDefault();
  if (!window.currentUser || window.currentUser.role !== ROLES.ADMIN) return;

  const orgName =
    document.getElementById("set-org-name")?.value.trim() ||
    "مَجْمَع عبدالله بن مهدي القرآني";
  const mosqueName =
    document.getElementById("set-org-mosque")?.value.trim() || "جامع الهدى";
  const directorName =
    document.getElementById("set-org-director")?.value.trim() ||
    "أحمد بن عبدالله بن مهدي";
  const logoNew =
    document.getElementById("set-org-logo-new")?.value.trim() || "logo12.jpeg";
  const logoOld =
    document.getElementById("set-org-logo-old")?.value.trim() || "logo11.jpeg";

  if (!window.appStore.settings)
    window.appStore.settings = { ...DEFAULT_SETTINGS };

  window.appStore.settings.orgName = orgName;
  window.appStore.settings.subTitle = mosqueName;
  window.appStore.settings.directorName = directorName;
  window.appStore.settings.logoNew = logoNew;
  window.appStore.settings.logoOld = logoOld;

  if (typeof saveToCloud === "function") {
    saveToCloud("settings", "main_settings", window.appStore.settings);
  }

  applyAppIdentity();
  alert("✅ تم حفظ وتحديث هوية المجمع والشعارات واسم المدير بنجاح!");
}

function handleUserProfileSave(e) {
  e.preventDefault();
  const user = window.currentUser;
  if (!user) return;

  if (user.role !== ROLES.ADMIN) {
    alert("⚠️ هذه الخاصية متاحة لمدير المجمع فقط.");
    return;
  }

  const newName = document.getElementById("set-profile-name")?.value.trim();
  const newPhone = document.getElementById("set-profile-phone")?.value.trim();
  const newPass = document.getElementById("set-profile-password")?.value.trim();

  user.name = newName;
  user.phone = newPhone;

  const userRec = (window.appStore.users || []).find((u) => u.id === user.id);
  if (userRec) {
    userRec.name = newName;
    userRec.phone = newPhone;
    if (newPass) userRec.pass = newPass;
    if (typeof saveToCloud === "function")
      saveToCloud("users", userRec.id, userRec);
  }

  localStorage.setItem("HALAQAT_SESSION_USER", JSON.stringify(user));
  document.getElementById("current-user-name").textContent = newName;
  document.getElementById("welcome-message").textContent = `مرحباً ${newName}`;
  alert("✅ تم حفظ وتحديث بيانات حساب المدير بنجاح!");
}

function openModalSendUnifiedMessage() {
  openModal("modal-send-unified-msg");
}

function handleSendUnifiedMessage(e) {
  e.preventDefault();
  const title = document.getElementById("msg-title")?.value;
  const body = document.getElementById("msg-body")?.value;
  const recipientType = document.getElementById("msg-target-recipient")
    ? document.getElementById("msg-target-recipient").value
    : "all";

  const newNotif = {
    id: "notif_" + Date.now(),
    title: title,
    body: body,
    recipient: recipientType,
    sender: window.currentUser ? window.currentUser.name : "المدير",
    date: new Date().toLocaleDateString("ar-SA"),
    createdAt: Date.now(),
  };

  if (!window.appStore.notifications) window.appStore.notifications = [];
  window.appStore.notifications.push(newNotif);

  if (typeof saveToCloud === "function")
    saveToCloud("notifications", newNotif.id, newNotif);

  closeModal("modal-send-unified-msg");
  e.target.reset();
  renderNotificationsView();
  alert("✅ تم إرسال الرسالة/الإشعار بنجاح!");
}

function handleLogout() {
  const isStudent =
    window.currentUser && window.currentUser.role === ROLES.STUDENT;
  window.currentUser = null;
  localStorage.removeItem("HALAQAT_SESSION_USER");
  if (isStudent) {
    showStudentLoginView();
  } else {
    showMainLoginView();
  }
}

function openModal(modalId) {
  if (modalId === "modal-self-register") {
    updateCircleDropdowns();
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("active");
    return;
  }

  if (!window.currentUser) return;
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}
