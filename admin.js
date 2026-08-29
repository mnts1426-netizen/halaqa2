/**
 * ==========================================================================
 * admin.js - المحرك الإداري الشامل، شروط التميز الصارمة، والخريطة التفاعلية
 * ==========================================================================
 */

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
  settings: null,
};

// متغيرات الخريطة التفاعلية العصرية
window.mapPickerInstance = null;
window.mapPickerMarker = null;
window.mapPickerCircle = null;

document.addEventListener("DOMContentLoaded", () => {
  // ربط نماذج الإضافة الأساسية
  const formAddStudent = document.getElementById("form-add-student");
  if (formAddStudent) {
    formAddStudent.onsubmit = function (e) {
      if (e) e.preventDefault();
      handleAddStudent(e);
    };
  }

  const formAddTeacher = document.getElementById("form-add-teacher");
  if (formAddTeacher) {
    formAddTeacher.onsubmit = function (e) {
      if (e) e.preventDefault();
      handleAddTeacher(e);
    };
  }

  const formAddCircle = document.getElementById("form-add-circle");
  if (formAddCircle) {
    formAddCircle.onsubmit = function (e) {
      if (e) e.preventDefault();
      handleSaveCircle(e);
    };
  }

  const formAddTest = document.getElementById("form-add-test");
  if (formAddTest) {
    formAddTest.onsubmit = function (e) {
      if (e) e.preventDefault();
      handleSaveTest(e);
    };
  }

  // أحداث البحث والتصفية
  const searchStudents = document.getElementById("search-students");
  if (searchStudents) searchStudents.oninput = renderStudentsTable;

  const filterStudentCircle = document.getElementById("filter-student-circle");
  if (filterStudentCircle) filterStudentCircle.onchange = renderStudentsTable;

  const filterStudentStatus = document.getElementById("filter-student-status");
  if (filterStudentStatus) filterStudentStatus.onchange = renderStudentsTable;

  const searchTeachers = document.getElementById("search-teachers");
  if (searchTeachers) searchTeachers.oninput = renderTeachersTable;

  const searchCircles = document.getElementById("search-circles");
  if (searchCircles) searchCircles.oninput = renderCirclesCards;

  const searchAccounts = document.getElementById("search-accounts");
  if (searchAccounts) searchAccounts.oninput = renderAccountsTable;

  const filterAccountRole = document.getElementById("filter-account-role");
  if (filterAccountRole) filterAccountRole.onchange = renderAccountsTable;

  const filterAccountStatus = document.getElementById("filter-account-status");
  if (filterAccountStatus) filterAccountStatus.onchange = renderAccountsTable;

  const searchTests = document.getElementById("search-tests");
  if (searchTests) searchTests.oninput = renderTestsTable;

  const filterTestCircle = document.getElementById("filter-test-circle");
  if (filterTestCircle) filterTestCircle.onchange = renderTestsTable;

  const searchTeacherNotes = document.getElementById("search-teacher-notes");
  if (searchTeacherNotes) searchTeacherNotes.oninput = renderTeacherNotesTable;

  const filterTeacherNotesCircle = document.getElementById(
    "filter-teacher-notes-circle",
  );
  if (filterTeacherNotesCircle)
    filterTeacherNotesCircle.onchange = renderTeacherNotesTable;

  const attCircleSelect = document.getElementById("attendance-circle-select");
  if (attCircleSelect) attCircleSelect.onchange = renderAttendanceTable;

  const attDateSelect = document.getElementById("attendance-date-select");
  if (attDateSelect) {
    if (!attDateSelect.value)
      attDateSelect.value = new Date().toISOString().split("T")[0];
    attDateSelect.onchange = renderAttendanceTable;
  }

  const attSearchStudent = document.getElementById("search-attendance-student");
  if (attSearchStudent) attSearchStudent.oninput = renderAttendanceTable;

  renderExcelColumnMappingInputs();
});

// ==========================================================================
// 1. التنقل بين أقسام إدارة المَجْمَع (الحلقات، المعلمين، الطلاب)
// ==========================================================================
window.switchComplexSection = function (section) {
  const btnCircles = document.getElementById("hub-btn-circles");
  const btnTeachers = document.getElementById("hub-btn-teachers");
  const btnStudents = document.getElementById("hub-btn-students");

  const secCircles = document.getElementById("sec-complex-circles");
  const secTeachers = document.getElementById("sec-complex-teachers");
  const secStudents = document.getElementById("sec-complex-students");

  [btnCircles, btnTeachers, btnStudents].forEach((btn) => {
    if (btn) {
      btn.style.borderColor = "var(--border-color)";
      const h3 = btn.querySelector("h3");
      if (h3) h3.style.color = "var(--text-dark)";
    }
  });

  [secCircles, secTeachers, secStudents].forEach((sec) => {
    if (sec) {
      sec.classList.add("style-hidden");
      sec.style.display = "none";
    }
  });

  if (section === "circles") {
    if (btnCircles) {
      btnCircles.style.borderColor = "var(--primary-brown)";
      const h3 = btnCircles.querySelector("h3");
      if (h3) h3.style.color = "var(--primary-brown)";
    }
    if (secCircles) {
      secCircles.classList.remove("style-hidden");
      secCircles.style.display = "block";
    }
    renderCirclesCards();
  } else if (section === "teachers") {
    if (btnTeachers) {
      btnTeachers.style.borderColor = "var(--primary-brown)";
      const h3 = btnTeachers.querySelector("h3");
      if (h3) h3.style.color = "var(--primary-brown)";
    }
    if (secTeachers) {
      secTeachers.classList.remove("style-hidden");
      secTeachers.style.display = "block";
    }
    renderTeachersTable();
  } else if (section === "students") {
    if (btnStudents) {
      btnStudents.style.borderColor = "var(--primary-brown)";
      const h3 = btnStudents.querySelector("h3");
      if (h3) h3.style.color = "var(--primary-brown)";
    }
    if (secStudents) {
      secStudents.classList.remove("style-hidden");
      secStudents.style.display = "block";
    }
    renderStudentsTable();
  }
};

// ==========================================================================
// 2. إدارة الحلقات (إضافة وتعديل وحذف)
// ==========================================================================
window.renderCirclesCards = function () {
  const container = document.getElementById("circles-cards-container");
  if (!container) return;

  const searchVal = (document.getElementById("search-circles")?.value || "")
    .trim()
    .toLowerCase();
  let circlesList = window.appStore?.circles || [];

  const filtered = circlesList.filter(
    (c) => c.name && c.name.toLowerCase().includes(searchVal),
  );

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card" style="grid-column: 1 / -1; padding: 2.5rem; text-align: center;">
        <h3>لا توجد حلقات مضافة بعد</h3>
        <p class="text-muted">اضغط على زر (إضافة حلقة جديدة) لإنشاء الحلقة الأولى بالمَجْمَع</p>
      </div>
    `;
    return;
  }

  let html = "";
  filtered.forEach((circle) => {
    let assignedTeachers = [];
    if (Array.isArray(circle.teacherIds) && circle.teacherIds.length > 0) {
      assignedTeachers = (window.appStore?.teachers || []).filter((t) =>
        circle.teacherIds.includes(t.id),
      );
    } else if (circle.teacherId) {
      const singleTeacher = (window.appStore?.teachers || []).find(
        (t) => t.id === circle.teacherId,
      );
      if (singleTeacher) assignedTeachers.push(singleTeacher);
    }

    const teacherNamesStr =
      assignedTeachers.length > 0
        ? assignedTeachers.map((t) => t.name).join(" ، ")
        : "غير معين";
    const circleStudents = (window.appStore?.students || []).filter(
      (s) => s.circleId === circle.id && s.status === "active",
    );

    html += `
      <div class="circle-card" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem;">
        <div class="circle-header flex-between mb-2">
          <div class="circle-title">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--primary-brown); margin-bottom: 2px;">${circle.name}</h3>
            <p class="text-muted" style="font-size: 0.82rem; margin: 0;">جامع الهدى</p>
          </div>
          <span class="badge badge-active">${circle.status || "نشطة"}</span>
        </div>

        <div class="circle-stats-row flex-between p-2 mb-2" style="background: #faf8f5; border-radius: 6px;">
          <div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--primary-brown);">${circleStudents.length}</div>
            <div style="font-size: 0.75rem; color: #666;">عدد الطلاب</div>
          </div>
          <div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #0b6b7d;">${assignedTeachers.length}</div>
            <div style="font-size: 0.75rem; color: #666;">عدد المعلمين</div>
          </div>
        </div>

        <div class="circle-teacher-info mb-3" style="font-size: 0.85rem;">
          <strong>المعلمون:</strong> <span class="text-muted">${teacherNamesStr}</span>
        </div>

        <div class="circle-card-actions flex-align-gap">
          <button class="btn btn-outline-brown btn-sm" style="flex: 1;" onclick="openModalEditCircle('${circle.id}')">تعديل</button>
          <button class="btn btn-danger btn-sm" style="flex: 1;" onclick="deleteCircle('${circle.id}')">حذف</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
};

window.openModalAddCircle = function () {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  const titleEl = document.getElementById("modal-circle-title");
  if (titleEl) titleEl.textContent = "إضافة حلقة جديدة بالمَجْمَع";

  setVal("edit-circle-id", "");
  setVal("circle-name", "");
  setVal("search-modal-teachers", "");
  setVal("search-modal-students", "");

  populateCircleTeachersList([]);
  populateCircleStudentsList([]);

  openModal("modal-add-circle");
};

window.openModalEditCircle = function (circleId) {
  const circle = (window.appStore?.circles || []).find(
    (c) => c.id === circleId,
  );
  if (!circle) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  const titleEl = document.getElementById("modal-circle-title");
  if (titleEl) titleEl.textContent = `تعديل حلقة: ${circle.name}`;

  setVal("edit-circle-id", circle.id);
  setVal("circle-name", circle.name);
  setVal("search-modal-teachers", "");
  setVal("search-modal-students", "");

  const currentTeacherIds =
    circle.teacherIds || (circle.teacherId ? [circle.teacherId] : []);
  const currentStudents = (window.appStore?.students || [])
    .filter((s) => s.circleId === circleId)
    .map((s) => s.id);

  populateCircleTeachersList(currentTeacherIds);
  populateCircleStudentsList(currentStudents);

  openModal("modal-add-circle");
};

window.populateCircleTeachersList = function (selectedIds = []) {
  const container = document.getElementById("circle-teachers-list");
  if (!container) return;

  const teachers = window.appStore?.teachers || [];
  if (teachers.length === 0) {
    container.innerHTML =
      '<p class="text-muted p-2" style="font-size:0.85rem;">لا يوجد معلمون مسجلون بعد</p>';
    return;
  }

  let html = "";
  teachers.forEach((t) => {
    const isChecked = selectedIds.includes(t.id) ? "checked" : "";
    html += `
      <label class="checkbox-item-row p-1 mb-1" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.88rem;">
        <input type="checkbox" name="circle_teachers" value="${t.id}" ${isChecked}>
        <span>${t.name}</span>
      </label>
    `;
  });
  container.innerHTML = html;
};

window.populateCircleStudentsList = function (selectedStudentIds = []) {
  const container = document.getElementById("circle-students-list");
  if (!container) return;

  const students = (window.appStore?.students || []).filter(
    (s) => s.status === "active",
  );
  if (students.length === 0) {
    container.innerHTML =
      '<p class="text-muted p-2" style="font-size:0.85rem;">لا يوجد طلاب نشطون مسجلون</p>';
    return;
  }

  let html = "";
  students.forEach((s) => {
    const isChecked = selectedStudentIds.includes(s.id) ? "checked" : "";
    html += `
      <label class="checkbox-item-row p-1 mb-1" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.88rem;">
        <input type="checkbox" name="circle_students" value="${s.id}" ${isChecked}>
        <span>${s.name}</span>
      </label>
    `;
  });
  container.innerHTML = html;
};

window.filterCircleModalTeachers = function () {
  const q = (document.getElementById("search-modal-teachers")?.value || "")
    .trim()
    .toLowerCase();
  document
    .querySelectorAll("#circle-teachers-list .checkbox-item-row")
    .forEach((el) => {
      el.style.display = el.textContent.toLowerCase().includes(q)
        ? "flex"
        : "none";
    });
};

window.filterCircleModalStudents = function () {
  const q = (document.getElementById("search-modal-students")?.value || "")
    .trim()
    .toLowerCase();
  document
    .querySelectorAll("#circle-students-list .checkbox-item-row")
    .forEach((el) => {
      el.style.display = el.textContent.toLowerCase().includes(q)
        ? "flex"
        : "none";
    });
};

window.handleSaveCircle = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const editId = document.getElementById("edit-circle-id")?.value;
  const name = (document.getElementById("circle-name")?.value || "").trim();

  if (!name) {
    alert("يرجى إدخال اسم الحلقة.");
    return;
  }

  const selectedTeachers = [];
  document
    .querySelectorAll('input[name="circle_teachers"]:checked')
    .forEach((cb) => {
      selectedTeachers.push(cb.value);
    });

  const selectedStudents = [];
  document
    .querySelectorAll('input[name="circle_students"]:checked')
    .forEach((cb) => {
      selectedStudents.push(cb.value);
    });

  if (!window.appStore.circles) window.appStore.circles = [];

  if (editId) {
    const circle = window.appStore.circles.find((c) => c.id === editId);
    if (circle) {
      circle.name = name;
      circle.teacherIds = selectedTeachers;
      circle.teacherId = selectedTeachers[0] || "";
      if (typeof saveToCloud === "function")
        saveToCloud("circles", circle.id, circle);
    }

    (window.appStore?.students || []).forEach((s) => {
      if (selectedStudents.includes(s.id)) {
        s.circleId = editId;
        if (typeof saveToCloud === "function") saveToCloud("students", s.id, s);
      } else if (s.circleId === editId) {
        s.circleId = "";
        if (typeof saveToCloud === "function") saveToCloud("students", s.id, s);
      }
    });

    alert("✅ تم تعديل بيانات الحلقة بنجاح!");
  } else {
    const newCircleId = "c_" + Date.now();
    const newCircle = {
      id: newCircleId,
      name: name,
      mosque: "جامع الهدى",
      teacherIds: selectedTeachers,
      teacherId: selectedTeachers[0] || "",
      status: "نشطة",
      createdAt: Date.now(),
    };

    window.appStore.circles.push(newCircle);
    if (typeof saveToCloud === "function")
      saveToCloud("circles", newCircle.id, newCircle);

    (window.appStore?.students || []).forEach((s) => {
      if (selectedStudents.includes(s.id)) {
        s.circleId = newCircleId;
        if (typeof saveToCloud === "function") saveToCloud("students", s.id, s);
      }
    });

    alert("✅ تم إنشاء الحلقة بنجاح!");
  }

  if (typeof saveLocalStore === "function") saveLocalStore();
  closeModal("modal-add-circle");
  renderCirclesCards();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
};

window.deleteCircle = function (circleId) {
  const circle = (window.appStore?.circles || []).find(
    (c) => c.id === circleId,
  );
  if (!circle) return;

  if (!confirm(`هل أنت متأكد من حذف حلقة (${circle.name}) نهائياً؟`)) return;

  window.appStore.circles = (window.appStore.circles || []).filter(
    (c) => c.id !== circleId,
  );

  (window.appStore?.students || []).forEach((s) => {
    if (s.circleId === circleId) {
      s.circleId = "";
      if (typeof saveToCloud === "function") saveToCloud("students", s.id, s);
    }
  });

  if (typeof saveToCloud === "function")
    saveToCloud("circles", circleId, null, true);
  if (typeof saveLocalStore === "function") saveLocalStore();

  alert(`✅ تم حذف حلقة (${circle.name}) بنجاح!`);
  renderCirclesCards();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
};

// ==========================================================================
// 3. إدارة المعلمين (إضافة وتعديل وصلاحية المسؤول المالي)
// ==========================================================================
window.switchTeacherSubTab = function (tab) {
  const btnList = document.getElementById("tab-btn-teachers-list");
  const btnAtt = document.getElementById("tab-btn-teachers-attendance");
  const boxList = document.getElementById("box-teachers-list-table");
  const boxAtt = document.getElementById("box-teachers-attendance-table");

  if (tab === "list") {
    btnList?.classList.add("active");
    btnAtt?.classList.remove("active");
    if (boxList) {
      boxList.classList.remove("style-hidden");
      boxList.style.display = "block";
    }
    if (boxAtt) {
      boxAtt.classList.add("style-hidden");
      boxAtt.style.display = "none";
    }
    renderTeachersTable();
  } else {
    btnAtt?.classList.add("active");
    btnList?.classList.remove("active");
    if (boxAtt) {
      boxAtt.classList.remove("style-hidden");
      boxAtt.style.display = "block";
    }
    if (boxList) {
      boxList.classList.add("style-hidden");
      boxList.style.display = "none";
    }
    renderTeachersAttendanceTable();
  }
};

window.renderTeachersTable = function () {
  const tbody = document.getElementById("teachers-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("search-teachers")?.value || "")
    .trim()
    .toLowerCase();
  const teachers = window.appStore?.teachers || [];

  const filtered = teachers.filter(
    (t) =>
      (t.name && t.name.toLowerCase().includes(searchVal)) ||
      (t.phone && String(t.phone).includes(searchVal)),
  );

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center text-muted p-4">لا يوجد معلمون مسجلون</td></tr>';
    return;
  }

  let html = "";
  filtered.forEach((t) => {
    const teacherCircles = (window.appStore?.circles || []).filter(
      (c) =>
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(t.id)) ||
        c.teacherId === t.id,
    );
    const circleNamesStr =
      teacherCircles.length > 0
        ? teacherCircles.map((c) => c.name).join(" ، ")
        : "غير مكلف";
    const financeBadge = t.isFinance
      ? '<span class="badge" style="background:#0b6b7d; color:#fff; margin-right:4px;">مسؤول مالي</span>'
      : "";

    html += `
      <tr>
        <td style="font-weight: 700;">${t.name} ${financeBadge}</td>
        <td>${t.phone || "—"}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circleNamesStr}</span></td>
        <td dir="ltr" class="text-muted" style="text-align: right;">${t.lastLogin || "لم يدخل بعد"}</td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline-brown btn-sm" onclick="openModalEditTeacher('${t.id}')">تعديل</button>
            <button class="btn ${t.status === "suspended" ? "btn-success" : "btn-danger"} btn-sm" onclick="toggleTeacherStatus('${t.id}')">
              ${t.status === "suspended" ? "تفعيل" : "إيقاف"}
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteTeacher('${t.id}')">حذف</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

window.openModalAddTeacher = function () {
  const nameEl = document.getElementById("teach-name");
  const phoneEl = document.getElementById("teach-phone");
  const finCb = document.getElementById("add-teach-is-finance");
  if (nameEl) nameEl.value = "";
  if (phoneEl) phoneEl.value = "";
  if (finCb) finCb.checked = false;

  const container = document.getElementById(
    "teacher-circles-checkbox-container",
  );
  if (container) {
    let html = "";
    (window.appStore?.circles || []).forEach((c) => {
      html += `
        <label class="checkbox-item-row p-1 mb-1" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.88rem;">
          <input type="checkbox" name="teacher_circles" value="${c.id}">
          <span>${c.name}</span>
        </label>
      `;
    });
    container.innerHTML =
      html ||
      '<p class="text-muted p-2" style="font-size:0.85rem;">لا توجد حلقات معرفة</p>';
  }

  openModal("modal-add-teacher");
};

window.handleAddTeacher = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const name = (document.getElementById("teach-name")?.value || "").trim();
  const phone = (document.getElementById("teach-phone")?.value || "").trim();
  const isFinance = Boolean(
    document.getElementById("add-teach-is-finance")?.checked,
  );

  if (!name || !phone) {
    alert("يرجى إدخال اسم المعلم ورقم الجوال.");
    return;
  }

  const selectedCircles = [];
  document
    .querySelectorAll('input[name="teacher_circles"]:checked')
    .forEach((cb) => {
      selectedCircles.push(cb.value);
    });

  const newTeacherId = "t_" + Date.now();
  const newTeacher = {
    id: newTeacherId,
    userId: "u_t_" + Date.now(),
    name: name,
    phone: phone,
    isFinance: isFinance,
    status: "active",
    lastLogin: "لم يدخل بعد",
    createdAt: Date.now(),
  };

  if (!window.appStore.teachers) window.appStore.teachers = [];
  window.appStore.teachers.push(newTeacher);

  if (!window.appStore.users) window.appStore.users = [];
  window.appStore.users.push({
    id: newTeacher.userId,
    name: name,
    phone: phone,
    role: "teacher",
    username: phone,
    pass: "1234",
    status: "active",
    createdAt: Date.now(),
  });

  (window.appStore?.circles || []).forEach((c) => {
    if (selectedCircles.includes(c.id)) {
      if (!Array.isArray(c.teacherIds)) c.teacherIds = [];
      if (!c.teacherIds.includes(newTeacherId)) c.teacherIds.push(newTeacherId);
      if (!c.teacherId) c.teacherId = newTeacherId;
      if (typeof saveToCloud === "function") saveToCloud("circles", c.id, c);
    }
  });

  if (typeof saveToCloud === "function") {
    saveToCloud("teachers", newTeacher.id, newTeacher);
    saveToCloud("users", newTeacher.userId, {
      id: newTeacher.userId,
      name: name,
      phone: phone,
      role: "teacher",
      username: phone,
      pass: "1234",
      status: "active",
    });
  }

  if (typeof saveLocalStore === "function") saveLocalStore();
  closeModal("modal-add-teacher");
  alert(
    "✅ تم إضافة المعلم وتكليفه بالحلقات بنجاح! (الرقم السري الافتراضي: 1234)",
  );
  renderTeachersTable();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
};

window.openModalEditTeacher = function (teacherId) {
  const teacher = (window.appStore?.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : "";
  };

  setVal("edit-teach-id", teacher.id);
  setVal("edit-teach-name", teacher.name);
  setVal("edit-teach-phone", teacher.phone || "");

  const userRec = (window.appStore?.users || []).find(
    (u) =>
      u.id === teacher.userId ||
      u.id === teacher.id ||
      u.username === teacher.phone,
  );
  setVal("edit-teach-password", userRec ? userRec.pass : "1234");

  const finCb = document.getElementById("edit-teach-is-finance");
  if (finCb) finCb.checked = Boolean(teacher.isFinance);

  const container = document.getElementById(
    "edit-teacher-circles-checkbox-container",
  );
  if (container) {
    let html = "";
    (window.appStore?.circles || []).forEach((c) => {
      const isChecked =
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(teacher.id)) ||
        c.teacherId === teacher.id
          ? "checked"
          : "";
      html += `
        <label class="checkbox-item-row p-1 mb-1" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.88rem;">
          <input type="checkbox" name="edit_teacher_circles" value="${c.id}" ${isChecked}>
          <span>${c.name}</span>
        </label>
      `;
    });
    container.innerHTML =
      html ||
      '<p class="text-muted p-2" style="font-size:0.85rem;">لا توجد حلقات معرفة</p>';
  }

  openModal("modal-edit-teacher");
};

window.handleSaveTeacherEdit = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const teacherId = document.getElementById("edit-teach-id")?.value;
  const teacher = (window.appStore?.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  const name = (document.getElementById("edit-teach-name")?.value || "").trim();
  const phone = (
    document.getElementById("edit-teach-phone")?.value || ""
  ).trim();
  const password = (
    document.getElementById("edit-teach-password")?.value || "1234"
  ).trim();
  const isFinance = Boolean(
    document.getElementById("edit-teach-is-finance")?.checked,
  );

  if (!name || !phone) {
    alert("يرجى إدخال اسم المعلم ورقم الجوال.");
    return;
  }

  const selectedCircles = [];
  document
    .querySelectorAll('input[name="edit_teacher_circles"]:checked')
    .forEach((cb) => {
      selectedCircles.push(cb.value);
    });

  teacher.name = name;
  teacher.phone = phone;
  teacher.isFinance = isFinance;

  let userRec = (window.appStore?.users || []).find(
    (u) =>
      u.id === teacher.userId ||
      u.id === teacher.id ||
      u.username === teacher.phone,
  );
  if (userRec) {
    userRec.name = name;
    userRec.phone = phone;
    userRec.username = phone;
    userRec.pass = password || "1234";
    if (typeof saveToCloud === "function")
      saveToCloud("users", userRec.id, userRec);
  } else {
    userRec = {
      id: teacher.userId || "u_" + teacher.id,
      name: name,
      phone: phone,
      role: "teacher",
      username: phone,
      pass: password || "1234",
      status: teacher.status || "active",
      createdAt: Date.now(),
    };
    if (!window.appStore.users) window.appStore.users = [];
    window.appStore.users.push(userRec);
    teacher.userId = userRec.id;
    if (typeof saveToCloud === "function")
      saveToCloud("users", userRec.id, userRec);
  }

  if (typeof saveToCloud === "function")
    saveToCloud("teachers", teacher.id, teacher);

  (window.appStore?.circles || []).forEach((c) => {
    if (!Array.isArray(c.teacherIds)) c.teacherIds = [];
    if (selectedCircles.includes(c.id)) {
      if (!c.teacherIds.includes(teacher.id)) c.teacherIds.push(teacher.id);
      if (!c.teacherId) c.teacherId = teacher.id;
    } else {
      c.teacherIds = c.teacherIds.filter((id) => id !== teacher.id);
      if (c.teacherId === teacher.id) c.teacherId = c.teacherIds[0] || "";
    }
    if (typeof saveToCloud === "function") saveToCloud("circles", c.id, c);
  });

  if (typeof saveLocalStore === "function") saveLocalStore();
  closeModal("modal-edit-teacher");
  alert("✅ تم اعتماد وتحديث بيانات المعلم بنجاح!");
  renderTeachersTable();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
};

window.deleteTeacher = function (teacherId) {
  const teacher = (window.appStore?.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  if (
    !confirm(`هل أنت متأكد من حذف المعلم (${teacher.name}) نهائياً من النظام؟`)
  )
    return;

  window.appStore.teachers = (window.appStore.teachers || []).filter(
    (t) => t.id !== teacherId,
  );
  window.appStore.users = (window.appStore.users || []).filter(
    (u) => u.id !== teacher.userId && u.id !== teacher.id,
  );

  (window.appStore?.circles || []).forEach((c) => {
    if (Array.isArray(c.teacherIds) && c.teacherIds.includes(teacherId)) {
      c.teacherIds = c.teacherIds.filter((id) => id !== teacherId);
      if (c.teacherId === teacherId) c.teacherId = c.teacherIds[0] || "";
      if (typeof saveToCloud === "function") saveToCloud("circles", c.id, c);
    }
  });

  if (typeof saveToCloud === "function") {
    saveToCloud("teachers", teacherId, null, true);
    if (teacher.userId) saveToCloud("users", teacher.userId, null, true);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  alert(`✅ تم حذف المعلم (${teacher.name}) بنجاح!`);
  renderTeachersTable();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
};

window.toggleTeacherStatus = function (teacherId) {
  const teacher = (window.appStore?.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  teacher.status = teacher.status === "active" ? "suspended" : "active";
  if (typeof saveToCloud === "function")
    saveToCloud("teachers", teacher.id, teacher);

  const userRec = (window.appStore?.users || []).find(
    (u) => u.id === teacher.userId || u.id === teacher.id,
  );
  if (userRec) {
    userRec.status = teacher.status;
    if (typeof saveToCloud === "function")
      saveToCloud("users", userRec.id, userRec);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  renderTeachersTable();
};

window.renderTeachersAttendanceTable = function () {
  const tbody = document.getElementById("teachers-attendance-table-body");
  if (!tbody) return;

  const dateVal =
    document.getElementById("teacher-attendance-date-select")?.value ||
    new Date().toISOString().split("T")[0];
  const searchVal = (
    document.getElementById("search-teacher-attendance")?.value || ""
  )
    .trim()
    .toLowerCase();

  const teachers = window.appStore?.teachers || [];
  const filtered = teachers.filter(
    (t) => t.name && t.name.toLowerCase().includes(searchVal),
  );

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-muted p-3">لا يوجد معلمون مطابقون</td></tr>';
    return;
  }

  let html = "";
  filtered.forEach((t, idx) => {
    const record =
      (window.appStore?.teacherAttendance || []).find(
        (a) => a.teacherId === t.id && a.date === dateVal,
      ) || {};
    const circles = (window.appStore?.circles || []).filter(
      (c) =>
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(t.id)) ||
        c.teacherId === t.id,
    );
    const circleNames = circles.map((c) => c.name).join(" ، ") || "غير مكلف";

    html += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: 700;">${t.name}</td>
        <td>${t.phone || "—"}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circleNames}</span></td>
        <td>${record.time ? `🕒 ${record.time}` : '<span class="text-muted">لم يحضر ذاتياً</span>'}</td>
        <td>
          <select class="form-control" style="font-weight: 700;" onchange="setTeacherAttendanceByAdmin('${t.id}', this.value)">
            <option value="" ${!record.status ? "selected" : ""}>— لم يحدد —</option>
            <option value="present" ${record.status === "present" ? "selected" : ""}>🟢 حاضر</option>
            <option value="absent" ${record.status === "absent" ? "selected" : ""}>🔴 غائب</option>
            <option value="excused" ${record.status === "excused" ? "selected" : ""}>🔵 مستأذن</option>
          </select>
        </td>
        <td>
          <input type="text" class="form-control" placeholder="ملاحظة..." value="${record.notes || ""}" onchange="updateTeacherAttendanceNotes('${t.id}', this.value)">
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

window.setTeacherAttendanceByAdmin = function (teacherId, status) {
  const dateVal =
    document.getElementById("teacher-attendance-date-select")?.value ||
    new Date().toISOString().split("T")[0];
  const recordId = `t_att_${teacherId}_${dateVal}`;

  if (!window.appStore.teacherAttendance)
    window.appStore.teacherAttendance = [];
  let record = window.appStore.teacherAttendance.find((a) => a.id === recordId);

  if (!record) {
    record = {
      id: recordId,
      teacherId: teacherId,
      date: dateVal,
      status: status,
      notes: "رصد من المدير",
      updatedBy: "admin",
      createdAt: Date.now(),
    };
    window.appStore.teacherAttendance.push(record);
  } else {
    record.status = status;
    record.updatedBy = "admin";
  }

  if (typeof saveToCloud === "function")
    saveToCloud("teacherAttendance", record.id, record);
  if (typeof saveLocalStore === "function") saveLocalStore();
};

window.updateTeacherAttendanceNotes = function (teacherId, notesVal) {
  const dateVal =
    document.getElementById("teacher-attendance-date-select")?.value ||
    new Date().toISOString().split("T")[0];
  const recordId = `t_att_${teacherId}_${dateVal}`;

  let record = (window.appStore?.teacherAttendance || []).find(
    (a) => a.id === recordId,
  );
  if (record) {
    record.notes = notesVal;
    if (typeof saveToCloud === "function")
      saveToCloud("teacherAttendance", record.id, record);
    if (typeof saveLocalStore === "function") saveLocalStore();
  }
};

// ==========================================================================
// 4. إدارة الطلاب (إضافة وتعديل واستيراد وحذف جماعي)
// ==========================================================================
window.switchStudentSubTab = function (tab) {
  const btnActive = document.getElementById("tab-btn-active-students");
  const btnPending = document.getElementById("tab-btn-pending-requests");
  const boxActive = document.getElementById("box-active-students-table");
  const boxPending = document.getElementById("box-pending-requests-table");

  if (tab === "active") {
    btnActive?.classList.add("active");
    btnPending?.classList.remove("active");
    if (boxActive) {
      boxActive.classList.remove("style-hidden");
      boxActive.style.display = "block";
    }
    if (boxPending) {
      boxPending.classList.add("style-hidden");
      boxPending.style.display = "none";
    }
    renderStudentsTable();
  } else {
    btnPending?.classList.add("active");
    btnActive?.classList.remove("active");
    if (boxPending) {
      boxPending.classList.remove("style-hidden");
      boxPending.style.display = "block";
    }
    if (boxActive) {
      boxActive.classList.add("style-hidden");
      boxActive.style.display = "none";
    }
    renderPendingRequestsTable();
  }
};

window.renderStudentsTable = function () {
  const tbody = document.getElementById("students-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("search-students")?.value || "")
    .trim()
    .toLowerCase();
  const circleFilter =
    document.getElementById("filter-student-circle")?.value || "all";
  const statusFilter =
    document.getElementById("filter-student-status")?.value || "active";

  const studentsList = (window.appStore?.students || []).filter(
    (s) => s.status !== "pending",
  );

  const filtered = studentsList.filter((s) => {
    const matchesSearch =
      (s.name && s.name.toLowerCase().includes(searchVal)) ||
      (s.nationalId && String(s.nationalId).includes(searchVal)) ||
      (s.phone && String(s.phone).includes(searchVal)) ||
      (s.parentPhone && String(s.parentPhone).includes(searchVal));

    const matchesCircle = circleFilter === "all" || s.circleId === circleFilter;
    const matchesStatus = s.status === statusFilter;
    return matchesSearch && matchesCircle && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" class="text-center text-muted p-4">لا يوجد طلاب مطابقون للبحث</td></tr>';
    updatePendingBadgeCount();
    return;
  }

  let html = "";
  filtered.forEach((s) => {
    const circle = (window.appStore?.circles || []).find(
      (c) => c.id === s.circleId,
    );
    const circleName = circle ? circle.name : "غير مسجل";

    html += `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" class="student-row-cb" value="${s.id}" onchange="handleStudentRowSelectionChange()">
        </td>
        <td style="font-weight: 700;">${s.name}</td>
        <td>${s.nationalId || "—"}</td>
        <td>${s.phone || "—"}</td>
        <td>${s.parentName || "—"}</td>
        <td>${s.parentRelation || "—"}</td>
        <td style="color: var(--primary-brown); font-weight: 700;">${s.parentPhone || "—"}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circleName}</span></td>
        <td>
          <span class="badge ${s.status === "active" ? "badge-active" : "badge-danger"}">
            ${s.status === "active" ? "نشط" : "موقوف"}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline-brown btn-sm" onclick="openModalEditStudentComprehensive('${s.id}')">تعديل</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">حذف</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  updatePendingBadgeCount();
};

window.handleAddStudent = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const name = (document.getElementById("stu-name")?.value || "").trim();
  const nationalId = (document.getElementById("stu-id")?.value || "").trim();
  const phone = (document.getElementById("stu-phone")?.value || "").trim();
  const parentName = (
    document.getElementById("stu-parent-name")?.value || ""
  ).trim();
  const parentRelation = (
    document.getElementById("stu-parent-relation")?.value || "أب"
  ).trim();
  const parentPhone = (
    document.getElementById("stu-parent-phone")?.value || ""
  ).trim();
  const circleId = document.getElementById("stu-circle")?.value || "";

  if (!name) {
    alert("يرجى إدخال اسم الطالب.");
    return;
  }

  const newStudent = {
    id: "s_" + Date.now(),
    name: name,
    nationalId: nationalId,
    phone: phone,
    parentName: parentName,
    parentRelation: parentRelation,
    parentPhone: parentPhone,
    circleId: circleId,
    status: "active",
    createdAt: Date.now(),
  };

  if (!window.appStore.students) window.appStore.students = [];
  window.appStore.students.push(newStudent);

  if (!window.appStore.users) window.appStore.users = [];
  window.appStore.users.push({
    id: newStudent.id,
    name: name,
    phone: phone || parentPhone,
    role: "student",
    username: nationalId || phone || newStudent.id,
    pass: "1111",
    status: "active",
    createdAt: Date.now(),
  });

  if (typeof saveToCloud === "function") {
    saveToCloud("students", newStudent.id, newStudent);
    saveToCloud("users", newStudent.id, {
      id: newStudent.id,
      name: name,
      phone: phone || parentPhone,
      role: "student",
      username: nationalId || phone || newStudent.id,
      pass: "1111",
      status: "active",
    });
  }

  if (typeof saveLocalStore === "function") saveLocalStore();
  closeModal("modal-add-student");
  e.target?.reset();
  alert("✅ تم إضافة الطالب بنجاح! (الرقم السري الافتراضي: 1111)");
  renderStudentsTable();
};

window.openModalEditStudentComprehensive = function (studentId) {
  const student = (window.appStore?.students || []).find(
    (s) => s.id === studentId,
  );
  if (!student) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : "";
  };

  setVal("edit-comp-stu-id", student.id);
  setVal("edit-comp-name", student.name);
  setVal("edit-comp-national-id", student.nationalId);
  setVal("edit-comp-phone", student.phone);
  setVal("edit-comp-parent-name", student.parentName);
  setVal("edit-comp-parent-relation", student.parentRelation || "أب");
  setVal("edit-comp-parent-phone", student.parentPhone);
  setVal("edit-comp-status", student.status || "active");

  const userRec = (window.appStore?.users || []).find(
    (u) => u.id === student.id,
  );
  setVal("edit-comp-password", userRec ? userRec.pass : "1111");

  const circleSelect = document.getElementById("edit-comp-circle");
  if (circleSelect) {
    let opts = '<option value="">— غير مسجل بحلقة —</option>';
    (window.appStore?.circles || []).forEach((c) => {
      opts += `<option value="${c.id}" ${c.id === student.circleId ? "selected" : ""}>${c.name}</option>`;
    });
    circleSelect.innerHTML = opts;
  }

  openModal("modal-edit-student-comprehensive");
};

window.handleSaveStudentComprehensive = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const studentId = document.getElementById("edit-comp-stu-id")?.value;
  const student = (window.appStore?.students || []).find(
    (s) => s.id === studentId,
  );
  if (!student) return;

  student.name = (
    document.getElementById("edit-comp-name")?.value || ""
  ).trim();
  student.nationalId = (
    document.getElementById("edit-comp-national-id")?.value || ""
  ).trim();
  student.phone = (
    document.getElementById("edit-comp-phone")?.value || ""
  ).trim();
  student.parentName = (
    document.getElementById("edit-comp-parent-name")?.value || ""
  ).trim();
  student.parentRelation = (
    document.getElementById("edit-comp-parent-relation")?.value || "أب"
  ).trim();
  student.parentPhone = (
    document.getElementById("edit-comp-parent-phone")?.value || ""
  ).trim();
  student.circleId = document.getElementById("edit-comp-circle")?.value || "";
  student.status =
    document.getElementById("edit-comp-status")?.value || "active";
  const password = (
    document.getElementById("edit-comp-password")?.value || "1111"
  ).trim();

  let userRec = (window.appStore?.users || []).find((u) => u.id === student.id);
  if (userRec) {
    userRec.name = student.name;
    userRec.phone = student.phone || student.parentPhone;
    userRec.username = student.nationalId || student.phone || student.id;
    userRec.status = student.status;
    userRec.pass = password || "1111";
    if (typeof saveToCloud === "function")
      saveToCloud("users", userRec.id, userRec);
  } else {
    userRec = {
      id: student.id,
      name: student.name,
      phone: student.phone || student.parentPhone,
      role: "student",
      username: student.nationalId || student.phone || student.id,
      pass: password || "1111",
      status: student.status,
      createdAt: Date.now(),
    };
    if (!window.appStore.users) window.appStore.users = [];
    window.appStore.users.push(userRec);
    if (typeof saveToCloud === "function")
      saveToCloud("users", userRec.id, userRec);
  }

  if (typeof saveToCloud === "function")
    saveToCloud("students", student.id, student);
  if (typeof saveLocalStore === "function") saveLocalStore();

  closeModal("modal-edit-student-comprehensive");
  alert("✅ تم اعتماد وتحديث بيانات الطالب بنجاح!");
  renderStudentsTable();
};

window.deleteStudent = function (studentId) {
  const student = (window.appStore?.students || []).find(
    (s) => s.id === studentId,
  );
  if (!student) return;

  if (!confirm(`هل أنت متأكد من حذف الطالب (${student.name}) نهائياً؟`)) return;

  window.appStore.students = (window.appStore.students || []).filter(
    (s) => s.id !== studentId,
  );
  window.appStore.users = (window.appStore.users || []).filter(
    (u) => u.id !== studentId,
  );

  if (typeof saveToCloud === "function") {
    saveToCloud("students", studentId, null, true);
    saveToCloud("users", studentId, null, true);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  alert(`✅ تم حذف الطالب (${student.name}) بنجاح!`);
  renderStudentsTable();
};

window.toggleSelectAllStudents = function (masterCb) {
  document.querySelectorAll(".student-row-cb").forEach((cb) => {
    cb.checked = masterCb.checked;
  });
  handleStudentRowSelectionChange();
};

window.handleStudentRowSelectionChange = function () {
  const selectedCount = document.querySelectorAll(
    ".student-row-cb:checked",
  ).length;
  const badge = document.getElementById("selected-students-count");
  if (badge) badge.textContent = selectedCount;
};

window.openBulkCircleModal = function (actionType) {
  const selected = Array.from(
    document.querySelectorAll(".student-row-cb:checked"),
  ).map((cb) => cb.value);
  if (selected.length === 0) {
    alert("⚠️ يرجى تحديد طالب واحد على الأقل من الجدول أولاً!");
    return;
  }
  const typeEl = document.getElementById("bulk-circle-action-type");
  const descEl = document.getElementById("bulk-circle-desc");
  if (typeEl) typeEl.value = actionType;
  if (descEl)
    descEl.textContent =
      actionType === "transfer"
        ? "اختر الحلقة المراد نقل الطلاب إليها:"
        : "اختر الحلقة المراد إضافة الطلاب إليها:";

  openModal("modal-bulk-circle");
};

window.handleBulkCircleSubmit = function (e) {
  if (e && e.preventDefault) e.preventDefault();
  const circleId = document.getElementById("bulk-target-circle")?.value;
  if (!circleId) {
    alert("⚠️ يرجى اختيار الحلقة المستهدفة!");
    return;
  }

  const selectedIds = Array.from(
    document.querySelectorAll(".student-row-cb:checked"),
  ).map((cb) => cb.value);
  (window.appStore?.students || []).forEach((s) => {
    if (selectedIds.includes(s.id)) {
      s.circleId = circleId;
      if (typeof saveToCloud === "function") saveToCloud("students", s.id, s);
    }
  });

  if (typeof saveLocalStore === "function") saveLocalStore();
  closeModal("modal-bulk-circle");
  alert(`✅ تم تعيين (${selectedIds.length}) طالب في الحلقة المحددة بنجاح!`);
  renderStudentsTable();
};

window.executeBulkDeleteStudents = function () {
  const selectedIds = Array.from(
    document.querySelectorAll(".student-row-cb:checked"),
  ).map((cb) => cb.value);
  if (selectedIds.length === 0) {
    alert("⚠️ يرجى تحديد الطلاب المراد حذفهم أولاً!");
    return;
  }

  if (!confirm(`هل أنت متأكد من حذف (${selectedIds.length}) طالب نهائياً؟`))
    return;

  window.appStore.students = (window.appStore.students || []).filter(
    (s) => !selectedIds.includes(s.id),
  );
  window.appStore.users = (window.appStore.users || []).filter(
    (u) => !selectedIds.includes(u.id),
  );

  selectedIds.forEach((id) => {
    if (typeof saveToCloud === "function") {
      saveToCloud("students", id, null, true);
      saveToCloud("users", id, null, true);
    }
  });

  if (typeof saveLocalStore === "function") saveLocalStore();
  alert("✅ تم حذف الطلاب المحددين بنجاح!");
  renderStudentsTable();
};

// ==========================================================================
// 5. استيراد الطلاب من Excel (7 أعمدة القياسية والرقم السري 1111)
// ==========================================================================
const STANDARD_7_COLUMNS = [
  { key: "name", label: "1. اسم الطالب" },
  { key: "nationalId", label: "2. رقم الهوية" },
  { key: "phone", label: "3. جوال الطالب" },
  { key: "parentName", label: "4. اسم ولي الأمر" },
  { key: "parentRelation", label: "5. صلة القرابة" },
  { key: "parentPhone", label: "6. جوال ولي الأمر" },
  { key: "circleName", label: "7. اسم الحلقة" },
];

window.renderExcelColumnMappingInputs = function () {
  const container = document.getElementById("excel-columns-mapping-container");
  if (!container) return;

  container.innerHTML = STANDARD_7_COLUMNS.map(
    (col) => `
    <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem; font-size: 0.85rem;">
      <strong style="color: var(--primary-brown);">${col.label}</strong>
    </div>
  `,
  ).join("");
};

window.executeDynamicExcelImport = function () {
  const fileInput = document.getElementById("excel-dynamic-file");
  const file = fileInput?.files?.[0];
  if (!file) {
    alert("⚠️ يرجى اختيار ملف Excel أولاً!");
    return;
  }

  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير محملة!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (!rows || rows.length <= 1) {
        alert("⚠️ الملف فارغ أو لا يحتوي على صفوف بيانات كافية!");
        return;
      }

      if (!window.appStore.students) window.appStore.students = [];
      if (!window.appStore.users) window.appStore.users = [];

      let importedCount = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[0]) continue;

        const name = String(row[0] || "").trim();
        const nationalId = String(row[1] || "").trim();
        const phone = String(row[2] || "").trim();
        const parentName =
          String(row[3] || "").trim() || `ولي أمر ${name.split(" ")[0]}`;
        const parentRelation = String(row[4] || "أب").trim();
        const parentPhone = String(row[5] || "").trim();
        const circleNameInput = String(row[6] || "").trim();

        let targetCircleId = "";
        if (circleNameInput) {
          const matchCircle = (window.appStore.circles || []).find(
            (c) => c.name.trim() === circleNameInput,
          );
          if (matchCircle) {
            targetCircleId = matchCircle.id;
          } else {
            targetCircleId = "c_" + Date.now() + "_" + i;
            window.appStore.circles.push({
              id: targetCircleId,
              name: circleNameInput,
              mosque: "جامع الهدى",
              teacherIds: [],
              teacherId: "",
              status: "نشطة",
              createdAt: Date.now(),
            });
          }
        }

        const newStudent = {
          id: "s_imp_" + Date.now() + "_" + i,
          name: name,
          nationalId: nationalId,
          phone: phone,
          parentName: parentName,
          parentRelation: parentRelation,
          parentPhone: parentPhone,
          circleId: targetCircleId,
          status: "active",
          createdAt: Date.now(),
        };

        window.appStore.students.push(newStudent);
        window.appStore.users.push({
          id: newStudent.id,
          name: name,
          phone: phone || parentPhone,
          role: "student",
          username: nationalId || phone || newStudent.id,
          pass: "1111",
          status: "active",
          createdAt: Date.now(),
        });

        if (typeof saveToCloud === "function") {
          saveToCloud("students", newStudent.id, newStudent);
        }
        importedCount++;
      }

      if (typeof saveLocalStore === "function") saveLocalStore();
      closeModal("modal-excel-import");
      fileInput.value = "";
      alert(
        `✅ تم استيراد (${importedCount}) طالب بنجاح! تم تعيين الرقم السري 1111 للجميع.`,
      );
      renderStudentsTable();
      if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
    } catch (err) {
      alert("❌ حدث خطأ أثناء قراءة ملف Excel: " + err.message);
    }
  };

  reader.readAsArrayBuffer(file);
};

// ==========================================================================
// 6. شاشة إدارة الحسابات
// ==========================================================================
window.renderAccountsTable = function () {
  const tbody = document.getElementById("accounts-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("search-accounts")?.value || "")
    .trim()
    .toLowerCase();
  const roleFilter =
    document.getElementById("filter-account-role")?.value || "all";
  const statusFilter =
    document.getElementById("filter-account-status")?.value || "all";

  const users = window.appStore?.users || [];
  const filtered = users.filter((u) => {
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(searchVal)) ||
      (u.username && String(u.username).includes(searchVal)) ||
      (u.phone && String(u.phone).includes(searchVal));

    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    let matchesStatus = true;
    if (statusFilter === "active") matchesStatus = u.status === "active";
    else if (statusFilter === "suspended")
      matchesStatus = u.status === "suspended" || u.status === "archived";

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted p-4">لا توجد حسابات مطابقة</td></tr>';
    return;
  }

  let html = "";
  filtered.forEach((u, idx) => {
    const roleBadge =
      u.role === "admin"
        ? '<span class="badge" style="background:#805333; color:#fff;">مدير</span>'
        : u.role === "teacher"
          ? '<span class="badge" style="background:#0b6b7d; color:#fff;">معلم</span>'
          : u.role === "screen"
            ? '<span class="badge" style="background:#2e7d32; color:#fff;">التميز الأسبوعي</span>'
            : '<span class="badge badge-warning">طالب</span>';

    const isActive = u.status === "active";

    html += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: 700;">${u.name}</td>
        <td>${roleBadge}</td>
        <td><code>${u.username}</code></td>
        <td><span class="badge ${isActive ? "badge-active" : "badge-danger"}">${isActive ? "نشط" : "موقوف"}</span></td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline-brown btn-sm" onclick="openModalEditUserAccount('${u.id}')">تعديل</button>
            <button class="btn ${isActive ? "btn-danger" : "btn-success"} btn-sm" onclick="toggleUserAccountStatus('${u.id}')">
              ${isActive ? "إيقاف" : "تفعيل"}
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

window.openModalEditUserAccount = function (userId) {
  const user = (window.appStore?.users || []).find((u) => u.id === userId);
  if (!user) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : "";
  };

  setVal("edit-account-user-id", user.id);
  setVal("edit-account-name", user.name);
  setVal("edit-account-username", user.username || "");
  setVal(
    "edit-account-password",
    user.pass || (user.role === "student" ? "1111" : "1234"),
  );

  openModal("modal-edit-user-account");
};

window.handleSaveUserAccount = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const id = document.getElementById("edit-account-user-id")?.value;
  const user = (window.appStore?.users || []).find((u) => u.id === id);
  if (!user) return;

  user.name = (
    document.getElementById("edit-account-name")?.value || ""
  ).trim();
  user.username = (
    document.getElementById("edit-account-username")?.value || ""
  ).trim();
  const newPass = (
    document.getElementById("edit-account-password")?.value ||
    (user.role === "student" ? "1111" : "1234")
  ).trim();
  if (newPass) user.pass = newPass;

  if (user.role === "student") {
    const stu = (window.appStore?.students || []).find((s) => s.id === user.id);
    if (stu) {
      stu.name = user.name;
      if (typeof saveToCloud === "function")
        saveToCloud("students", stu.id, stu);
    }
  } else if (user.role === "teacher") {
    const teach = (window.appStore?.teachers || []).find(
      (t) => t.userId === user.id || t.id === user.id,
    );
    if (teach) {
      teach.name = user.name;
      teach.phone = user.username;
      if (typeof saveToCloud === "function")
        saveToCloud("teachers", teach.id, teach);
    }
  }

  if (typeof saveToCloud === "function") saveToCloud("users", user.id, user);
  if (typeof saveLocalStore === "function") saveLocalStore();

  closeModal("modal-edit-user-account");
  alert("✅ تم حفظ وتأكيد تعديلات الحساب بنجاح!");
  renderAccountsTable();
};

window.toggleUserAccountStatus = function (userId) {
  const user = (window.appStore?.users || []).find((u) => u.id === userId);
  if (!user) return;

  if (
    user.role === "admin" &&
    window.currentUser &&
    window.currentUser.id === userId
  ) {
    alert("⚠️ لا يمكن إيقاف حساب المدير المسجل به حالياً.");
    return;
  }

  user.status = user.status === "active" ? "suspended" : "active";
  if (typeof saveToCloud === "function") saveToCloud("users", user.id, user);

  if (user.role === "student") {
    const stu = (window.appStore?.students || []).find((s) => s.id === userId);
    if (stu) {
      stu.status = user.status === "active" ? "active" : "archived";
      if (typeof saveToCloud === "function")
        saveToCloud("students", stu.id, stu);
    }
  } else if (user.role === "teacher") {
    const teach = (window.appStore?.teachers || []).find(
      (t) => t.userId === userId || t.id === userId,
    );
    if (teach) {
      teach.status = user.status;
      if (typeof saveToCloud === "function")
        saveToCloud("teachers", teach.id, teach);
    }
  }

  if (typeof saveLocalStore === "function") saveLocalStore();
  renderAccountsTable();
};

// ==========================================================================
// 7. شاشات التحضير وملاحظات المعلمين
// ==========================================================================
window.renderAttendanceTable = function () {
  const tbody = document.getElementById("attendance-table-body");
  if (!tbody) return;

  const circleId = document.getElementById("attendance-circle-select")?.value;
  const dateVal = document.getElementById("attendance-date-select")?.value;
  const searchVal = (
    document.getElementById("search-attendance-student")?.value || ""
  )
    .trim()
    .toLowerCase();

  if (!circleId) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center text-muted p-4">يرجى اختيار الحلقة لعرض كشف التحضير</td></tr>';
    return;
  }

  let students = (window.appStore?.students || []).filter(
    (s) => s.circleId === circleId && s.status === "active",
  );
  if (searchVal)
    students = students.filter(
      (s) => s.name && s.name.toLowerCase().includes(searchVal),
    );

  if (students.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center text-muted p-4">لا يوجد طلاب في هذه الحلقة</td></tr>';
    return;
  }

  let html = "";
  students.forEach((s) => {
    const record =
      (window.appStore?.attendance || []).find(
        (a) => a.studentId === s.id && a.date === dateVal,
      ) || {};
    const curStatus = record.status || "";

    html += `
      <tr>
        <td style="font-weight: 700;">${s.name}</td>
        <td>${getCircleName(s.circleId)}</td>
        <td>
          <select class="form-control" style="font-weight: 700;" onchange="setStudentAttendance('${s.id}', this.value)">
            <option value="" ${curStatus === "" ? "selected" : ""}>— غير محدد —</option>
            <option value="present" ${curStatus === "present" ? "selected" : ""}>🟢 حاضر</option>
            <option value="absent" ${curStatus === "absent" ? "selected" : ""}>🔴 غائب</option>
            <option value="late" ${curStatus === "late" ? "selected" : ""}>🟡 متأخر</option>
            <option value="excused" ${curStatus === "excused" ? "selected" : ""}>🔵 مستأذن</option>
          </select>
        </td>
        <td>
          <input type="text" class="form-control" placeholder="ملاحظة..." value="${record.notes || ""}" onchange="updateAttendanceNotes('${s.id}', this.value)">
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

window.setStudentAttendance = function (studentId, status) {
  const dateVal = document.getElementById("attendance-date-select")?.value;
  const circleId = document.getElementById("attendance-circle-select")?.value;
  const recordId = `att_${studentId}_${dateVal}`;

  if (!window.appStore.attendance) window.appStore.attendance = [];
  let record = window.appStore.attendance.find((a) => a.id === recordId);

  if (!record) {
    record = {
      id: recordId,
      studentId: studentId,
      circleId: circleId || "",
      date: dateVal,
      status: status,
      notes: "",
    };
    window.appStore.attendance.push(record);
  } else {
    record.status = status;
    if (circleId) record.circleId = circleId;
  }

  if (typeof saveToCloud === "function")
    saveToCloud("attendance", record.id, record);
  if (typeof saveLocalStore === "function") saveLocalStore();
};

window.updateAttendanceNotes = function (studentId, notesVal) {
  const dateVal = document.getElementById("attendance-date-select")?.value;
  const recordId = `att_${studentId}_${dateVal}`;

  let record = (window.appStore?.attendance || []).find(
    (a) => a.id === recordId,
  );
  if (record) {
    record.notes = notesVal;
    if (typeof saveToCloud === "function")
      saveToCloud("attendance", record.id, record);
    if (typeof saveLocalStore === "function") saveLocalStore();
  }
};

window.markAllAbsent = function () {
  const circleId = document.getElementById("attendance-circle-select")?.value;
  if (!circleId) {
    alert("⚠️ يرجى اختيار الحلقة أولاً!");
    return;
  }
  const students = (window.appStore?.students || []).filter(
    (s) => s.circleId === circleId && s.status === "active",
  );
  students.forEach((s) => setStudentAttendance(s.id, "absent"));
  renderAttendanceTable();
  alert("✅ تم تحديد جميع طلاب الحلقة كـ (غائب)!");
};

window.renderTeacherNotesTable = function () {
  const tbody = document.getElementById("teacher-notes-table-body");
  if (!tbody) return;

  const searchVal = (
    document.getElementById("search-teacher-notes")?.value || ""
  )
    .trim()
    .toLowerCase();
  const circleFilter =
    document.getElementById("filter-teacher-notes-circle")?.value || "all";

  const records = (window.appStore?.tasmeea || []).filter(
    (t) => t.adminNotes && t.adminNotes.trim() !== "",
  );
  records.sort(
    (a, b) =>
      (b.date || "").localeCompare(a.date || "") ||
      (b.updatedAt || 0) - (a.updatedAt || 0),
  );

  const filtered = records.filter((t) => {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === t.studentId,
    );
    const matchesSearch =
      (student && student.name.toLowerCase().includes(searchVal)) ||
      t.adminNotes.toLowerCase().includes(searchVal);
    const matchesCircle = circleFilter === "all" || t.circleId === circleFilter;
    return matchesSearch && matchesCircle;
  });

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted p-4">لا توجد ملاحظات موجهة للإدارة</td></tr>';
    return;
  }

  let html = "";
  filtered.forEach((t, idx) => {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === t.studentId,
    );
    const circle = (window.appStore?.circles || []).find(
      (c) => c.id === t.circleId,
    );
    let teacherName = "—";
    if (circle) {
      const teach = (window.appStore?.teachers || []).find(
        (tc) =>
          (Array.isArray(circle.teacherIds) &&
            circle.teacherIds.includes(tc.id)) ||
          circle.teacherId === tc.id,
      );
      if (teach) teacherName = teach.name;
    }

    html += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${t.date || "—"}</td>
        <td style="font-weight: 700;">${teacherName}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circle ? circle.name : "—"}</span></td>
        <td style="font-weight: 700; color: var(--primary-brown);">${student ? student.name : "طالب"}</td>
        <td style="white-space: normal; line-height: 1.6;">${t.adminNotes}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

// ==========================================================================
// 8. شاشة الاختبارات (إضافة وعرض وحذف)
// ==========================================================================
window.renderTestsTable = function () {
  const tbody = document.getElementById("tests-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("search-tests")?.value || "")
    .trim()
    .toLowerCase();
  const circleFilter =
    document.getElementById("filter-test-circle")?.value || "all";

  const tests = window.appStore?.tests || [];
  const filtered = tests.filter((t) => {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === t.studentId,
    );
    const matchesSearch =
      (student && student.name.toLowerCase().includes(searchVal)) ||
      (t.type && t.type.toLowerCase().includes(searchVal));
    const matchesCircle = circleFilter === "all" || t.circleId === circleFilter;
    return matchesSearch && matchesCircle;
  });

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-muted p-4">لا توجد اختبارات مسجلة</td></tr>';
    return;
  }

  let html = "";
  filtered.forEach((t) => {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === t.studentId,
    );
    const circle = (window.appStore?.circles || []).find(
      (c) => c.id === t.circleId,
    );

    html += `
      <tr>
        <td style="font-weight: 700;">${student ? student.name : "طالب"}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circle ? circle.name : "—"}</span></td>
        <td>${t.type || "—"}</td>
        <td style="font-weight: 700; color: var(--primary-brown);">${t.score || "0"} / 100</td>
        <td><span class="badge badge-active">${t.rating || "—"}</span></td>
        <td>${t.date || "—"}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteTest('${t.id}')">حذف</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

window.openModalAddTest = function () {
  const circleSelect = document.getElementById("test-circle-select");
  if (circleSelect) {
    let opts = '<option value="">— اختر الحلقة —</option>';
    (window.appStore?.circles || []).forEach((c) => {
      opts += `<option value="${c.id}">${c.name}</option>`;
    });
    circleSelect.innerHTML = opts;
    circleSelect.value = "";
  }

  const stuSelect = document.getElementById("test-student-select");
  if (stuSelect) {
    stuSelect.innerHTML = '<option value="">— اختر الطالب —</option>';
    stuSelect.value = "";
  }

  const typeInput = document.getElementById("test-type");
  if (typeInput) typeInput.value = "";

  const scoreInput = document.getElementById("test-score");
  if (scoreInput) scoreInput.value = "100";

  const ratingSelect = document.getElementById("test-rating");
  if (ratingSelect) ratingSelect.value = "ممتاز";

  openModal("modal-add-test");
};

window.populateTestStudentsDropdown = function () {
  const circleId = document.getElementById("test-circle-select")?.value;
  const stuSelect = document.getElementById("test-student-select");
  if (!stuSelect) return;

  let opts = '<option value="">— اختر الطالب —</option>';
  const list = circleId
    ? (window.appStore?.students || []).filter(
        (s) => s.circleId === circleId && s.status === "active",
      )
    : (window.appStore?.students || []).filter((s) => s.status === "active");

  list.forEach((s) => {
    opts += `<option value="${s.id}">${s.name}</option>`;
  });
  stuSelect.innerHTML = opts;
};

window.handleSaveTest = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const circleId = document.getElementById("test-circle-select")?.value || "";
  const studentId = document.getElementById("test-student-select")?.value || "";
  const type = (document.getElementById("test-type")?.value || "").trim();
  const score = document.getElementById("test-score")?.value || "100";
  const rating = document.getElementById("test-rating")?.value || "ممتاز";

  if (!circleId || !studentId || !type) {
    alert("يرجى اختيار الحلقة، الطالب، ونوع الاختبار.");
    return;
  }

  const newTest = {
    id: "test_" + Date.now(),
    circleId,
    studentId,
    type,
    score,
    rating,
    date: new Date().toISOString().split("T")[0],
    createdAt: Date.now(),
  };

  if (!window.appStore.tests) window.appStore.tests = [];
  window.appStore.tests.push(newTest);

  if (typeof saveToCloud === "function")
    saveToCloud("tests", newTest.id, newTest);
  if (typeof saveLocalStore === "function") saveLocalStore();

  closeModal("modal-add-test");
  alert("✅ تم حفظ الاختبار بنجاح!");
  renderTestsTable();
};

window.deleteTest = function (testId) {
  if (!confirm("هل أنت متأكد من حذف هذا الاختبار؟")) return;

  window.appStore.tests = (window.appStore.tests || []).filter(
    (t) => t.id !== testId,
  );
  if (typeof saveToCloud === "function")
    saveToCloud("tests", testId, null, true);
  if (typeof saveLocalStore === "function") saveLocalStore();

  renderTestsTable();
};

// ==========================================================================
// 9. لوحة فرسان التميز والتميز الأسبوعي (شروط صارمة: حضور 4 أيام + ممتاز فقط أو فارغ)
// ==========================================================================
function getSundayToWednesdayDatesForWeek(weekOption = "current") {
  const now = new Date();
  const dayOfWeek = now.getDay();

  let offsetWeeks = 0;
  if (weekOption === "w_1") offsetWeeks = 1;
  else if (weekOption === "w_2") offsetWeeks = 2;
  else if (weekOption === "w_3") offsetWeeks = 3;
  else if (weekOption === "w_4") offsetWeeks = 4;

  const sunday = new Date(now);
  sunday.setDate(now.getDate() - dayOfWeek - offsetWeeks * 7);

  const days = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${day}`);
  }
  return days;
}

function isStudentTamayuzForWeek(studentId, weekOption = "current") {
  const weekDays = getSundayToWednesdayDatesForWeek(weekOption);
  if (!weekDays || weekDays.length !== 4) return false;

  const isCleanMumtazOrEmpty = (r) => {
    if (!r) return true;
    const clean = String(r).trim();
    if (clean === "" || clean === "—" || clean === "-" || clean === "لا يوجد")
      return true;
    return clean.includes("ممتاز");
  };

  for (const day of weekDays) {
    // الشرط 1: الحضور الكامل لجميع الأيام الأربعة (الأحد، الاثنين، الثلاثاء، الأربعاء)
    const att = (window.appStore?.attendance || []).find(
      (a) => a.studentId === studentId && a.date === day,
    );
    if (!att || (att.status !== "present" && att.status !== "late")) {
      return false; // غائب أو غير محضر في أي يوم -> استبعاد فوري
    }

    // الشرط 2: ممتاز فقط في جميع المقررات أو لا يوجد
    const tasm = (window.appStore?.tasmeea || []).find(
      (t) => t.studentId === studentId && t.date === day,
    );
    if (tasm) {
      if (
        !isCleanMumtazOrEmpty(tasm.hifzRating) ||
        !isCleanMumtazOrEmpty(tasm.murajaaRating) ||
        !isCleanMumtazOrEmpty(tasm.tilawaRating) ||
        !isCleanMumtazOrEmpty(tasm.rating)
      ) {
        return false; // حصل على تقييم غير ممتاز في أي مقرر -> استبعاد فوري
      }
    }
  }

  return true;
}

window.getQualifyingTamayuzStudents = function (weekOption = "current") {
  const activeStudents = (window.appStore?.students || []).filter(
    (s) => s.status === "active",
  );

  const qualifying = activeStudents.filter((s) =>
    isStudentTamayuzForWeek(s.id, weekOption),
  );

  const savedOrder = window.appStore?.screenOrder || [];
  if (savedOrder.length > 0) {
    qualifying.sort((a, b) => {
      const idxA = savedOrder.indexOf(a.id);
      const idxB = savedOrder.indexOf(b.id);
      if (idxA > -1 && idxB > -1) return idxA - idxB;
      if (idxA > -1) return -1;
      if (idxB > -1) return 1;
      return 0;
    });
  }

  return qualifying;
};

window.renderTamayuzBoard = function () {
  const tbody = document.getElementById("tamayuz-students-body");
  if (!tbody) return;

  const weekFilter =
    document.getElementById("tamayuz-week-filter")?.value || "current";
  const qualifyingStudents = getQualifyingTamayuzStudents(weekFilter);

  if (qualifyingStudents.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted p-4">
          لا يوجد طلاب متميزون لهذا الأسبوع (يشترط حضور 4 أيام كاملة من الأحد إلى الأربعاء والحصول على ممتاز في جميع المقررات)
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  qualifyingStudents.forEach((stu, idx) => {
    const circle = (window.appStore?.circles || []).find(
      (c) => c.id === stu.circleId,
    );
    const circleName = circle ? circle.name : "جامع الهدى";
    const isFirst = idx === 0;

    html += `
      <tr>
        <td style="font-weight: 800;">${isFirst ? "🏆 " : "⭐ "}${stu.name}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circleName}</span></td>
        <td><span class="badge badge-active">100% (حضور 4 / 4 أيام)</span></td>
        <td><span class="badge badge-active">متقن (ممتاز)</span></td>
        <td><span class="badge" style="background:#805333; color:#fff;">${isFirst ? "المركز الأول 🏆" : `متميز #${idx + 1}`}</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

window.renderScreenView = function () {
  const grid = document.getElementById("mosque-screen-grid");
  const tbody = document.getElementById("screen-manage-table-body");

  const students = getQualifyingTamayuzStudents("current");

  if (grid) {
    if (students.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-card" style="grid-column:1/-1; padding:2.5rem; text-align:center; background:#fff; border-radius:10px;">
          <h3>لوحة فرسان التميز الأسبوعي</h3>
          <p class="text-muted">لا يوجد طلاب حققوا شروط التميز لهذا الأسبوع حتى الآن (حضور 4 أيام من الأحد للأربعاء وتقييم ممتاز)</p>
        </div>
      `;
    } else {
      let gridHtml = "";
      students.forEach((stu, idx) => {
        const circle = (window.appStore?.circles || []).find(
          (c) => c.id === stu.circleId,
        );
        const circleName = circle ? circle.name : "جامع الهدى";
        const isFirst = idx === 0;

        gridHtml += `
          <div class="card" style="text-align: center; border: ${isFirst ? "2px solid var(--primary-brown)" : "1px solid var(--border-color)"}; background: ${isFirst ? "#faf3eb" : "#fff"}; border-radius: 10px; padding: 1.25rem;">
            <div style="font-size: 1.6rem; font-weight: 900; color: var(--primary-brown); margin-bottom: 0.4rem;">
              #${idx + 1} ${isFirst ? "🏆" : "⭐"}
            </div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-dark); margin-bottom: 4px;">${stu.name}</h3>
            <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 8px;">حلقة: ${circleName}</p>
            <div style="display: flex; justify-content: center; gap: 0.4rem;">
              <span class="badge badge-active">حضور 4 أيام</span>
              <span class="badge badge-active">ممتاز</span>
            </div>
          </div>
        `;
      });
      grid.innerHTML = gridHtml;
    }
  }

  if (tbody) {
    if (students.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted p-3">لا يوجد طلاب متميزون حالياً للترتيب</td></tr>';
    } else {
      let tbodyHtml = "";
      students.forEach((stu, idx) => {
        const circle = (window.appStore?.circles || []).find(
          (c) => c.id === stu.circleId,
        );
        const circleName = circle ? circle.name : "جامع الهدى";

        tbodyHtml += `
          <tr>
            <td style="text-align: center; font-weight: 800;">${idx + 1} ${idx === 0 ? "🏆" : ""}</td>
            <td style="font-weight: 700;">${stu.name}</td>
            <td>${circleName}</td>
            <td><span class="badge badge-active">متميز (حضور 100% وممتاز)</span></td>
            <td style="text-align: center;">
              <button class="btn btn-outline-brown btn-sm" onclick="moveScreenStudentUp(${idx})" ${idx === 0 ? "disabled" : ""}>⬆️ للأعلى</button>
              <button class="btn btn-outline-brown btn-sm" onclick="moveScreenStudentDown(${idx})" ${idx === students.length - 1 ? "disabled" : ""}>⬇️ للأسفل</button>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = tbodyHtml;
    }
  }
};

window.moveScreenStudentUp = function (index) {
  const students = getQualifyingTamayuzStudents("current");
  if (index <= 0 || index >= students.length) return;

  const currentIds = students.map((s) => s.id);
  const temp = currentIds[index];
  currentIds[index] = currentIds[index - 1];
  currentIds[index - 1] = temp;

  window.appStore.screenOrder = currentIds;
  if (typeof saveToCloud === "function")
    saveToCloud("screenOrder", "current_order", { order: currentIds });
  if (typeof saveLocalStore === "function") saveLocalStore();
  renderScreenView();
};

window.moveScreenStudentDown = function (index) {
  const students = getQualifyingTamayuzStudents("current");
  if (index < 0 || index >= students.length - 1) return;

  const currentIds = students.map((s) => s.id);
  const temp = currentIds[index];
  currentIds[index] = currentIds[index + 1];
  currentIds[index + 1] = temp;

  window.appStore.screenOrder = currentIds;
  if (typeof saveToCloud === "function")
    saveToCloud("screenOrder", "current_order", { order: currentIds });
  if (typeof saveLocalStore === "function") saveLocalStore();
  renderScreenView();
};

window.resetScreenStudentOrder = function () {
  window.appStore.screenOrder = [];
  if (typeof saveToCloud === "function")
    saveToCloud("screenOrder", "current_order", { order: [] });
  if (typeof saveLocalStore === "function") saveLocalStore();
  renderScreenView();
  alert("✅ تمت إعادة الترتيب التلقائي بنجاح!");
};

// ==========================================================================
// 10. طلبات التسجيل وإعدادات المَجْمَع والخريطة التفاعلية العصرية الحديثة
// ==========================================================================
window.openMapPickerModal = function () {
  const currentLoc = (
    document.getElementById("set-org-location")?.value || ""
  ).trim();
  const currentRadius =
    parseInt(document.getElementById("set-org-radius")?.value || "50", 10) ||
    50;

  const radiusInput = document.getElementById("map-modal-radius-input");
  if (radiusInput) radiusInput.value = currentRadius;

  let defaultLat = 18.2165;
  let defaultLng = 42.5053;

  if (currentLoc && currentLoc.includes(",")) {
    const parts = currentLoc.split(",");
    const pLat = parseFloat(parts[0]);
    const pLng = parseFloat(parts[1]);
    if (!isNaN(pLat) && !isNaN(pLng)) {
      defaultLat = pLat;
      defaultLng = pLng;
    }
  }

  const coordsDisplay = document.getElementById("map-modal-coords-display");
  if (coordsDisplay)
    coordsDisplay.value = `${defaultLat.toFixed(6)}, ${defaultLng.toFixed(6)}`;

  openModal("modal-map-picker");

  setTimeout(() => {
    initOrUpdateMapPicker(defaultLat, defaultLng, currentRadius);
  }, 250);
};

function initOrUpdateMapPicker(lat, lng, radius) {
  const mapContainer = document.getElementById("map-picker-container");
  if (!mapContainer || typeof L === "undefined") return;

  const modernPinHtml = `
    <div class="modern-leaflet-pin-wrapper">
      <div class="pin-pulse"></div>
      <div class="pin-head">
        <span class="pin-symbol">🕌</span>
      </div>
      <div class="pin-tip"></div>
    </div>
  `;

  const customModernIcon = L.divIcon({
    className: "custom-modern-map-icon",
    html: modernPinHtml,
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    popupAnchor: [0, -45],
  });

  if (!window.mapPickerInstance) {
    window.mapPickerInstance = L.map("map-picker-container", {
      zoomControl: false,
    }).setView([lat, lng], 17);

    L.control.zoom({ position: "bottomright" }).addTo(window.mapPickerInstance);

    const modernVoyager = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 20,
        subdomains: "abcd",
        attribution: "© CartoDB © OpenStreetMap",
      },
    );

    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "© Esri World Imagery",
      },
    );

    modernVoyager.addTo(window.mapPickerInstance);

    const baseMaps = {
      "🗺️ خريطة عصرية (Voyager)": modernVoyager,
      "🛰️ قمر صناعي (Satellite)": satelliteLayer,
    };
    L.control
      .layers(baseMaps, null, { position: "topright" })
      .addTo(window.mapPickerInstance);

    window.mapPickerMarker = L.marker([lat, lng], {
      draggable: true,
      icon: customModernIcon,
    }).addTo(window.mapPickerInstance);

    window.mapPickerMarker.bindPopup(`
      <div style="font-family: 'Tajawal', sans-serif; text-align: center; padding: 4px;">
        <strong style="color: #0b6b7d; font-size: 14px;">📍 موقع جامع الهدى / المَجْمَع</strong><br>
        <span style="font-size: 12px; color: #555;">اسحب المؤشر لضبط المركز بدقة</span>
      </div>
    `);

    window.mapPickerCircle = L.circle([lat, lng], {
      color: "#0b6b7d",
      fillColor: "#0b6b7d",
      fillOpacity: 0.18,
      weight: 2,
      dashArray: "6, 6",
      radius: radius,
    }).addTo(window.mapPickerInstance);

    window.mapPickerMarker.on("drag", function (e) {
      const pos = e.target.getLatLng();
      if (window.mapPickerCircle) window.mapPickerCircle.setLatLng(pos);
    });

    window.mapPickerMarker.on("dragend", function (e) {
      const pos = e.target.getLatLng();
      updateMapPickerElements(pos.lat, pos.lng);
    });

    window.mapPickerInstance.on("click", function (e) {
      updateMapPickerElements(e.latlng.lat, e.latlng.lng);
    });
  } else {
    window.mapPickerInstance.invalidateSize();
    window.mapPickerInstance.setView([lat, lng], 17);
    updateMapPickerElements(lat, lng);
  }
}

function updateMapPickerElements(lat, lng) {
  if (window.mapPickerMarker) window.mapPickerMarker.setLatLng([lat, lng]);
  if (window.mapPickerCircle) window.mapPickerCircle.setLatLng([lat, lng]);

  const coordsDisplay = document.getElementById("map-modal-coords-display");
  if (coordsDisplay)
    coordsDisplay.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

window.updateMapPickerRadius = function (newRadius) {
  const radVal = parseInt(newRadius, 10) || 50;
  if (window.mapPickerCircle) {
    window.mapPickerCircle.setRadius(radVal);
  }
};

window.searchMapLocationQuery = function () {
  const searchInput = document.getElementById("map-search-query-input");
  const query = searchInput?.value.trim();
  if (!query) {
    alert("يرجى كتابة اسم الحي، الشارع، أو المعلم للبحث.");
    return;
  }

  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=ar`,
  )
    .then((res) => res.json())
    .then((data) => {
      if (data && data.length > 0) {
        const result = data[0];
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);
        if (window.mapPickerInstance) {
          window.mapPickerInstance.setView([newLat, newLng], 17);
          updateMapPickerElements(newLat, newLng);
        }
      } else {
        alert("لم يتم العثور على نتائج مطابقة، يرجى تجربة اسم آخر.");
      }
    })
    .catch((err) => {
      console.warn("خطأ في البحث عن الموقع:", err);
      alert("تعذر الاتصال بخدمة البحث عن الأماكن.");
    });
};

window.confirmMapPickerLocation = function () {
  const coords = (
    document.getElementById("map-modal-coords-display")?.value || ""
  ).trim();
  const radius =
    document.getElementById("map-modal-radius-input")?.value || "50";

  const setLocInput = document.getElementById("set-org-location");
  const setRadInput = document.getElementById("set-org-radius");

  if (setLocInput && coords) setLocInput.value = coords;
  if (setRadInput && radius) setRadInput.value = radius;

  closeModal("modal-map-picker");
  alert(
    `✅ تم تحديد موقع ونطاق المسجد بنجاح:\nالإحداثيات: ${coords}\nنصف قطر التحضير: ${radius} متراً`,
  );
};

window.handleSaveOrgSettings = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const orgName = (document.getElementById("set-org-name")?.value || "").trim();
  const mosqueName = (
    document.getElementById("set-org-mosque")?.value || ""
  ).trim();
  const directorName = (
    document.getElementById("set-org-director")?.value || ""
  ).trim();
  const location = (
    document.getElementById("set-org-location")?.value || ""
  ).trim();
  const radius =
    parseInt(document.getElementById("set-org-radius")?.value || "50", 10) ||
    50;
  const fontSize =
    document.getElementById("set-header-font-size")?.value || "13px";
  const logoNew =
    (document.getElementById("set-org-logo-new")?.value || "").trim() ||
    "logo12.jpeg";
  const logoOld =
    (document.getElementById("set-org-logo-old")?.value || "").trim() ||
    "logo_transparent_1.png";

  const newSettings = {
    orgName: orgName || "مَجْمَع عبدالله بن مهدي القرآني",
    subTitle: mosqueName || "جامع الهدى",
    directorName: directorName || "صالح ال ناشع",
    location: location,
    radius: radius,
    headerFontSize: fontSize,
    logoNew: logoNew,
    logoOld: logoOld,
    logoLogin: "logo_transparent_2.png",
  };

  window.appStore.settings = newSettings;
  if (typeof saveToCloud === "function")
    saveToCloud("settings", "main_settings", newSettings);
  if (typeof saveLocalStore === "function") saveLocalStore();

  alert("✅ تم حفظ وتحديث إعدادات وهوية المَجْمَع ونطاق التحضير بنجاح!");
  if (typeof applyAppIdentity === "function") applyAppIdentity();
};

window.renderPendingRequestsTable = function () {
  const tbody = document.getElementById("pending-requests-table-body");
  if (!tbody) return;

  const pendingList = (window.appStore?.students || []).filter(
    (s) => s.status === "pending",
  );
  if (pendingList.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center text-muted p-4">لا توجد طلبات تسجيل جديدة حالياً</td></tr>';
    updatePendingBadgeCount();
    return;
  }

  let html = "";
  pendingList.forEach((stu) => {
    html += `
      <tr>
        <td style="font-weight: 700;">${stu.name}</td>
        <td>${stu.nationalId || "—"}</td>
        <td>${stu.hifzAmount || "—"}</td>
        <td>${stu.parentName || "—"}</td>
        <td>${stu.parentRelation || "—"}</td>
        <td style="color: var(--primary-brown); font-weight: 700;">${stu.parentPhone || "—"}</td>
        <td>${stu.residence || "—"}</td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-success btn-sm" onclick="approveStudentRequest('${stu.id}')">قبول</button>
            <button class="btn btn-danger btn-sm" onclick="rejectStudentRequest('${stu.id}')">رفض</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  updatePendingBadgeCount();
};

window.updatePendingBadgeCount = function () {
  const count = (window.appStore?.students || []).filter(
    (s) => s.status === "pending",
  ).length;
  const badge = document.getElementById("pending-count-badge");
  if (badge) badge.textContent = count;
};

window.approveStudentRequest = function (studentId) {
  const stu = (window.appStore?.students || []).find((s) => s.id === studentId);
  if (!stu) return;

  stu.status = "active";
  if (!window.appStore.users) window.appStore.users = [];
  window.appStore.users.push({
    id: stu.id,
    name: stu.name,
    phone: stu.phone || stu.parentPhone,
    role: "student",
    username: stu.nationalId || stu.phone || stu.id,
    pass: "1111",
    status: "active",
    createdAt: Date.now(),
  });

  if (typeof saveToCloud === "function") {
    saveToCloud("students", stu.id, stu);
    saveToCloud("users", stu.id, {
      id: stu.id,
      name: stu.name,
      phone: stu.phone || stu.parentPhone,
      role: "student",
      username: stu.nationalId || stu.phone || stu.id,
      pass: "1111",
      status: "active",
    });
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  alert(
    `✅ تم قبول انضمام الطالب (${stu.name}) بنجاح! والرقم السري الخاص به هو (1111).`,
  );
  renderPendingRequestsTable();
};

window.rejectStudentRequest = function (studentId) {
  if (!confirm("هل أنت متأكد من رفض هذا الطلب؟")) return;

  window.appStore.students = (window.appStore.students || []).filter(
    (s) => s.id !== studentId,
  );
  if (typeof saveToCloud === "function")
    saveToCloud("students", studentId, null, true);
  if (typeof saveLocalStore === "function") saveLocalStore();

  renderPendingRequestsTable();
};

window.handleSelfRegistration = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const name = (document.getElementById("reg-stu-name")?.value || "").trim();
  const nationalId = (
    document.getElementById("reg-stu-id")?.value || ""
  ).trim();
  const age = document.getElementById("reg-stu-age")?.value || "";
  const hifzAmount = (
    document.getElementById("reg-hifz-amount")?.value || ""
  ).trim();
  const parentName = (
    document.getElementById("reg-parent-name")?.value || ""
  ).trim();
  const parentPhone = (
    document.getElementById("reg-parent-phone")?.value || ""
  ).trim();
  const residence = (
    document.getElementById("reg-residence")?.value || ""
  ).trim();

  let parentRelation = "أب";
  const relRadio = document.querySelector(
    'input[name="reg_parent_relation"]:checked',
  );
  if (relRadio) {
    parentRelation =
      relRadio.value === "أخرى"
        ? (
            document.getElementById("reg-relation-other-text")?.value || "أخرى"
          ).trim()
        : relRadio.value;
  }

  const newReq = {
    id: "s_req_" + Date.now(),
    name,
    nationalId,
    age,
    hifzAmount,
    parentName,
    parentPhone,
    parentRelation,
    residence,
    status: "pending",
    circleId: "",
    createdAt: Date.now(),
  };

  if (!window.appStore.students) window.appStore.students = [];
  window.appStore.students.push(newReq);

  if (typeof saveToCloud === "function")
    saveToCloud("students", newReq.id, newReq);
  if (typeof saveLocalStore === "function") saveLocalStore();

  closeModal("modal-self-register");
  e.target?.reset();
  alert("✅ تم إرسال طلب الالتحاق بنجاح! سيتم مراجعته من قبل إدارة المَجْمَع.");
};

function getCircleName(circleId) {
  const c = (window.appStore?.circles || []).find((x) => x.id === circleId);
  return c ? c.name : "—";
}
