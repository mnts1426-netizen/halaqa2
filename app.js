/**
 * ==========================================================================
 * app.js - المحرك الرئيسي للنظام وإدارة الصلاحيات الشاملة للمعلم والمدير والطالب
 * ==========================================================================
 */

window.currentUser = null;

// خريطة الصلاحيات البرمجية المعتمدة لكل دور
const ROLE_PERMISSIONS = {
  admin: [
    "view-dashboard",
    "view-students",
    "view-teachers",
    "view-circles",
    "view-attendance",
    "view-tasmeea",
    "view-tests",
    "view-reports",
    "view-notifications",
    "view-settings",
    "view-backup",
  ],
  teacher: [
    "view-dashboard",
    "view-circles",
    "view-students",
    "view-attendance",
    "view-tasmeea",
    "view-notifications",
    "view-settings",
  ],
  student: [
    "view-student-home",
    "view-student-lessons",
    "view-student-attendance",
    "view-notifications",
    "view-settings",
  ],
};

document.addEventListener("DOMContentLoaded", () => {
  checkSavedSession();

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
  if (typeof renderSettingsView === "function") renderSettingsView();
});

function checkSavedSession() {
  const savedUserStr = localStorage.getItem("HALAQAT_SESSION_USER");
  if (savedUserStr) {
    try {
      const user = JSON.parse(savedUserStr);
      doLogin(user, true);
    } catch (e) {
      showLoginView();
    }
  } else {
    showLoginView();
  }
}

function quickLogin(role) {
  let user = null;
  if (role === "admin") {
    user = window.appStore.users.find((u) => u.role === ROLES.ADMIN);
  } else if (role === "teacher") {
    user = window.appStore.users.find((u) => u.role === ROLES.TEACHER) || {
      id: "u_t1",
      teacherId: "t1",
      name: "الشيخ أحمد بن يوسف",
      phone: "0501234567",
      role: ROLES.TEACHER,
      username: "teacher1",
    };
  } else if (role === "student") {
    user = {
      id: "s1",
      name: "خالد بن سعد",
      phone: "0550001122",
      role: ROLES.STUDENT,
      username: "student",
      circleId: "c1",
    };
  }

  if (user) doLogin(user, false);
}

function handleLoginFormSubmit(e) {
  e.preventDefault();
  const userVal = document.getElementById("login-username").value;
  const passVal = document.getElementById("login-password").value;

  const foundUser = window.appStore.users.find(
    (u) => u.username === userVal && u.pass === passVal,
  );

  if (foundUser) {
    doLogin(foundUser, false);
  } else {
    alert("❌ اسم المستخدم أو كلمة المرور غير صحيحة!");
  }
}

function doLogin(user, isAutoSession = false) {
  window.currentUser = user;
  localStorage.setItem("HALAQAT_SESSION_USER", JSON.stringify(user));

  document.getElementById("view-login").classList.remove("active");
  document.getElementById("app-container").classList.remove("style-hidden");

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
          : "طالب";
  if (avatarEl) avatarEl.textContent = user.name ? user.name.charAt(0) : "أ";
  if (welcomeEl) welcomeEl.textContent = `أهلاً بك في جامع الهدى ${user.name}`;

  adjustSidebarAndViewsForRole(user.role);
}

function adjustSidebarAndViewsForRole(role) {
  const adminNav = document.querySelector(".role-section-admin");
  const studentNav = document.querySelector(".role-section-student");

  if (role === ROLES.STUDENT) {
    if (adminNav) adminNav.classList.add("style-hidden");
    if (studentNav) studentNav.classList.remove("style-hidden");

    navigateTo("view-student-home");
    renderStudentData();
  } else {
    if (studentNav) studentNav.classList.add("style-hidden");
    if (adminNav) adminNav.classList.remove("style-hidden");

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
    showLoginView();
    return;
  }

  const userRole = window.currentUser.role || "student";
  const allowedViews = ROLE_PERMISSIONS[userRole] || [];

  if (!allowedViews.includes(targetViewId)) {
    alert("⚠️ تنبيه أمني: لا تملك الصلاحية الكافية للوصول إلى هذه الشاشة.");
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

function renderStudentData() {
  if (!window.currentUser || window.currentUser.role !== ROLES.STUDENT) return;

  const studentId = window.currentUser.id;
  const studentName = window.currentUser.name;

  const welcomeTitle = document.getElementById("student-welcome-title");
  const tagName = document.getElementById("student-tag-name");
  if (welcomeTitle)
    welcomeTitle.textContent = `السلام عليكم ${studentName.split(" ")[0]}`;
  if (tagName) tagName.textContent = `أهلاً بك ${studentName}`;

  const studentTasmeea = (window.appStore.tasmeea || []).filter(
    (t) => t.studentId === studentId,
  );
  const studentAtt = (window.appStore.attendance || []).filter(
    (a) => a.studentId === studentId,
  );

  const stuCirclesEl = document.getElementById("stu-card-circles");
  if (stuCirclesEl)
    stuCirclesEl.textContent = window.currentUser.circleId ? "1" : "0";

  const stuRatingEl = document.getElementById("stu-card-rating");
  if (stuRatingEl) {
    const lastRecord = studentTasmeea[studentTasmeea.length - 1];
    stuRatingEl.textContent =
      lastRecord && lastRecord.rating ? lastRecord.rating : "-";
  }

  const stuAttEl = document.getElementById("stu-card-attendance");
  if (stuAttEl) {
    const totalDays = studentAtt.length;
    const presentDays = studentAtt.filter((a) => a.status === "present").length;
    const rate =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    stuAttEl.textContent = `${rate}%`;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const todayRecord = studentTasmeea.find((t) => t.date === todayStr);

  const todayBox = document.getElementById("stu-today-lesson-box");
  if (todayBox) {
    if (todayRecord) {
      todayBox.innerHTML = `
                <div class="lesson-detail-item text-right">
                    <p><strong>📖 الحفظ:</strong> ${todayRecord.hifzSurah ? `${todayRecord.hifzSurah} (${todayRecord.hifzFrom}-${todayRecord.hifzTo})` : "لم يسجل"}</p>
                    <p><strong>🔄 المراجعة:</strong> ${todayRecord.murajaaSurah ? `${todayRecord.murajaaSurah} (${todayRecord.murajaaFrom}-${todayRecord.murajaaTo})` : "لم يسجل"}</p>
                    <p><strong>🎧 التلاوة:</strong> ${todayRecord.tilawaSurah ? `${todayRecord.tilawaSurah} (${todayRecord.tilawaFrom}-${todayRecord.tilawaTo})` : "لم يسجل"}</p>
                    <p class="mt-2"><span class="badge badge-warning">التقدير: ${todayRecord.rating || "—"}</span></p>
                    ${todayRecord.studentNotes ? `<p class="text-muted mt-1">💬 ملاحظة المعلم: ${todayRecord.studentNotes}</p>` : ""}
                </div>
            `;
    } else {
      todayBox.innerHTML = `<p class="text-muted">لم يُسجَّل درس اليوم بعد</p>`;
    }
  }

  const nextBox = document.getElementById("stu-next-lesson-box");
  if (nextBox) {
    if (
      todayRecord &&
      (todayRecord.nextHifz ||
        todayRecord.nextMurajaa ||
        todayRecord.nextTilawa)
    ) {
      nextBox.innerHTML = `
                <div class="lesson-detail-item text-right">
                    <p><strong>📖 حفظ الغد:</strong> ${todayRecord.nextHifz || "—"}</p>
                    <p><strong>🔄 مراجعة الغد:</strong> ${todayRecord.nextMurajaa || "—"}</p>
                    <p><strong>🎧 تلاوة الغد:</strong> ${todayRecord.nextTilawa || "—"}</p>
                </div>
            `;
    } else {
      nextBox.innerHTML = `<p class="text-muted">لم تُحدَّد خطة الغد بعد</p>`;
    }
  }

  const lessonsContainer = document.getElementById("stu-lessons-container");
  if (lessonsContainer) {
    if (studentTasmeea.length > 0) {
      lessonsContainer.innerHTML = studentTasmeea
        .map(
          (t) => `
                <div class="card mb-3">
                    <div class="flex-between">
                        <strong>التاريخ: ${t.date}</strong>
                        <span class="badge badge-warning">${t.rating || "—"}</span>
                    </div>
                    <p class="mt-2">📖 الحفظ: ${t.hifzSurah ? `${t.hifzSurah} (${t.hifzFrom}-${t.hifzTo})` : "—"}</p>
                    <p>🔄 المراجعة: ${t.murajaaSurah ? `${t.murajaaSurah} (${t.murajaaFrom}-${t.murajaaTo})` : "—"}</p>
                    <p>🎧 التلاوة: ${t.tilawaSurah ? `${t.tilawaSurah} (${t.tilawaFrom}-${t.tilawaTo})` : "—"}</p>
                    ${t.studentNotes ? `<p class="text-muted mt-1">ملاحظة المعلم: ${t.studentNotes}</p>` : ""}
                </div>
            `,
        )
        .join("");
    } else {
      lessonsContainer.innerHTML = `<div class="empty-state-card"><p class="text-muted">لا توجد دروس مسجلة بعد</p></div>`;
    }
  }

  const attContainer = document.getElementById("stu-attendance-container");
  const attCountSub = document.getElementById("stu-att-days-count");
  if (attCountSub) attCountSub.textContent = `${studentAtt.length} يوم مسجل`;

  if (attContainer) {
    if (studentAtt.length > 0) {
      attContainer.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>الحالة</th>
                            <th>الملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studentAtt
                          .map(
                            (a) => `
                            <tr>
                                <td>${a.date}</td>
                                <td>${a.status === "present" ? "🟢 حاضر" : a.status === "absent" ? "🔴 غائب" : a.status === "late" ? "🟡 متأخر" : "🔵 مستأذن"}</td>
                                <td>${a.notes || "—"}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            `;
    } else {
      attContainer.innerHTML = `<div class="empty-state-card"><p class="text-muted">لا توجد سجلات حضور</p></div>`;
    }
  }

  // عرض لوحة التميز الخاصة بالطالب
  if (typeof renderTamayuzBoard === "function") renderTamayuzBoard();
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
        (c.teacherIds && c.teacherIds.includes(teacherId)) ||
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
  ];

  dropdownIds.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;

    const currentVal = select.value;
    let defaultText = "— اختر الحلقة —";
    if (id === "filter-student-circle" || id === "report-circle-select")
      defaultText = "كل الحلقات";

    let optionsHtml = `<option value="${id === "filter-student-circle" || id === "report-circle-select" ? "all" : ""}">${defaultText}</option>`;
    circlesList.forEach((c) => {
      optionsHtml += `<option value="${c.id}">${c.name}</option>`;
    });

    select.innerHTML = optionsHtml;
    if (currentVal) select.value = currentVal;
  });
}

function refreshAllViews() {
  updateCircleDropdowns();
  renderDashboardView();
  if (typeof renderStudentsTable === "function") renderStudentsTable();
  if (typeof renderTeachersTable === "function") renderTeachersTable();
  if (typeof renderCirclesCards === "function") renderCirclesCards();
  if (typeof renderTamayuzBoard === "function") renderTamayuzBoard();
  if (typeof renderTestsTable === "function") renderTestsTable();
}

function refreshActiveView(viewId) {
  updateCircleDropdowns();
  if (viewId === "view-dashboard") renderDashboardView();
  if (viewId === "view-students" && typeof renderStudentsTable === "function")
    renderStudentsTable();
  if (viewId === "view-teachers" && typeof renderTeachersTable === "function")
    renderTeachersTable();
  if (viewId === "view-circles" && typeof renderCirclesCards === "function")
    renderCirclesCards();
  if (
    viewId === "view-attendance" &&
    typeof renderAttendanceTable === "function"
  )
    renderAttendanceTable();
  if (viewId === "view-tests" && typeof renderTestsTable === "function")
    renderTestsTable();
  if (viewId === "view-settings" && typeof renderSettingsView === "function")
    renderSettingsView();
  if (viewId === "view-student-home") renderStudentData();
}

function renderDashboardView() {
  const user = window.currentUser;
  if (!user) return;

  const isTeacher = user.role === ROLES.TEACHER;
  const titleRole = document.getElementById("dash-title-role");
  const subTitle = document.getElementById("dash-sub-title");
  const teacherDashCols = document.getElementById("teacher-dash-columns");

  const todayStr = new Date().toISOString().split("T")[0];

  if (isTeacher) {
    if (titleRole)
      titleRole.textContent = `أهلاً الشيخ ${user.name.replace("الشيخ ", "")}`;
    if (subTitle) subTitle.textContent = "لوحة تحكم المعلم";

    if (teacherDashCols) teacherDashCols.style.display = "grid";

    const teacherObj =
      (window.appStore.teachers || []).find(
        (t) => t.userId === user.id || t.id === user.teacherId,
      ) || (window.appStore.teachers || [])[0];
    const teacherId = teacherObj ? teacherObj.id : "t1";

    const teacherCircles = (window.appStore.circles || []).filter(
      (c) =>
        (c.teacherIds && c.teacherIds.includes(teacherId)) ||
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

    const todayTasmeea = (window.appStore.tasmeea || []).filter(
      (t) => t.date === todayStr && teacherCircleIds.includes(t.circleId),
    );
    const studentsWithNextLesson = todayTasmeea
      .filter((t) => t.nextHifz || t.nextMurajaa || t.nextTilawa)
      .map((t) => t.studentId);
    const missingNextLessonCount =
      teacherStudents.length - studentsWithNextLesson.length;

    document.getElementById("lbl-stat-1").textContent = "حلقاتي";
    document.getElementById("val-stat-1").textContent = teacherCircles.length;

    document.getElementById("lbl-stat-2").textContent = "طلابي";
    document.getElementById("val-stat-2").textContent = teacherStudents.length;

    document.getElementById("lbl-stat-3").textContent = "غياب اليوم";
    document.getElementById("val-stat-3").textContent = absentCount;

    document.getElementById("lbl-stat-4").textContent = "بدون خطة الغد";
    document.getElementById("val-stat-4").textContent = Math.max(
      0,
      missingNextLessonCount,
    );

    const rightBoxTitle = document.getElementById("dash-right-box-title");
    const rightBoxContent = document.getElementById("dash-right-box-content");
    if (rightBoxTitle) rightBoxTitle.textContent = "حلقاتي";
    if (rightBoxContent) {
      if (teacherCircles.length === 0) {
        rightBoxContent.innerHTML = `<p class="text-muted p-3">لا توجد حلقات مكلف بها حالياً</p>`;
      } else {
        rightBoxContent.innerHTML = teacherCircles
          .map((c) => {
            const cStudents = teacherStudents.filter(
              (s) => s.circleId === c.id,
            );
            return `
                    <div class="teacher-status-item flex-between p-3 border-bottom mb-2" style="background: #FAF8F5; border-radius: 8px;">
                        <div>
                            <h4 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 2px;">${c.name}</h4>
                            <p class="text-muted" style="font-size: 0.85rem;">جامع الهدى . ${cStudents.length} طالب</p>
                        </div>
                        <span class="badge" style="background: #FFFFFF; border: 1px solid var(--border-color); color: var(--text-dark); padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                            ${cStudents.length} طلاب
                        </span>
                    </div>
                `;
          })
          .join("");
      }
    }

    const leftBoxTitle = document.getElementById("dash-left-box-title");
    const leftBoxContent = document.getElementById("dash-left-box-content");
    if (leftBoxTitle) leftBoxTitle.textContent = "جدول اليوم";
    if (leftBoxContent) {
      if (teacherCircles.length === 0) {
        leftBoxContent.innerHTML = `<p class="text-muted p-3">لا يوجد جدول لليوم</p>`;
      } else {
        leftBoxContent.innerHTML = teacherCircles
          .map((c) => {
            return `
                    <div class="teacher-status-item flex-between p-3 border-bottom mb-2" style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 8px;">
                        <div class="flex-align-gap">
                            <div class="avatar-sm" style="background: var(--primary-light); color: var(--primary-brown);">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
                            </div>
                            <div>
                                <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 2px;">${c.name}</h4>
                                <p class="text-muted" style="font-size: 0.8rem;">جامع الهدى</p>
                            </div>
                        </div>
                        <button class="btn btn-outline-brown btn-sm" onclick="navigateTo('view-tasmeea')">التسميع ←</button>
                    </div>
                `;
          })
          .join("");
      }
    }
  } else {
    if (titleRole) titleRole.textContent = "لوحة تحكم المدير";
    if (subTitle) subTitle.textContent = "مرحباً، اليوم 2026/8/5";

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
    const presentCount = todayAtt.filter((a) => a.status === "present").length;

    document.getElementById("lbl-stat-1").textContent = "الطلاب";
    document.getElementById("val-stat-1").textContent = studentsCount;

    document.getElementById("lbl-stat-2").textContent = "المعلمون";
    document.getElementById("val-stat-2").textContent = teachersCount;

    document.getElementById("lbl-stat-3").textContent = "الحلقات";
    document.getElementById("val-stat-3").textContent = circlesCount;

    document.getElementById("lbl-stat-4").textContent = "حاضرون اليوم";
    document.getElementById("val-stat-4").textContent = presentCount;
  }

  if (typeof renderTamayuzBoard === "function") renderTamayuzBoard();
}

// --------------------------------------------------------------------------
// إدارة شاشة الإعدادات، تعديل الملفات الشخصية، وموافقة المدير للطلاب
// --------------------------------------------------------------------------
function renderSettingsView() {
  const user = window.currentUser;
  if (!user) return;

  const nameInput = document.getElementById("set-profile-name");
  const phoneInput = document.getElementById("set-profile-phone");
  const passInput = document.getElementById("set-profile-password");
  const studentNote = document.getElementById("student-edit-note");
  const adminReqBox = document.getElementById("admin-profile-requests-box");

  if (nameInput) nameInput.value = user.name || "";
  if (phoneInput) phoneInput.value = user.phone || "";
  if (passInput) passInput.value = "";

  if (user.role === ROLES.STUDENT) {
    studentNote?.classList.remove("style-hidden");
    adminReqBox?.classList.add("style-hidden");
  } else if (user.role === ROLES.ADMIN) {
    studentNote?.classList.add("style-hidden");
    adminReqBox?.classList.remove("style-hidden");
    if (typeof renderProfileRequestsList === "function") {
      renderProfileRequestsList();
    }
  } else {
    studentNote?.classList.add("style-hidden");
    adminReqBox?.classList.add("style-hidden");
  }
}

function handleUserProfileSave(e) {
  e.preventDefault();
  const user = window.currentUser;
  if (!user) return;

  const newName = document.getElementById("set-profile-name")?.value.trim();
  const newPhone = document.getElementById("set-profile-phone")?.value.trim();
  const newPass = document.getElementById("set-profile-password")?.value.trim();

  if (user.role === ROLES.STUDENT) {
    // تحديث كلمة المرور مباشرة للطالب
    if (newPass) {
      const userRec = (window.appStore.users || []).find(
        (u) => u.id === user.id || u.username === user.username,
      );
      if (userRec) {
        userRec.pass = newPass;
        if (typeof saveToCloud === "function")
          saveToCloud("users", userRec.id, userRec);
      }
    }

    // إرسال طلب تعديل الاسم والجوال للمدير
    if (newName !== user.name || newPhone !== user.phone) {
      if (!window.appStore.profileRequests)
        window.appStore.profileRequests = [];
      const newReq = {
        id: "req_" + Date.now(),
        studentId: user.id,
        studentName: user.name,
        newName: newName,
        newPhone: newPhone,
        date: new Date().toLocaleDateString("ar-SA"),
        status: "pending",
      };

      window.appStore.profileRequests.push(newReq);
      if (typeof saveToCloud === "function")
        saveToCloud("profileRequests", newReq.id, newReq);
      alert(
        "✅ تم إرسال طلب تعديل بياناتك للمدير للموافقة عليها. تم تحديث كلمة المرور فوراً.",
      );
    } else {
      alert("✅ تم تحديث كلمة المرور بنجاح!");
    }
  } else if (user.role === ROLES.TEACHER) {
    // المعلم: تعديل مباشر دون موافقة
    user.name = newName;
    user.phone = newPhone;

    const teacherObj = (window.appStore.teachers || []).find(
      (t) => t.userId === user.id || t.id === user.teacherId,
    );
    if (teacherObj) {
      teacherObj.name = newName;
      teacherObj.phone = newPhone;
      if (typeof saveToCloud === "function")
        saveToCloud("teachers", teacherObj.id, teacherObj);
    }

    const userRec = (window.appStore.users || []).find(
      (u) => u.id === user.id || u.username === user.username,
    );
    if (userRec) {
      userRec.name = newName;
      if (newPass) userRec.pass = newPass;
      if (typeof saveToCloud === "function")
        saveToCloud("users", userRec.id, userRec);
    }

    localStorage.setItem("HALAQAT_SESSION_USER", JSON.stringify(user));
    document.getElementById("current-user-name").textContent = newName;
    alert("✅ تم حفظ وتحديث بيانات المعلم بنجاح!");
  } else {
    // المدير: تعديل مباشر
    user.name = newName;
    user.phone = newPhone;

    const userRec = (window.appStore.users || []).find(
      (u) => u.id === user.id || u.username === user.username,
    );
    if (userRec) {
      userRec.name = newName;
      if (newPass) userRec.pass = newPass;
      if (typeof saveToCloud === "function")
        saveToCloud("users", userRec.id, userRec);
    }

    localStorage.setItem("HALAQAT_SESSION_USER", JSON.stringify(user));
    document.getElementById("current-user-name").textContent = newName;
    alert("✅ تم حفظ وتحديث بيانات المدير بنجاح!");
  }
}

function openModalSendUnifiedMessage() {
  openModal("modal-send-unified-msg");
}

function handleSendUnifiedMessage(e) {
  e.preventDefault();
  const title = document.getElementById("msg-title").value;
  const body = document.getElementById("msg-body").value;
  const recipientType = document.getElementById("msg-target-recipient")
    ? document.getElementById("msg-target-recipient").value
    : "admin";

  let specificPersonId = "";
  if (
    recipientType === "specific_teacher" ||
    recipientType === "specific_student"
  ) {
    specificPersonId =
      document.getElementById("msg-specific-select")?.value || "";
  }

  const newNotif = {
    id: "notif_" + Date.now(),
    title: title,
    body: body,
    recipient: recipientType,
    targetId: specificPersonId,
    sender: window.currentUser ? window.currentUser.name : "المدير",
    date: new Date().toLocaleDateString("ar-SA"),
  };

  if (!window.appStore.notifications) window.appStore.notifications = [];
  window.appStore.notifications.push(newNotif);

  if (typeof saveToCloud === "function")
    saveToCloud("notifications", newNotif.id, newNotif);

  closeModal("modal-send-unified-msg");
  e.target.reset();
  alert("✅ تم إرسال الرسالة/الإشعار بنجاح!");
}

function handleNotificationPermissionChange(checkboxEl) {
  if (checkboxEl.checked) {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          alert("🔔 تم قبول وتفعيل إشعارات الهاتف والجهاز بنجاح!");
        } else {
          alert("⚠️ تم رفض إذن الإشعارات من المتصفح.");
          checkboxEl.checked = false;
        }
      });
    } else {
      alert("⚠️ المتصفح الحالي لا يدعم إشعارات الجهاز.");
      checkboxEl.checked = false;
    }
  }
}

function showLoginView() {
  document.getElementById("view-login").classList.add("active");
  document.getElementById("app-container").classList.add("style-hidden");
}

function handleLogout() {
  window.currentUser = null;
  localStorage.removeItem("HALAQAT_SESSION_USER");
  showLoginView();
}

function openModal(modalId) {
  if (modalId === "modal-self-register") {
    updateCircleDropdowns();
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("active");
    return;
  }

  if (!window.currentUser) return;

  if (
    window.currentUser.role !== "admin" &&
    [
      "modal-add-teacher",
      "modal-add-circle",
      "modal-add-test",
      "modal-excel-import",
    ].includes(modalId)
  ) {
    alert("⚠️ تنبيه: هذه الخاصية مقتصرة على مدير النظام فقط.");
    return;
  }

  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}
