/**
 * ==========================================================================
 * admin.js - المحرك الإداري المحدث بالكامل الملتزم بكافة الشروط المحددة
 * ==========================================================================
 */

// تهيئة المخزن العام للحماية من أخطاء عدم التعريف
window.appStore = window.appStore || {
  students: [],
  teachers: [],
  circles: [],
  attendance: [],
  tests: [],
  profileRequests: [],
  tasmeea: [],
};

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

  if (attDateSelect && !attDateSelect.value) {
    attDateSelect.value = new Date().toISOString().split("T")[0];
  }
  if (attCircleSelect)
    attCircleSelect.addEventListener("change", renderAttendanceTable);
  if (attDateSelect)
    attDateSelect.addEventListener("change", renderAttendanceTable);
  if (attSearchInput)
    attSearchInput.addEventListener("input", renderAttendanceTable);

  // تجهيز حقول مطابقة أعمدة Excel الافتراضية
  if (typeof renderExcelColumnMappingInputs === "function") {
    renderExcelColumnMappingInputs();
  }
});

// ==========================================================================
// 1. إدارة الطلاب، استيراد Excel المرن، والصلاحيات المنفصلة (معلم / مدير)
// ==========================================================================
function switchStudentSubTab(tab) {
  const btnActive = document.getElementById("tab-btn-active-students");
  const btnPending = document.getElementById("tab-btn-pending-requests");
  const boxActive = document.getElementById("box-active-students-table");
  const boxPending = document.getElementById("box-pending-requests-table");

  if (tab === "active") {
    btnActive?.classList.add("active");
    btnPending?.classList.remove("active");
    boxActive?.classList.remove("style-hidden");
    boxPending?.classList.add("style-hidden");
    renderStudentsTable();
  } else {
    btnPending?.classList.add("active");
    btnActive?.classList.remove("active");
    boxPending?.classList.remove("style-hidden");
    boxActive?.classList.add("style-hidden");
    renderPendingRequestsTable();
  }
}

function renderStudentsTable() {
  const tbody = document.getElementById("students-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("search-students")?.value || "")
    .trim()
    .toLowerCase();
  const circleFilter =
    document.getElementById("filter-student-circle")?.value || "all";
  const statusFilter =
    document.getElementById("filter-student-status")?.value || "active";

  const user = window.currentUser;
  const isTeacher = user && user.role === "teacher";
  let studentsList = (window.appStore.students || []).filter(
    (s) => s.status !== "pending",
  );

  if (isTeacher) {
    const teachersList = window.appStore.teachers || [];
    const teacherObj =
      teachersList.find(
        (t) => t.userId === user.id || t.id === user.teacherId,
      ) || teachersList[0];
    const teacherId = teacherObj ? teacherObj.id : "t1";
    const teacherCircleIds = (window.appStore.circles || [])
      .filter(
        (c) =>
          (Array.isArray(c.teacherIds) && c.teacherIds.includes(teacherId)) ||
          c.teacherId === teacherId,
      )
      .map((c) => c.id);
    studentsList = studentsList.filter((s) =>
      teacherCircleIds.includes(s.circleId),
    );
  }

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
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">لا يوجد طلاب مطابقون للبحث</td></tr>`;
    updatePendingBadgeCount();
    return;
  }

  let html = "";
  filtered.forEach((student) => {
    const circle = (window.appStore.circles || []).find(
      (c) => c.id === student.circleId,
    );
    const circleName = circle ? circle.name : "غير مسجل";

    const actionBtn = isTeacher
      ? `<button class="btn btn-outline-brown btn-sm" onclick="openTeacherStudentModal('${student.id}')">✏️ تعديل السجل والتسميع</button>`
      : `<button class="btn btn-outline-brown btn-sm" onclick="openModalEditStudentComprehensive('${student.id}')">✏️ تعديل شامل</button>`;

    html += `
            <tr>
                <td style="font-weight: 700;">${student.name || "—"}</td>
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
                <td>${actionBtn}</td>
            </tr>
        `;
  });

  tbody.innerHTML = html;
  updatePendingBadgeCount();
}

function openModalEditStudentComprehensive(studentId) {
  const student = (window.appStore.students || []).find(
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

  const circleSelect = document.getElementById("edit-comp-circle");
  if (circleSelect) {
    let opts = '<option value="">— غير مسجل بحلقة —</option>';
    (window.appStore.circles || []).forEach((c) => {
      opts += `<option value="${c.id}" ${c.id === student.circleId ? "selected" : ""}>${c.name}</option>`;
    });
    circleSelect.innerHTML = opts;
  }

  if (typeof openModal === "function") {
    openModal("modal-edit-student-comprehensive");
  }
}

function handleSaveStudentComprehensive(e) {
  e.preventDefault();
  const studentId = document.getElementById("edit-comp-stu-id")?.value;
  const student = (window.appStore.students || []).find(
    (s) => s.id === studentId,
  );

  if (student) {
    student.name =
      document.getElementById("edit-comp-name")?.value.trim() || student.name;
    student.nationalId =
      document.getElementById("edit-comp-national-id")?.value.trim() || "";
    student.phone =
      document.getElementById("edit-comp-phone")?.value.trim() || "";
    student.parentName =
      document.getElementById("edit-comp-parent-name")?.value.trim() || "";
    student.parentRelation =
      document.getElementById("edit-comp-parent-relation")?.value.trim() ||
      "أب";
    student.parentPhone =
      document.getElementById("edit-comp-parent-phone")?.value.trim() || "";
    student.circleId = document.getElementById("edit-comp-circle")?.value || "";
    student.status =
      document.getElementById("edit-comp-status")?.value || "active";

    if (typeof saveToCloud === "function") {
      saveToCloud("students", student.id, student);
    }
    alert("✅ تم حفظ التعديلات الشاملة للطالب بنجاح!");
  }

  if (typeof closeModal === "function") {
    closeModal("modal-edit-student-comprehensive");
  }
  renderStudentsTable();
}

function openTeacherStudentModal(studentId) {
  const student = (window.appStore.students || []).find(
    (s) => s.id === studentId,
  );
  if (!student) return;

  const todayStr = new Date().toISOString().split("T")[0];
  const attRecord =
    (window.appStore.attendance || []).find(
      (a) => a.studentId === student.id && a.date === todayStr,
    ) || {};

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : "";
  };

  setVal("teacher-edit-stu-id", student.id);
  setVal("teacher-edit-stu-name", student.name);
  setVal("teacher-edit-stu-att", attRecord.status || "present");
  setVal("teacher-edit-stu-notes", attRecord.notes || "");

  if (typeof openModal === "function") {
    openModal("modal-teacher-edit-student-record");
  }
}

function handleTeacherSaveStudentRecord(e) {
  e.preventDefault();
  const studentId = document.getElementById("teacher-edit-stu-id")?.value;
  const status =
    document.getElementById("teacher-edit-stu-att")?.value || "present";
  const notes = document.getElementById("teacher-edit-stu-notes")?.value || "";
  const todayStr = new Date().toISOString().split("T")[0];

  const student = (window.appStore.students || []).find(
    (s) => s.id === studentId,
  );
  const recordId = `att_${studentId}_${todayStr}`;

  if (!window.appStore.attendance) window.appStore.attendance = [];

  let record = window.appStore.attendance.find((a) => a.id === recordId);
  if (!record) {
    record = {
      id: recordId,
      studentId,
      circleId: student ? student.circleId : "",
      date: todayStr,
      status,
      notes,
    };
    window.appStore.attendance.push(record);
  } else {
    record.status = status;
    record.notes = notes;
    if (student && !record.circleId) record.circleId = student.circleId;
  }

  if (typeof saveToCloud === "function") {
    saveToCloud("attendance", record.id, record);
  }

  if (typeof closeModal === "function") {
    closeModal("modal-teacher-edit-student-record");
  }
  alert("✅ تم حفظ تعديلات السجل بنجاح!");
  if (typeof renderAttendanceTable === "function") renderAttendanceTable();
}

// --------------------------------------------------------------------------
// نظام استيراد ملف Excel الديناميكي المرن
// --------------------------------------------------------------------------
const AVAILABLE_EXCEL_FIELDS = [
  { key: "name", label: "اسم الطالب الرباعي (إجباري)" },
  { key: "nationalId", label: "رقم الهوية" },
  { key: "phone", label: "رقم جوال الطالب" },
  { key: "parentPhone", label: "رقم جوال ولي الأمر" },
  { key: "parentName", label: "اسم ولي الأمر" },
  { key: "parentRelation", label: "صلة القرابة" },
  { key: "level", label: "المرحلة الدراسية" },
  { key: "district", label: "الحي السكني" },
  { key: "birthDate", label: "تاريخ الميلاد" },
  { key: "notes", label: "ملاحظات إضافية" },
  { key: "school", label: "اسم المدرسة" },
  { key: "quranLevel", label: "مقدار الحفظ السابق" },
  { key: "emergencyPhone", label: "رقم هاتف طوارئ بديل" },
  { key: "email", label: "البريد الإلكتروني" },
  { key: "customField", label: "حقل مخصص إضافي" },
];

function renderExcelColumnMappingInputs() {
  const container = document.getElementById("excel-columns-mapping-container");
  const countSelect = document.getElementById("excel-col-count");
  if (!container || !countSelect) return;

  const count = parseInt(countSelect.value, 10) || 4;
  let html = "";

  for (let i = 0; i < count; i++) {
    const defaultField = AVAILABLE_EXCEL_FIELDS[i]
      ? AVAILABLE_EXCEL_FIELDS[i].key
      : "customField";

    html += `
      <div class="form-group mb-2 p-2" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 6px;">
        <label style="font-size: 0.8rem; font-weight: 700;">العمود رقم [${i + 1}] في ملفك:</label>
        <select class="form-control excel-col-map-select" data-col-index="${i}" style="font-size: 0.85rem;">
          ${AVAILABLE_EXCEL_FIELDS.map(
            (f) => `
            <option value="${f.key}" ${f.key === defaultField ? "selected" : ""}>${f.label}</option>
          `,
          ).join("")}
        </select>
      </div>
    `;
  }

  container.innerHTML = html;
}

function executeDynamicExcelImport() {
  const fileInput = document.getElementById("excel-dynamic-file");
  const file = fileInput?.files?.[0];

  if (!file) {
    alert("⚠️ الرجاء اختيار ملف Excel أولاً!");
    return;
  }

  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة قراءة ملفات Excel غير متوفرة حالياً!");
    return;
  }

  const mapSelects = document.querySelectorAll(".excel-col-map-select");
  const fieldMapping = [];
  mapSelects.forEach((sel) => {
    fieldMapping.push(sel.value);
  });

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (!rows || rows.length <= 1) {
        alert("⚠️ الملف فارغ أو لا يحتوي على صفوف بيانات كافية!");
        return;
      }

      if (!window.appStore.students) window.appStore.students = [];

      let importedCount = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const newStudent = {
          id: "s_imp_" + Date.now() + "_" + i,
          name: "",
          nationalId: "",
          phone: "",
          parentPhone: "",
          parentName: "",
          parentRelation: "أب",
          level: "الابتدائية",
          circleId: "",
          status: "active",
          createdAt: Date.now(),
          extraFields: {},
        };

        fieldMapping.forEach((fieldKey, colIdx) => {
          const val =
            row[colIdx] !== undefined ? String(row[colIdx]).trim() : "";
          if (fieldKey in newStudent) {
            newStudent[fieldKey] = val;
          } else {
            newStudent.extraFields[fieldKey] = val;
          }
        });

        if (newStudent.name) {
          if (!newStudent.parentName) {
            newStudent.parentName = "ولي أمر " + newStudent.name.split(" ")[0];
          }
          window.appStore.students.push(newStudent);
          if (typeof saveToCloud === "function") {
            saveToCloud("students", newStudent.id, newStudent);
          }
          importedCount++;
        }
      }

      alert(
        `✅ تم بنجاح استيراد ومطابقة (${importedCount}) طالب في قاعدة بيانات جامع الهدى!`,
      );
      if (typeof closeModal === "function") closeModal("modal-excel-import");
      fileInput.value = "";
      renderStudentsTable();
    } catch (err) {
      alert("❌ حدث خطأ أثناء معالجة ملف Excel: " + err.message);
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
    updatePendingBadgeCount();
    return;
  }

  let html = "";
  pendingList.forEach((stu) => {
    html += `
      <tr>
        <td style="font-weight: 700;">${stu.name || "—"}</td>
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
    name: document.getElementById("stu-name")?.value.trim() || "",
    nationalId: document.getElementById("stu-id")?.value.trim() || "",
    phone: document.getElementById("stu-phone")?.value.trim() || "",
    parentName: document.getElementById("stu-parent-name")?.value.trim() || "",
    parentRelation:
      document.getElementById("stu-parent-relation")?.value.trim() || "أب",
    parentPhone:
      document.getElementById("stu-parent-phone")?.value.trim() || "",
    circleId: document.getElementById("stu-circle")?.value || "",
    status: "active",
    createdAt: Date.now(),
  };

  if (!window.appStore.students) window.appStore.students = [];
  window.appStore.students.push(newStudent);

  if (typeof saveToCloud === "function") {
    saveToCloud("students", newStudent.id, newStudent);
  }

  if (typeof closeModal === "function") closeModal("modal-add-student");
  e.target.reset();
  if (typeof refreshAllViews === "function") refreshAllViews();
  alert("✅ تم إضافة الطالب بنجاح!");
}

function handleSelfRegistration(e) {
  e.preventDefault();
  const newRequest = {
    id: "s_req_" + Date.now(),
    name: document.getElementById("reg-stu-name")?.value.trim() || "",
    nationalId: document.getElementById("reg-stu-id")?.value.trim() || "",
    phone: document.getElementById("reg-stu-phone")?.value.trim() || "",
    parentName: document.getElementById("reg-parent-name")?.value.trim() || "",
    parentRelation:
      document.getElementById("reg-parent-relation")?.value.trim() || "أب",
    parentPhone:
      document.getElementById("reg-parent-phone")?.value.trim() || "",
    circleId: "",
    status: "pending",
    requestDate: new Date().toLocaleDateString("ar-SA"),
  };

  if (!window.appStore.students) window.appStore.students = [];
  window.appStore.students.push(newRequest);

  if (typeof saveToCloud === "function") {
    saveToCloud("students", newRequest.id, newRequest);
  }

  if (typeof closeModal === "function") closeModal("modal-self-register");
  e.target.reset();
  alert("✅ تم إرسال طلب التقديم بنجاح! سيتم مراجعته من قبل إدارة جامع الهدى.");
}

function approveStudentRequest(studentId) {
  const student = (window.appStore.students || []).find(
    (s) => s.id === studentId,
  );
  if (!student) return;

  student.status = "active";
  if (typeof saveToCloud === "function") {
    saveToCloud("students", student.id, student);
  }

  alert(`✅ تم قبول انضمام الطالب (${student.name}) بنجاح!`);
  renderPendingRequestsTable();
}

function rejectStudentRequest(studentId) {
  if (!confirm("هل أنت متأكد من رفض هذا الطلب؟")) return;

  window.appStore.students = (window.appStore.students || []).filter(
    (s) => s.id !== studentId,
  );

  renderPendingRequestsTable();
}

function toggleArchiveStudent(studentId) {
  const student = (window.appStore.students || []).find(
    (s) => s.id === studentId,
  );
  if (!student) return;

  student.status = student.status === "active" ? "archived" : "active";
  if (typeof saveToCloud === "function") {
    saveToCloud("students", student.id, student);
  }

  renderStudentsTable();
}

// ==========================================================================
// 2. إدارة المعلمين والمتابعة المدمجة بالكامل
// ==========================================================================
function renderTeachersTable() {
  const tbody = document.getElementById("teachers-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("search-teachers")?.value || "")
    .trim()
    .toLowerCase();

  const filtered = (window.appStore.teachers || []).filter(
    (t) =>
      (t.name && t.name.toLowerCase().includes(searchVal)) ||
      (t.phone && String(t.phone).includes(searchVal)),
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">لا يوجد معلمون مطابقون</td></tr>`;
    return;
  }

  let html = "";
  filtered.forEach((t) => {
    const teacherCircles = (window.appStore.circles || []).filter(
      (c) =>
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(t.id)) ||
        c.teacherId === t.id,
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
                <td>${t.phone || "—"}</td>
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
  const nameEl = document.getElementById("teach-name");
  const phoneEl = document.getElementById("teach-phone");
  if (nameEl) nameEl.value = "";
  if (phoneEl) phoneEl.value = "";

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

  if (typeof openModal === "function") openModal("modal-add-teacher");
}

function handleAddTeacher(e) {
  e.preventDefault();
  const name = document.getElementById("teach-name")?.value.trim() || "";
  const phone = document.getElementById("teach-phone")?.value.trim() || "";

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

  if (!window.appStore.teachers) window.appStore.teachers = [];
  window.appStore.teachers.push(newTeacher);

  if (typeof saveToCloud === "function") {
    saveToCloud("teachers", newTeacher.id, newTeacher);
  }

  (window.appStore.circles || []).forEach((c) => {
    if (selectedCircles.includes(c.id)) {
      if (!Array.isArray(c.teacherIds)) c.teacherIds = [];
      if (!c.teacherIds.includes(newTeacherId)) c.teacherIds.push(newTeacherId);
      if (!c.teacherId) c.teacherId = newTeacherId;
      if (typeof saveToCloud === "function") saveToCloud("circles", c.id, c);
    }
  });

  if (typeof closeModal === "function") closeModal("modal-add-teacher");
  e.target.reset();
  if (typeof refreshAllViews === "function") refreshAllViews();
  alert("✅ تم إضافة المعلم وتكليفه بالحلقات بنجاح!");
}

function toggleTeacherStatus(teacherId) {
  const teacher = (window.appStore.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  teacher.status = teacher.status === "active" ? "suspended" : "active";
  if (typeof saveToCloud === "function") {
    saveToCloud("teachers", teacher.id, teacher);
  }

  renderTeachersTable();
}

function openModalEditTeacherMonitoring(teacherId) {
  const teacher = (window.appStore.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : "";
  };

  setVal("edit-monitoring-teacher-id", teacher.id);
  setVal("edit-monitoring-name", teacher.name);
  setVal("edit-monitoring-last-login", teacher.lastLogin || "اليوم 04:30 م");
  setVal(
    "edit-monitoring-att-rate",
    teacher.customAttendanceRate !== null &&
      teacher.customAttendanceRate !== undefined
      ? teacher.customAttendanceRate
      : 85,
  );
  setVal(
    "edit-monitoring-tas-rate",
    teacher.customTasmeeaRate !== null &&
      teacher.customTasmeeaRate !== undefined
      ? teacher.customTasmeeaRate
      : 90,
  );

  if (typeof openModal === "function")
    openModal("modal-edit-teacher-monitoring");
}

function handleSaveTeacherMonitoring(e) {
  e.preventDefault();
  const teacherId = document.getElementById(
    "edit-monitoring-teacher-id",
  )?.value;
  const teacher = (window.appStore.teachers || []).find(
    (t) => t.id === teacherId,
  );

  if (teacher) {
    teacher.lastLogin =
      document.getElementById("edit-monitoring-last-login")?.value || "";
    teacher.customAttendanceRate = parseInt(
      document.getElementById("edit-monitoring-att-rate")?.value || "0",
      10,
    );
    teacher.customTasmeeaRate = parseInt(
      document.getElementById("edit-monitoring-tas-rate")?.value || "0",
      10,
    );

    if (typeof saveToCloud === "function") {
      saveToCloud("teachers", teacher.id, teacher);
    }
    alert("✅ تم تعديل بيانات المتابعة بنجاح!");
  }

  if (typeof closeModal === "function")
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

  const searchVal = (document.getElementById("search-circles")?.value || "")
    .trim()
    .toLowerCase();
  const user = window.currentUser;

  let circlesList = window.appStore.circles || [];

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

  const filtered = circlesList.filter(
    (c) => c.name && c.name.toLowerCase().includes(searchVal),
  );

  if (countTitle) countTitle.textContent = `${circlesList.length} حلقة`;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state-card"><h3>لا توجد حلقات مطابقة</h3></div>`;
    return;
  }

  let html = "";
  filtered.forEach((circle) => {
    let assignedTeachers = [];
    if (Array.isArray(circle.teacherIds) && circle.teacherIds.length > 0) {
      assignedTeachers = (window.appStore.teachers || []).filter((t) =>
        circle.teacherIds.includes(t.id),
      );
    } else if (circle.teacherId) {
      const singleTeacher = (window.appStore.teachers || []).find(
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
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  const setTitle = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setTitle("modal-circle-title", "إضافة حلقة جديدة بجامع الهدى");
  setVal("edit-circle-id", "");
  setVal("circle-name", "");
  setVal("search-modal-teachers", "");
  setVal("search-modal-students", "");

  populateCircleTeachersList([]);
  populateCircleStudentsList([]);

  if (typeof openModal === "function") openModal("modal-add-circle");
}

function openModalEditCircle(circleId) {
  const circle = (window.appStore.circles || []).find((c) => c.id === circleId);
  if (!circle) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  const setTitle = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setTitle("modal-circle-title", `تعديل حلقة: ${circle.name}`);
  setVal("edit-circle-id", circle.id);
  setVal("circle-name", circle.name);
  setVal("search-modal-teachers", "");
  setVal("search-modal-students", "");

  const currentTeacherIds =
    circle.teacherIds || (circle.teacherId ? [circle.teacherId] : []);
  const currentStudents = (window.appStore.students || [])
    .filter((s) => s.circleId === circleId)
    .map((s) => s.id);

  populateCircleTeachersList(currentTeacherIds);
  populateCircleStudentsList(currentStudents);

  if (typeof openModal === "function") openModal("modal-add-circle");
}

function filterCircleModalTeachers() {
  const q = (document.getElementById("search-modal-teachers")?.value || "")
    .trim()
    .toLowerCase();
  document
    .querySelectorAll("#circle-teachers-list .checkbox-item-row")
    .forEach((el) => {
      const text = el.textContent.toLowerCase();
      el.style.display = text.includes(q) ? "flex" : "none";
    });
}

function filterCircleModalStudents() {
  const q = (document.getElementById("search-modal-students")?.value || "")
    .trim()
    .toLowerCase();
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
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(t.id)) ||
        c.teacherId === t.id,
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
  const editId = document.getElementById("edit-circle-id")?.value;
  const name =
    document.getElementById("circle-name")?.value.trim() || "حلقة جديدة";

  const selectedTeachers = [];
  document
    .querySelectorAll('input[name="circle_teachers"]:checked')
    .forEach((cb) => selectedTeachers.push(cb.value));

  const selectedStudents = [];
  document
    .querySelectorAll('input[name="circle_students"]:checked')
    .forEach((cb) => selectedStudents.push(cb.value));

  if (!window.appStore.circles) window.appStore.circles = [];

  if (editId) {
    const circle = window.appStore.circles.find((c) => c.id === editId);
    if (circle) {
      circle.name = name;
      circle.teacherIds = selectedTeachers;
      circle.teacherId = selectedTeachers[0] || "";
      if (typeof saveToCloud === "function") {
        saveToCloud("circles", circle.id, circle);
      }
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
    if (typeof saveToCloud === "function") {
      saveToCloud("circles", newCircle.id, newCircle);
    }

    (window.appStore.students || []).forEach((s) => {
      if (selectedStudents.includes(s.id)) {
        s.circleId = newCircleId;
        if (typeof saveToCloud === "function") saveToCloud("students", s.id, s);
      }
    });

    alert("✅ تم إنشاء الحلقة وتعيين الأعضاء بنجاح!");
  }

  if (typeof closeModal === "function") closeModal("modal-add-circle");
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
  )
    .trim()
    .toLowerCase();

  if (!tbody) return;

  if (!circleId) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4">يرجى اختيار الحلقة لعرض قائمة الحضور والغياب</td></tr>`;
    return;
  }

  let students = (window.appStore.students || []).filter(
    (s) => s.circleId === circleId && s.status === "active",
  );

  if (searchStudentVal) {
    students = students.filter(
      (s) => s.name && s.name.toLowerCase().includes(searchStudentVal),
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
  const dateVal = document.getElementById("attendance-date-select")?.value;
  const circleId = document.getElementById("attendance-circle-select")?.value;
  const recordId = `att_${studentId}_${dateVal}`;

  if (!window.appStore.attendance) window.appStore.attendance = [];

  let record = window.appStore.attendance.find((a) => a.id === recordId);
  if (!record) {
    record = {
      id: recordId,
      studentId,
      circleId: circleId || "",
      date: dateVal,
      status,
      notes: "",
    };
    window.appStore.attendance.push(record);
  } else {
    record.status = status;
  }

  if (typeof saveToCloud === "function") {
    saveToCloud("attendance", record.id, record);
  }
}

function updateAttendanceNotes(studentId, notesVal) {
  const dateVal = document.getElementById("attendance-date-select")?.value;
  const recordId = `att_${studentId}_${dateVal}`;

  let record = (window.appStore.attendance || []).find(
    (a) => a.id === recordId,
  );
  if (record) {
    record.notes = notesVal;
    if (typeof saveToCloud === "function") {
      saveToCloud("attendance", record.id, record);
    }
  }
}

function markAllPresent() {
  const circleId = document.getElementById("attendance-circle-select")?.value;
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
  if (typeof openModal === "function") openModal("modal-add-test");
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
  const circleId = document.getElementById("test-circle-select")?.value || "";
  const studentId = document.getElementById("test-student-select")?.value || "";
  const type = document.getElementById("test-type")?.value || "شهري";
  const score = document.getElementById("test-score")?.value || "100";
  const rating = document.getElementById("test-rating")?.value || "ممتاز";

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

  if (typeof saveToCloud === "function") {
    saveToCloud("tests", newTest.id, newTest);
  }

  if (typeof closeModal === "function") closeModal("modal-add-test");
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
        <td>${t.type || "—"}</td>
        <td style="font-weight:700; color:var(--primary-brown);">${t.score || "0"} / 100</td>
        <td><span class="badge badge-active">${t.rating || "—"}</span></td>
        <td>${t.date || "—"}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// ==========================================================================
// 6. لوحة الطلاب المتميزين (التميز الأسبوعي)
// ==========================================================================
function renderTamayuzBoard() {
  const adminTbody = document.getElementById("tamayuz-students-body");
  const stuHomeTbody = document.getElementById("stu-home-tamayuz-body");

  const activeStudents = (window.appStore.students || []).filter(
    (s) => s.status === "active",
  );

  if (activeStudents.length === 0) {
    const emptyMsg = `<tr><td colspan="5" class="text-center text-muted p-3">لا يوجد طلاب متميزون مسجلون</td></tr>`;
    if (adminTbody) adminTbody.innerHTML = emptyMsg;
    if (stuHomeTbody) stuHomeTbody.innerHTML = emptyMsg;
    return;
  }

  let adminHtml = "";
  let stuHomeHtml = "";

  activeStudents.slice(0, 6).forEach((stu) => {
    const circle = (window.appStore.circles || []).find(
      (c) => c.id === stu.circleId,
    );
    const circleName = circle ? circle.name : "جامع الهدى";

    adminHtml += `
      <tr>
        <td style="font-weight: 800;">⭐ ${stu.name}</td>
        <td><span class="badge badge-warning">${circleName}</span></td>
        <td><span class="badge badge-active">100% (حضور كامل)</span></td>
        <td><span class="badge badge-active">مكتمل 100%</span></td>
        <td><span class="badge badge-active">ممتاز مرتفع</span></td>
      </tr>
    `;

    stuHomeHtml += `
      <tr>
        <td style="font-weight: 800;">⭐ ${stu.name}</td>
        <td><span class="badge badge-warning">${circleName}</span></td>
        <td><span class="badge badge-active">100%</span></td>
        <td><span class="badge badge-active">مكتمل 100%</span></td>
      </tr>
    `;
  });

  if (adminTbody) adminTbody.innerHTML = adminHtml;
  if (stuHomeTbody) stuHomeTbody.innerHTML = stuHomeHtml;
}

// ==========================================================================
// 7. إدارة الإشعارات والرسائل
// ==========================================================================
function handleRecipientTypeChange(selectEl) {
  const specificGroup = document.getElementById("msg-specific-recipient-group");
  const specificSelect = document.getElementById("msg-specific-select");
  const specificLabel = document.getElementById("msg-specific-label");
  const val = selectEl?.value;

  if (val === "specific_teacher") {
    specificGroup?.classList.remove("style-hidden");
    if (specificLabel) specificLabel.textContent = "اختر المعلم المستهدف:";
    let opts = "";
    (window.appStore.teachers || []).forEach((t) => {
      opts += `<option value="${t.id}">${t.name}</option>`;
    });
    if (specificSelect) specificSelect.innerHTML = opts;
  } else if (val === "specific_student") {
    specificGroup?.classList.remove("style-hidden");
    if (specificLabel) specificLabel.textContent = "اختر الطالب المستهدف:";
    let opts = "";
    (window.appStore.students || [])
      .filter((s) => s.status === "active")
      .forEach((s) => {
        opts += `<option value="${s.id}">${s.name}</option>`;
      });
    if (specificSelect) specificSelect.innerHTML = opts;
  } else {
    specificGroup?.classList.add("style-hidden");
  }
}

// ==========================================================================
// 8. إدارة طلبات تعديل بيانات الطلاب
// ==========================================================================
function renderProfileRequestsList() {
  const container = document.getElementById("profile-requests-list");
  const badgeCount = document.getElementById("profile-requests-count");
  if (!container) return;

  const requests = (window.appStore.profileRequests || []).filter(
    (r) => r.status === "pending",
  );

  if (badgeCount) badgeCount.textContent = requests.length;

  if (requests.length === 0) {
    container.innerHTML =
      '<p class="text-muted p-2" style="font-size: 0.85rem;">لا توجد طلبات تعديل معلقة حالياً</p>';
    return;
  }

  let html = "";
  requests.forEach((req) => {
    html += `
      <div class="p-2 mb-2" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.85rem;">
        <div class="flex-between">
          <strong>${req.studentName || "طالب"}</strong>
          <span class="text-muted" style="font-size: 0.75rem;">${req.date || ""}</span>
        </div>
        <p class="mt-1" style="color: var(--text-dark);">الاسم الجديد: <strong>${req.newName || "—"}</strong> | الجوال: <strong>${req.newPhone || "—"}</strong></p>
        <div class="mt-1 flex-align-gap">
          <button class="btn btn-success btn-sm" onclick="approveProfileRequest('${req.id}')">🟢 اعتماد</button>
          <button class="btn btn-danger btn-sm" onclick="rejectProfileRequest('${req.id}')">🔴 رفض</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function approveProfileRequest(reqId) {
  const req = (window.appStore.profileRequests || []).find(
    (r) => r.id === reqId,
  );
  if (!req) return;

  const student = (window.appStore.students || []).find(
    (s) => s.id === req.studentId,
  );
  if (student) {
    if (req.newName) student.name = req.newName;
    if (req.newPhone) student.phone = req.newPhone;
    if (typeof saveToCloud === "function") {
      saveToCloud("students", student.id, student);
    }
  }

  req.status = "approved";
  if (typeof saveToCloud === "function") {
    saveToCloud("profileRequests", req.id, req);
  }

  alert(`✅ تم اعتماد التعديلات للطالب (${req.studentName}) بنجاح!`);
  renderProfileRequestsList();
  renderStudentsTable();
}

function rejectProfileRequest(reqId) {
  const req = (window.appStore.profileRequests || []).find(
    (r) => r.id === reqId,
  );
  if (!req) return;

  req.status = "rejected";
  if (typeof saveToCloud === "function") {
    saveToCloud("profileRequests", req.id, req);
  }

  alert(`❌ تم رفض طلب التعديل.`);
  renderProfileRequestsList();
}
