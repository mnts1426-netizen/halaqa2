/**
 * ==========================================================================
 * admin.js - المحرك الإداري المحدث بالكامل الملتزم بكافة الشروط المحددة
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  // ربط نماذج الإضافة
  const formAddStudent = document.getElementById("form-add-student");
  if (formAddStudent)
    formAddStudent.addEventListener("submit", handleAddStudent);

  const formAddTeacher = document.getElementById("form-add-teacher");
  if (formAddTeacher)
    formAddTeacher.addEventListener("submit", handleAddTeacher);

  const formAddCircle = document.getElementById("form-add-circle");
  if (formAddCircle) formAddCircle.addEventListener("submit", handleSaveCircle);

  // أحداث البحث والتصفية
  const searchStudents = document.getElementById("search-students");
  if (searchStudents)
    searchStudents.addEventListener("input", renderStudentsTable);

  const filterCircle = document.getElementById("filter-student-circle");
  if (filterCircle)
    filterCircle.addEventListener("change", renderStudentsTable);

  const filterStatus = document.getElementById("filter-student-status");
  if (filterStatus)
    filterStatus.addEventListener("change", renderStudentsTable);

  const searchTeachers = document.getElementById("search-teachers");
  if (searchTeachers)
    searchTeachers.addEventListener("input", renderTeachersTable);

  const searchCircles = document.getElementById("search-circles");
  if (searchCircles)
    searchCircles.addEventListener("input", renderCirclesCards);

  // أحداث شاشة الحضور
  const attCircleSelect = document.getElementById("attendance-circle-select");
  const attDateSelect = document.getElementById("attendance-date-select");
  const attSearchInput = document.getElementById("search-attendance-student");

  if (attDateSelect)
    attDateSelect.value = new Date().toISOString().split("T")[0];
  if (attCircleSelect)
    attCircleSelect.addEventListener("change", renderAttendanceTable);
  if (attDateSelect)
    attDateSelect.addEventListener("change", renderAttendanceTable);
  if (attSearchInput)
    attSearchInput.addEventListener("input", renderAttendanceTable);
});

// ==========================================================================
// 1. إدارة الطلاب، استيراد Excel، وطلبات التسجيل
// ==========================================================================
function switchStudentSubTab(tab) {
  const btnActive = document.getElementById("tab-btn-active-students");
  const btnPending = document.getElementById("tab-btn-pending-requests");
  const boxActive = document.getElementById("box-active-students-table");
  const boxPending = document.getElementById("box-pending-requests-table");

  if (tab === "active") {
    btnActive.classList.add("active");
    btnPending.classList.remove("active");
    boxActive.classList.remove("style-hidden");
    boxPending.classList.add("style-hidden");
    renderStudentsTable();
  } else {
    btnPending.classList.add("active");
    btnActive.classList.remove("active");
    boxPending.classList.remove("style-hidden");
    boxActive.classList.add("style-hidden");
    renderPendingRequestsTable();
  }
}

function renderStudentsTable() {
  const tbody = document.getElementById("students-table-body");
  if (!tbody) return;

  const searchVal = (
    document.getElementById("search-students")?.value || ""
  ).toLowerCase();
  const circleFilter =
    document.getElementById("filter-student-circle")?.value || "all";
  const statusFilter =
    document.getElementById("filter-student-status")?.value || "active";

  const user = window.currentUser;
  let studentsList = (window.appStore.students || []).filter(
    (s) => s.status !== "pending",
  );

  if (user && user.role === "teacher") {
    const teacherObj =
      window.appStore.teachers.find(
        (t) => t.userId === user.id || t.id === user.teacherId,
      ) || window.appStore.teachers[0];
    const teacherId = teacherObj ? teacherObj.id : "t1";
    const teacherCircleIds = (window.appStore.circles || [])
      .filter(
        (c) =>
          (c.teacherIds && c.teacherIds.includes(teacherId)) ||
          c.teacherId === teacherId,
      )
      .map((c) => c.id);
    studentsList = studentsList.filter((s) =>
      teacherCircleIds.includes(s.circleId),
    );
  }

  let filtered = studentsList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchVal) ||
      (s.nationalId && s.nationalId.includes(searchVal)) ||
      (s.phone && s.phone.includes(searchVal)) ||
      (s.parentPhone && s.parentPhone.includes(searchVal));
    const matchesCircle = circleFilter === "all" || s.circleId === circleFilter;
    const matchesStatus = s.status === statusFilter;
    return matchesSearch && matchesCircle && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">لا يوجد طلاب مطابقون للبحث</td></tr>`;
    return;
  }

  let html = "";
  filtered.forEach((student) => {
    const circle = window.appStore.circles.find(
      (c) => c.id === student.circleId,
    );
    const circleName = circle ? circle.name : "غير مسجل";

    html += `
            <tr>
                <td style="font-weight: 700;">${student.name}</td>
                <td>${student.nationalId || "—"}</td>
                <td>${student.phone || "بدون جوال"}</td>
                <td>${student.parentName || "—"}</td>
                <td>${student.parentRelation || "—"}</td>
                <td style="color: var(--primary-brown); font-weight: 700;">${student.parentPhone || "—"}</td>
                <td><span class="badge badge-warning">${circleName}</span></td>
                <td>
                    <span class="badge ${student.status === "active" ? "badge-active" : "badge-soft-warning"}">
                        ${student.status === "active" ? "نشط" : "مؤرشف"}
                    </span>
                </td>
                <td>
                    <button class="btn btn-outline-brown btn-sm" onclick="toggleArchiveStudent('${student.id}')">
                        ${student.status === "active" ? "أرشفة" : "إعادة تفعيل"}
                    </button>
                </td>
            </tr>
        `;
  });

  tbody.innerHTML = html;
  updatePendingBadgeCount();
}

// دالة استيراد الطلاب من ملف Excel بالأعمدة الأربعة المحددة
function handleExcelImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (!rows || rows.length <= 1) {
        alert("⚠️ ملف Excel فارغ أو لا يحتوي على بيانات!");
        return;
      }

      let addedCount = 0;
      // بدء القراءة من السطر الثاني لتجاوز الترويسة
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;

        const stuName = String(row[0] || "").trim();
        const nationalId = String(row[1] || "").trim();
        const stuPhone = String(row[2] || "").trim();
        const parentPhone = String(row[3] || "").trim();

        if (stuName) {
          const newStudent = {
            id: "s_imp_" + Date.now() + "_" + i,
            name: stuName,
            nationalId: nationalId,
            phone: stuPhone,
            parentName: "ولي أمر " + stuName.split(" ")[0],
            parentRelation: "أب",
            parentPhone: parentPhone,
            circleId: "",
            status: "active",
            createdAt: Date.now(),
          };

          window.appStore.students.push(newStudent);
          if (typeof saveToCloud === "function")
            saveToCloud("students", newStudent.id, newStudent);
          addedCount++;
        }
      }

      alert(
        `✅ تم استيراد (${addedCount}) طالب بنجاح وإضافتهم لقاعدة البيانات!`,
      );
      renderStudentsTable();
      e.target.value = "";
    } catch (err) {
      alert("❌ حدث خطأ أثناء قراءة ملف Excel: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function renderPendingRequestsTable() {
  const tbody = document.getElementById("pending-requests-table-body");
  if (!tbody) return;

  const pendingList = (window.appStore.students || []).filter(
    (s) => s.status === "pending",
  );

  if (pendingList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">لا توجد طلبات تسجيل جديدة حالياً</td></tr>`;
    return;
  }

  let html = "";
  pendingList.forEach((stu) => {
    html += `
      <tr>
        <td style="font-weight: 700;">${stu.name}</td>
        <td>${stu.nationalId || "—"}</td>
        <td>${stu.phone || "بدون جوال"}</td>
        <td>${stu.parentName || "—"}</td>
        <td>${stu.parentRelation || "—"}</td>
        <td style="color: var(--primary-brown); font-weight: 700;">${stu.parentPhone || "—"}</td>
        <td>
          <button class="btn btn-success btn-sm" onclick="approveStudentRequest('${stu.id}')">🟢 قبول</button>
          <button class="btn btn-danger btn-sm" onclick="rejectStudentRequest('${stu.id}')">🔴 رفض</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  updatePendingBadgeCount();
}

function updatePendingBadgeCount() {
  const pendingCount = (window.appStore.students || []).filter(
    (s) => s.status === "pending",
  ).length;
  const badge = document.getElementById("pending-count-badge");
  if (badge) badge.textContent = pendingCount;
}

function handleAddStudent(e) {
  e.preventDefault();
  const newStudent = {
    id: "s_" + Date.now(),
    name: document.getElementById("stu-name").value,
    nationalId: document.getElementById("stu-id").value,
    phone: document.getElementById("stu-phone").value || "",
    parentName: document.getElementById("stu-parent-name").value,
    parentRelation: document.getElementById("stu-parent-relation").value,
    parentPhone: document.getElementById("stu-parent-phone").value,
    circleId: document.getElementById("stu-circle").value,
    status: "active",
    createdAt: Date.now(),
  };

  window.appStore.students.push(newStudent);
  if (typeof saveToCloud === "function")
    saveToCloud("students", newStudent.id, newStudent);

  closeModal("modal-add-student");
  e.target.reset();
  if (typeof refreshAllViews === "function") refreshAllViews();
  alert("✅ تم إضافة الطالب بنجاح!");
}

function handleSelfRegistration(e) {
  e.preventDefault();
  const newRequest = {
    id: "s_req_" + Date.now(),
    name: document.getElementById("reg-stu-name").value,
    nationalId: document.getElementById("reg-stu-id").value,
    phone: document.getElementById("reg-stu-phone").value || "",
    parentName: document.getElementById("reg-parent-name").value,
    parentRelation: document.getElementById("reg-parent-relation").value,
    parentPhone: document.getElementById("reg-parent-phone").value,
    circleId: "",
    status: "pending",
    requestDate: new Date().toLocaleDateString("ar-SA"),
  };

  window.appStore.students.push(newRequest);
  if (typeof saveToCloud === "function")
    saveToCloud("students", newRequest.id, newRequest);

  closeModal("modal-self-register");
  e.target.reset();
  alert("✅ تم إرسال طلب التقديم بنجاح! سيتم مراجعته من قبل إدارة جامع الهدى.");
}

function approveStudentRequest(studentId) {
  const student = window.appStore.students.find((s) => s.id === studentId);
  if (!student) return;

  student.status = "active";
  if (typeof saveToCloud === "function")
    saveToCloud("students", student.id, student);

  alert(`✅ تم قبول انضمام الطالب (${student.name}) بنجاح!`);
  renderPendingRequestsTable();
}

function rejectStudentRequest(studentId) {
  if (!confirm("هل أنت متأكد من رفض هذا الطلب؟")) return;

  window.appStore.students = window.appStore.students.filter(
    (s) => s.id !== studentId,
  );

  renderPendingRequestsTable();
}

function toggleArchiveStudent(studentId) {
  const student = window.appStore.students.find((s) => s.id === studentId);
  if (!student) return;

  student.status = student.status === "active" ? "archived" : "active";
  if (typeof saveToCloud === "function")
    saveToCloud("students", student.id, student);

  renderStudentsTable();
}

// ==========================================================================
// 2. إدارة المعلمون والمتابعة المدمجة بالكامل
// ==========================================================================
function renderTeachersTable() {
  const tbody = document.getElementById("teachers-table-body");
  if (!tbody) return;

  const searchVal = (
    document.getElementById("search-teachers")?.value || ""
  ).toLowerCase();

  let filtered = (window.appStore.teachers || []).filter(
    (t) =>
      t.name.toLowerCase().includes(searchVal) ||
      (t.phone && t.phone.includes(searchVal)),
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">لا يوجد معلمون مطابقون</td></tr>`;
    return;
  }

  let html = "";
  filtered.forEach((t) => {
    const teacherCircles = (window.appStore.circles || []).filter(
      (c) =>
        (c.teacherIds && c.teacherIds.includes(t.id)) || c.teacherId === t.id,
    );
    const circleNamesStr =
      teacherCircles.length > 0
        ? teacherCircles.map((c) => c.name).join(" ، ")
        : "غير مكلف";

    const lastLogin = t.lastLogin || "اليوم 04:30 م";
    const attRate =
      t.customAttendanceRate !== null && t.customAttendanceRate !== undefined
        ? t.customAttendanceRate
        : 95;
    const tasRate =
      t.customTasmeeaRate !== null && t.customTasmeeaRate !== undefined
        ? t.customTasmeeaRate
        : 90;

    html += `
            <tr>
                <td style="font-weight: 700;">${t.name}</td>
                <td>${t.phone}</td>
                <td><span class="badge badge-warning">${circleNamesStr} (${teacherCircles.length} حلقة)</span></td>
                <td dir="ltr" class="text-muted" style="text-align: right;">${lastLogin}</td>
                <td><span class="badge badge-active">${attRate}%</span></td>
                <td><span class="badge badge-warning">${tasRate}%</span></td>
                <td>
                    <div style="display: flex; gap: 0.4rem;">
                      <button class="btn btn-outline-brown btn-sm" onclick="openModalEditTeacherMonitoring('${t.id}')">✏️ متابعة</button>
                      <button class="btn btn-outline-brown btn-sm" onclick="toggleTeacherStatus('${t.id}')">
                          ${t.status === "active" ? "إيقاف" : "تفعيل"}
                      </button>
                    </div>
                </td>
            </tr>
        `;
  });

  tbody.innerHTML = html;
}

function openModalAddTeacher() {
  document.getElementById("teach-name").value = "";
  document.getElementById("teach-phone").value = "";

  const container = document.getElementById(
    "teacher-circles-checkbox-container",
  );
  if (container) {
    let html = "";
    (window.appStore.circles || []).forEach((c) => {
      html += `
        <label class="checkbox-item-row">
          <input type="checkbox" name="teacher_circles" value="${c.id}">
          <span>${c.name}</span>
        </label>
      `;
    });
    container.innerHTML =
      html || '<p class="text-muted p-2">لا توجد حلقات معرفة</p>';
  }

  openModal("modal-add-teacher");
}

function handleAddTeacher(e) {
  e.preventDefault();
  const name = document.getElementById("teach-name").value;
  const phone = document.getElementById("teach-phone").value;

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
    status: "active",
    lastLogin: "لم يدخل بعد",
    customAttendanceRate: 100,
    customTasmeeaRate: 100,
  };

  window.appStore.teachers.push(newTeacher);
  if (typeof saveToCloud === "function")
    saveToCloud("teachers", newTeacher.id, newTeacher);

  window.appStore.circles.forEach((c) => {
    if (selectedCircles.includes(c.id)) {
      if (!c.teacherIds) c.teacherIds = [];
      if (!c.teacherIds.includes(newTeacherId)) c.teacherIds.push(newTeacherId);
      if (typeof saveToCloud === "function") saveToCloud("circles", c.id, c);
    }
  });

  closeModal("modal-add-teacher");
  e.target.reset();
  if (typeof refreshAllViews === "function") refreshAllViews();
  alert("✅ تم إضافة المعلم وتكليفه بالحلقات بنجاح!");
}

function toggleTeacherStatus(teacherId) {
  const teacher = window.appStore.teachers.find((t) => t.id === teacherId);
  if (!teacher) return;

  teacher.status = teacher.status === "active" ? "suspended" : "active";
  if (typeof saveToCloud === "function")
    saveToCloud("teachers", teacher.id, teacher);

  renderTeachersTable();
}

function openModalEditTeacherMonitoring(teacherId) {
  const teacher = (window.appStore.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  document.getElementById("edit-monitoring-teacher-id").value = teacher.id;
  document.getElementById("edit-monitoring-name").value = teacher.name;
  document.getElementById("edit-monitoring-last-login").value =
    teacher.lastLogin || "اليوم 04:30 م";
  document.getElementById("edit-monitoring-att-rate").value =
    teacher.customAttendanceRate !== null &&
    teacher.customAttendanceRate !== undefined
      ? teacher.customAttendanceRate
      : 85;
  document.getElementById("edit-monitoring-tas-rate").value =
    teacher.customTasmeeaRate !== null &&
    teacher.customTasmeeaRate !== undefined
      ? teacher.customTasmeeaRate
      : 90;

  openModal("modal-edit-teacher-monitoring");
}

function handleSaveTeacherMonitoring(e) {
  e.preventDefault();
  const teacherId = document.getElementById("edit-monitoring-teacher-id").value;
  const teacher = (window.appStore.teachers || []).find(
    (t) => t.id === teacherId,
  );

  if (teacher) {
    teacher.lastLogin = document.getElementById(
      "edit-monitoring-last-login",
    ).value;
    teacher.customAttendanceRate = parseInt(
      document.getElementById("edit-monitoring-att-rate").value,
    );
    teacher.customTasmeeaRate = parseInt(
      document.getElementById("edit-monitoring-tas-rate").value,
    );

    if (typeof saveToCloud === "function")
      saveToCloud("teachers", teacher.id, teacher);
    alert("✅ تم تعديل بيانات المتابعة بنجاح!");
  }

  closeModal("modal-edit-teacher-monitoring");
  renderTeachersTable();
}

// ==========================================================================
// 3. إدارة الحلقات مع فلاتر البحث وإظهار التكليفات في الحلقات الأخرى
// ==========================================================================
function renderCirclesCards() {
  const container = document.getElementById("circles-cards-container");
  const countTitle = document.getElementById("circles-count-title");
  if (!container) return;

  const searchVal = (
    document.getElementById("search-circles")?.value || ""
  ).toLowerCase();
  const user = window.currentUser;

  let circlesList = window.appStore.circles || [];

  if (user && user.role === "teacher") {
    const teacherObj =
      window.appStore.teachers.find(
        (t) => t.userId === user.id || t.id === user.teacherId,
      ) || window.appStore.teachers[0];
    const teacherId = teacherObj ? teacherObj.id : "t1";
    circlesList = circlesList.filter(
      (c) =>
        (c.teacherIds && c.teacherIds.includes(teacherId)) ||
        c.teacherId === teacherId,
    );
  }

  const filtered = circlesList.filter((c) =>
    c.name.toLowerCase().includes(searchVal),
  );

  if (countTitle) countTitle.textContent = `${circlesList.length} حلقة`;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state-card"><h3>لا توجد حلقات مطابقة</h3></div>`;
    return;
  }

  let html = "";
  filtered.forEach((circle) => {
    let assignedTeachers = [];
    if (circle.teacherIds && circle.teacherIds.length > 0) {
      assignedTeachers = window.appStore.teachers.filter((t) =>
        circle.teacherIds.includes(t.id),
      );
    } else if (circle.teacherId) {
      const singleTeacher = window.appStore.teachers.find(
        (t) => t.id === circle.teacherId,
      );
      if (singleTeacher) assignedTeachers.push(singleTeacher);
    }

    const teacherNamesStr =
      assignedTeachers.length > 0
        ? assignedTeachers.map((t) => t.name).join(" ، ")
        : "غير معين";
    const circleStudents = (window.appStore.students || []).filter(
      (s) => s.circleId === circle.id && s.status === "active",
    );
    const isAdmin = !user || user.role === "admin";

    html += `
            <div class="circle-card">
                <div class="circle-header">
                    <div class="circle-title">
                        <h3>${circle.name}</h3>
                        <p>جامع الهدى</p>
                    </div>
                    <span class="badge-circle-active">${circle.status || "نشطة"}</span>
                </div>

                <div class="circle-stats-row">
                    <div>
                        <div class="circle-stat-val">${circleStudents.length}</div>
                        <div class="circle-stat-lbl">عدد الطلاب</div>
                    </div>
                    <div>
                        <div class="circle-stat-val" style="color: var(--primary-brown);">${assignedTeachers.length}</div>
                        <div class="circle-stat-lbl">عدد المعلمين</div>
                    </div>
                </div>

                <div class="circle-teacher-info" style="font-size: 0.85rem; margin-bottom: 0.8rem;">
                    <strong>المعلمون:</strong> ${teacherNamesStr}
                </div>

                ${
                  isAdmin
                    ? `
                    <div class="circle-card-actions">
                        <button class="btn btn-outline-brown btn-block" onclick="openModalEditCircle('${circle.id}')">✏️ تعديل كامل للحلقة</button>
                    </div>
                `
                    : ""
                }
            </div>
        `;
  });

  container.innerHTML = html;
}

function openModalAddCircle() {
  document.getElementById("modal-circle-title").textContent =
    "إضافة حلقة جديدة بجامع الهدى";
  document.getElementById("edit-circle-id").value = "";
  document.getElementById("circle-name").value = "";
  document.getElementById("search-modal-teachers").value = "";
  document.getElementById("search-modal-students").value = "";

  populateCircleTeachersList([]);
  populateCircleStudentsList([]);

  openModal("modal-add-circle");
}

function openModalEditCircle(circleId) {
  const circle = window.appStore.circles.find((c) => c.id === circleId);
  if (!circle) return;

  document.getElementById("modal-circle-title").textContent =
    `تعديل حلقة: ${circle.name}`;
  document.getElementById("edit-circle-id").value = circle.id;
  document.getElementById("circle-name").value = circle.name;
  document.getElementById("search-modal-teachers").value = "";
  document.getElementById("search-modal-students").value = "";

  const currentTeacherIds =
    circle.teacherIds || (circle.teacherId ? [circle.teacherId] : []);
  const currentStudents = (window.appStore.students || [])
    .filter((s) => s.circleId === circleId)
    .map((s) => s.id);

  populateCircleTeachersList(currentTeacherIds);
  populateCircleStudentsList(currentStudents);

  openModal("modal-add-circle");
}

function filterCircleModalTeachers() {
  const q = (
    document.getElementById("search-modal-teachers")?.value || ""
  ).toLowerCase();
  document
    .querySelectorAll("#circle-teachers-list .checkbox-item-row")
    .forEach((el) => {
      const text = el.textContent.toLowerCase();
      el.style.display = text.includes(q) ? "flex" : "none";
    });
}

function filterCircleModalStudents() {
  const q = (
    document.getElementById("search-modal-students")?.value || ""
  ).toLowerCase();
  document
    .querySelectorAll("#circle-students-list .checkbox-item-row")
    .forEach((el) => {
      const text = el.textContent.toLowerCase();
      el.style.display = text.includes(q) ? "flex" : "none";
    });
}

function populateCircleTeachersList(selectedIds) {
  const container = document.getElementById("circle-teachers-list");
  if (!container) return;

  if (!window.appStore.teachers || window.appStore.teachers.length === 0) {
    container.innerHTML = '<p class="text-muted p-2">لا يوجد معلمون مسجلون</p>';
    return;
  }

  let html = "";
  window.appStore.teachers.forEach((t) => {
    const isChecked = selectedIds.includes(t.id) ? "checked" : "";
    const otherCircles = (window.appStore.circles || []).filter(
      (c) =>
        (c.teacherIds && c.teacherIds.includes(t.id)) || c.teacherId === t.id,
    );
    const otherNames = otherCircles.map((c) => c.name).join(" ، ");
    const tag = otherNames
      ? `<small style="color: var(--primary-brown); font-weight:700;">[مكلف بـ: ${otherNames}]</small>`
      : `<small class="text-muted">[غير مكلف بحلقات]</small>`;

    html += `
            <label class="checkbox-item-row">
                <input type="checkbox" name="circle_teachers" value="${t.id}" ${isChecked}>
                <span>${t.name} ${tag}</span>
            </label>
        `;
  });
  container.innerHTML = html;
}

function populateCircleStudentsList(selectedStudentIds) {
  const container = document.getElementById("circle-students-list");
  if (!container) return;

  const activeStudents = (window.appStore.students || []).filter(
    (s) => s.status === "active",
  );

  if (activeStudents.length === 0) {
    container.innerHTML = '<p class="text-muted p-2">لا يوجد طلاب مسجلون</p>';
    return;
  }

  let html = "";
  activeStudents.forEach((s) => {
    const isChecked = selectedStudentIds.includes(s.id) ? "checked" : "";
    const currentCircle = (window.appStore.circles || []).find(
      (c) => c.id === s.circleId,
    );
    const currentCircleName = currentCircle
      ? `<small style="color: #2e7d32; font-weight:700;">[مسجل في: ${currentCircle.name}]</small>`
      : `<small class="text-muted">[غير مسجل بحلقة]</small>`;

    html += `
            <label class="checkbox-item-row">
                <input type="checkbox" name="circle_students" value="${s.id}" ${isChecked}>
                <span>${s.name} ${currentCircleName}</span>
            </label>
        `;
  });
  container.innerHTML = html;
}

function handleSaveCircle(e) {
  e.preventDefault();
  const editId = document.getElementById("edit-circle-id").value;
  const name = document.getElementById("circle-name").value.trim();

  const selectedTeachers = [];
  document
    .querySelectorAll('input[name="circle_teachers"]:checked')
    .forEach((cb) => selectedTeachers.push(cb.value));

  const selectedStudents = [];
  document
    .querySelectorAll('input[name="circle_students"]:checked')
    .forEach((cb) => selectedStudents.push(cb.value));

  if (editId) {
    const circle = window.appStore.circles.find((c) => c.id === editId);
    if (circle) {
      circle.name = name;
      circle.teacherIds = selectedTeachers;
      circle.teacherId = selectedTeachers[0] || "";
      if (typeof saveToCloud === "function")
        saveToCloud("circles", circle.id, circle);
    }

    (window.appStore.students || []).forEach((s) => {
      if (selectedStudents.includes(s.id)) {
        s.circleId = editId;
        if (typeof saveToCloud === "function") saveToCloud("students", s.id, s);
      } else if (s.circleId === editId) {
        s.circleId = "";
        if (typeof saveToCloud === "function") saveToCloud("students", s.id, s);
      }
    });

    alert("✅ تم تعديل بيانات الحلقة والأعضاء بنجاح!");
  } else {
    const newCircleId = "c_" + Date.now();
    const newCircle = {
      id: newCircleId,
      name: name,
      mosque: "جامع الهدى",
      teacherIds: selectedTeachers,
      teacherId: selectedTeachers[0] || "",
      status: "نشطة",
    };

    window.appStore.circles.push(newCircle);
    if (typeof saveToCloud === "function")
      saveToCloud("circles", newCircle.id, newCircle);

    (window.appStore.students || []).forEach((s) => {
      if (selectedStudents.includes(s.id)) {
        s.circleId = newCircleId;
        if (typeof saveToCloud === "function") saveToCloud("students", s.id, s);
      }
    });

    alert("✅ تم إنشاء الحلقة وتعيين الأعضاء بنجاح!");
  }

  closeModal("modal-add-circle");
  if (typeof refreshAllViews === "function") refreshAllViews();
}

// ==========================================================================
// 4. الحضور والغياب (Dropdown)
// ==========================================================================
function renderAttendanceTable() {
  const tbody = document.getElementById("attendance-table-body");
  const circleId = document.getElementById("attendance-circle-select")?.value;
  const dateVal = document.getElementById("attendance-date-select")?.value;
  const searchStudentVal = (
    document.getElementById("search-attendance-student")?.value || ""
  ).toLowerCase();

  if (!tbody) return;

  if (!circleId) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4">يرجى اختيار الحلقة لعرض قائمة الحضور والغياب</td></tr>`;
    return;
  }

  let students = (window.appStore.students || []).filter(
    (s) => s.circleId === circleId && s.status === "active",
  );

  if (searchStudentVal) {
    students = students.filter((s) =>
      s.name.toLowerCase().includes(searchStudentVal),
    );
  }

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4">لا يوجد طلاب مطابقون للبحث في هذه الحلقة</td></tr>`;
    return;
  }

  let html = "";
  students.forEach((student) => {
    const record =
      (window.appStore.attendance || []).find(
        (a) => a.studentId === student.id && a.date === dateVal,
      ) || {};
    const currentStatus = record.status || "present";

    html += `
            <tr>
                <td style="font-weight: 700;">${student.name}</td>
                <td><span class="badge badge-warning">${getCircleName(student.circleId)}</span></td>
                <td>
                    <select class="form-control" style="font-weight: 700;" onchange="setStudentAttendance('${student.id}', this.value)">
                        <option value="present" ${currentStatus === "present" ? "selected" : ""}>🟢 حاضر</option>
                        <option value="absent" ${currentStatus === "absent" ? "selected" : ""}>🔴 غائب</option>
                        <option value="late" ${currentStatus === "late" ? "selected" : ""}>🟡 متأخر</option>
                        <option value="excused" ${currentStatus === "excused" ? "selected" : ""}>🔵 مستأذن</option>
                    </select>
                </td>
                <td>
                    <input type="text" class="form-control" placeholder="إضافة ملاحظة..." value="${record.notes || ""}" onchange="updateAttendanceNotes('${student.id}', this.value)">
                </td>
            </tr>
        `;
  });

  tbody.innerHTML = html;
}

function setStudentAttendance(studentId, status) {
  const dateVal = document.getElementById("attendance-date-select").value;
  const circleId = document.getElementById("attendance-circle-select").value;
  const recordId = `att_${studentId}_${dateVal}`;

  let record = window.appStore.attendance.find((a) => a.id === recordId);
  if (!record) {
    record = {
      id: recordId,
      studentId,
      circleId,
      date: dateVal,
      status,
      notes: "",
    };
    window.appStore.attendance.push(record);
  } else {
    record.status = status;
  }

  if (typeof saveToCloud === "function")
    saveToCloud("attendance", record.id, record);
}

function updateAttendanceNotes(studentId, notesVal) {
  const dateVal = document.getElementById("attendance-date-select").value;
  const recordId = `att_${studentId}_${dateVal}`;

  let record = window.appStore.attendance.find((a) => a.id === recordId);
  if (record) {
    record.notes = notesVal;
    if (typeof saveToCloud === "function")
      saveToCloud("attendance", record.id, record);
  }
}

function markAllPresent() {
  const circleId = document.getElementById("attendance-circle-select").value;
  if (!circleId) return alert("اختر حلقة أولاً!");

  const students = (window.appStore.students || []).filter(
    (s) => s.circleId === circleId && s.status === "active",
  );
  students.forEach((s) => setStudentAttendance(s.id, "present"));

  renderAttendanceTable();
  alert("✅ تم تحديد الجميع كـ (حاضر) بنجاح!");
}

function getCircleName(circleId) {
  const c = (window.appStore.circles || []).find((x) => x.id === circleId);
  return c ? c.name : "—";
}

// ==========================================================================
// 5. الاختبارات (إضافة وحفظ وعرض)
// ==========================================================================
function openModalAddTest() {
  const circleSelect = document.getElementById("test-circle-select");
  if (circleSelect) {
    let options = '<option value="">— اختر الحلقة —</option>';
    (window.appStore.circles || []).forEach((c) => {
      options += `<option value="${c.id}">${c.name}</option>`;
    });
    circleSelect.innerHTML = options;
  }
  populateTestStudentsDropdown();
  openModal("modal-add-test");
}

function populateTestStudentsDropdown() {
  const circleId = document.getElementById("test-circle-select")?.value;
  const studentSelect = document.getElementById("test-student-select");
  if (!studentSelect) return;

  let options = '<option value="">— اختر الطالب —</option>';
  const list = circleId
    ? (window.appStore.students || []).filter(
        (s) => s.circleId === circleId && s.status === "active",
      )
    : (window.appStore.students || []).filter((s) => s.status === "active");

  list.forEach((s) => {
    options += `<option value="${s.id}">${s.name}</option>`;
  });
  studentSelect.innerHTML = options;
}

function handleSaveTest(e) {
  e.preventDefault();
  const circleId = document.getElementById("test-circle-select").value;
  const studentId = document.getElementById("test-student-select").value;
  const type = document.getElementById("test-type").value;
  const score = document.getElementById("test-score").value;
  const rating = document.getElementById("test-rating").value;

  const newTest = {
    id: "test_" + Date.now(),
    circleId,
    studentId,
    type,
    score,
    rating,
    date: new Date().toISOString().split("T")[0],
  };

  if (!window.appStore.tests) window.appStore.tests = [];
  window.appStore.tests.push(newTest);
  if (typeof saveToCloud === "function")
    saveToCloud("tests", newTest.id, newTest);

  closeModal("modal-add-test");
  e.target.reset();
  renderTestsTable();
  alert("✅ تم حفظ الاختبار بنجاح!");
}

function renderTestsTable() {
  const tbody = document.getElementById("tests-table-body");
  if (!tbody) return;

  const tests = window.appStore.tests || [];
  if (tests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-3">لا توجد اختبارات مسجلة بعد</td></tr>`;
    return;
  }

  let html = "";
  tests.forEach((t) => {
    const student = (window.appStore.students || []).find(
      (s) => s.id === t.studentId,
    );
    const circle = (window.appStore.circles || []).find(
      (c) => c.id === t.circleId,
    );

    html += `
      <tr>
        <td style="font-weight:700;">${student ? student.name : "طالب"}</td>
        <td><span class="badge badge-warning">${circle ? circle.name : "—"}</span></td>
        <td>${t.type}</td>
        <td style="font-weight:700; color:var(--primary-brown);">${t.score} / 100</td>
        <td><span class="badge badge-active">${t.rating}</span></td>
        <td>${t.date}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// ==========================================================================
// 6. لوحة الطلاب المتميزين (التميز الأسبوعي)
// ==========================================================================
function renderTamayuzBoard() {
  const tbody = document.getElementById("tamayuz-students-body");
  if (!tbody) return;

  const activeStudents = (window.appStore.students || []).filter(
    (s) => s.status === "active",
  );

  if (activeStudents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-3">لا يوجد طلاب متميزون مسجلون</td></tr>`;
    return;
  }

  let html = "";
  activeStudents.slice(0, 6).forEach((stu) => {
    const circle = (window.appStore.circles || []).find(
      (c) => c.id === stu.circleId,
    );
    const circleName = circle ? circle.name : "جامع الهدى";

    html += `
      <tr>
        <td style="font-weight: 800;">⭐ ${stu.name}</td>
        <td><span class="badge badge-warning">${circleName}</span></td>
        <td><span class="badge badge-active">100% (كامل الأسبوع)</span></td>
        <td><span class="badge badge-active">مكتمل 100%</span></td>
        <td><span class="badge badge-active">ممتاز مرتفع</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// ==========================================================================
// 7. إدارة الإشعارات والرسائل الموحدة مع التحديد الديناميكي
// ==========================================================================
function handleRecipientTypeChange(selectEl) {
  const specificGroup = document.getElementById("msg-specific-recipient-group");
  const specificSelect = document.getElementById("msg-specific-select");
  const specificLabel = document.getElementById("msg-specific-label");
  const val = selectEl.value;

  if (val === "specific_teacher") {
    specificGroup.classList.remove("style-hidden");
    specificLabel.textContent = "اختر المعلم المستهدف:";
    let opts = "";
    (window.appStore.teachers || []).forEach((t) => {
      opts += `<option value="${t.id}">${t.name}</option>`;
    });
    specificSelect.innerHTML = opts;
  } else if (val === "specific_student") {
    specificGroup.classList.remove("style-hidden");
    specificLabel.textContent = "اختر الطالب المستهدف:";
    let opts = "";
    (window.appStore.students || [])
      .filter((s) => s.status === "active")
      .forEach((s) => {
        opts += `<option value="${s.id}">${s.name}</option>`;
      });
    specificSelect.innerHTML = opts;
  } else {
    specificGroup.classList.add("style-hidden");
  }
}
