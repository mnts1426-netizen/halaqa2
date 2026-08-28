/**
 * ==========================================================================
 * admin.js - المحرك الإداري الشامل، استيراد الطلاب بـ 7 أعمدة، تصدير PDF، وتحديد الموقع
 * ==========================================================================
 */

// تهيئة المخزن العام بقوائم نظيفة تماماً بدون أي بيانات افتراضية
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
  trophyStudentId: null,
};

document.addEventListener("DOMContentLoaded", () => {
  const formAddStudent = document.getElementById("form-add-student");
  if (formAddStudent)
    formAddStudent.addEventListener("submit", handleAddStudent);

  const formAddTeacher = document.getElementById("form-add-teacher");
  if (formAddTeacher)
    formAddTeacher.addEventListener("submit", handleAddTeacher);

  const formAddCircle = document.getElementById("form-add-circle");
  if (formAddCircle) formAddCircle.addEventListener("submit", handleSaveCircle);

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

  // تاريخ تحضير المعلمين والمدير الافتراضي
  const teachAttDateSelect = document.getElementById(
    "teacher-attendance-date-select",
  );
  if (teachAttDateSelect && !teachAttDateSelect.value) {
    teachAttDateSelect.value = new Date().toISOString().split("T")[0];
  }

  const searchTestsInput = document.getElementById("search-tests");
  if (searchTestsInput)
    searchTestsInput.addEventListener("input", renderTestsTable);

  const filterTestCircle = document.getElementById("filter-test-circle");
  if (filterTestCircle)
    filterTestCircle.addEventListener("change", renderTestsTable);

  const searchTeacherNotesInput = document.getElementById(
    "search-teacher-notes",
  );
  if (searchTeacherNotesInput)
    searchTeacherNotesInput.addEventListener("input", renderTeacherNotesTable);

  const filterTeacherNotesCircle = document.getElementById(
    "filter-teacher-notes-circle",
  );
  if (filterTeacherNotesCircle)
    filterTeacherNotesCircle.addEventListener(
      "change",
      renderTeacherNotesTable,
    );

  const searchAccountsInput = document.getElementById("search-accounts");
  if (searchAccountsInput)
    searchAccountsInput.addEventListener("input", renderAccountsTable);

  const filterAccountRole = document.getElementById("filter-account-role");
  if (filterAccountRole)
    filterAccountRole.addEventListener("change", renderAccountsTable);

  const filterAccountStatus = document.getElementById("filter-account-status");
  if (filterAccountStatus)
    filterAccountStatus.addEventListener("change", renderAccountsTable);

  if (typeof renderExcelColumnMappingInputs === "function") {
    renderExcelColumnMappingInputs();
  }
});

// دالة تصدير أي جدول أو قسم إلى PDF مباشرة
window.exportElementToPDF = function (elementId, fileName, titleText) {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (typeof html2pdf === "undefined") {
    window.print();
    return;
  }

  const opt = {
    margin: [10, 10, 10, 10],
    filename: `${fileName}_${new Date().toISOString().split("T")[0]}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
  };

  html2pdf().set(opt).from(el).save();
};

window.exportTeachersPDF = function () {
  exportElementToPDF(
    "box-teachers-list-table",
    "قائمة_المعلمين",
    "قائمة المعلمين",
  );
};

window.exportTeachersAttendancePDF = function () {
  exportElementToPDF(
    "box-teachers-attendance-table",
    "تحضير_المعلمين_اليومي",
    "تحضير المعلمين اليومي",
  );
};

window.exportStudentsPDF = function () {
  exportElementToPDF(
    "box-active-students-table",
    "قائمة_الطلاب",
    "قائمة الطلاب",
  );
};

window.exportAttendancePDF = function () {
  exportElementToPDF("attendance-table-wrapper", "سجل_التحضير", "سجل التحضير");
};

window.exportTeacherNotesPDF = function () {
  exportElementToPDF(
    "view-teacher-notes",
    "ملاحظات_المعلمين",
    "ملاحظات المعلمين",
  );
};

window.exportAccountsPDF = function () {
  exportElementToPDF("view-accounts", "إدارة_الحسابات", "إدارة الحسابات");
};

window.exportTestsPDF = function () {
  exportElementToPDF("tests-list-card", "سجل_الاختبارات", "سجل الاختبارات");
};

// خاصية تحديد الموقع الجغرافي التلقائي للمَجْمَع
window.getCurrentLocationCoords = function () {
  if (!navigator.geolocation) {
    alert("⚠️ خاصية تحديد الموقع غير مدعومة في جهازك أو متصفحك.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
      const locInput = document.getElementById("set-org-location");
      if (locInput) locInput.value = coords;
      alert(`✅ تم تحديد موقع المَجْمَع بنجاح: (${coords})`);
    },
    (err) => {
      alert(
        "⚠️ تعذر جلب الموقع تلقائياً. يرجى تفعيل إذن الموقع الجغرافي في المتصفح أو إدخال رابط خرائط Google يدوياً.",
      );
    },
  );
};

// حفظ إعدادات وهوية وموقع المَجْمَع للمدير
window.handleSaveOrgSettings = function (e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!window.appStore.settings) window.appStore.settings = {};

  const orgName =
    document.getElementById("set-org-name")?.value.trim() ||
    "مَجْمَع عبدالله بن مهدي القرآني";
  const subTitle =
    document.getElementById("set-org-mosque")?.value.trim() || "جامع الهدى";
  const directorName =
    document.getElementById("set-org-director")?.value.trim() || "صالح ال ناشع";
  const headerFontSize =
    document.getElementById("set-header-font-size")?.value || "13px";
  const logoNew =
    document.getElementById("set-org-logo-new")?.value.trim() || "logo12.jpeg";
  const logoOld =
    document.getElementById("set-org-logo-old")?.value.trim() ||
    "logo_transparent_1.png";
  const location =
    document.getElementById("set-org-location")?.value.trim() || "";

  window.appStore.settings.orgName = orgName;
  window.appStore.settings.subTitle = subTitle;
  window.appStore.settings.directorName = directorName;
  window.appStore.settings.headerFontSize = headerFontSize;
  window.appStore.settings.logoNew = logoNew;
  window.appStore.settings.logoOld = logoOld;
  window.appStore.settings.location = location;

  if (typeof saveToCloud === "function") {
    saveToCloud("settings", "general", window.appStore.settings);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();
  if (typeof applyAppIdentity === "function") applyAppIdentity();

  alert("✅ تم حفظ وتثبيت إعدادات وهوية وموقع المَجْمَع بنجاح!");
};

// إعداد خريطة الأعمدة الـ 7 المطلوبة لاستيراد الطلاب من ملف Excel
window.renderExcelColumnMappingInputs = function () {
  const container = document.getElementById("excel-columns-mapping-container");
  if (!container) return;

  const default7Labels = [
    "1. اسم الطالب",
    "2. رقم الهوية الوطنية",
    "3. عمر الطالب",
    "4. اسم ولي الأمر",
    "5. رقم جوال ولي الأمر",
    "6. صلة القرابة",
    "7. مكان السكن (أو الحي)",
  ];

  let html = "";
  default7Labels.forEach((label, i) => {
    html += `
      <div class="p-2" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 6px;">
        <small style="font-weight: 800; color: var(--primary-brown);">${label}</small>
        <input type="text" class="form-control mt-1" value="العمود رقم (${i + 1})" style="font-size: 0.82rem; font-weight: 700; background: #fafcfb;" readonly />
      </div>
    `;
  });
  container.innerHTML = html;
};

// تنفيذ الاستيراد الذكي للطلاب بـ 7 أعمدة كاملة
window.executeDynamicExcelImport = function () {
  const fileInput = document.getElementById("excel-dynamic-file");
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert("⚠️ يرجى اختيار ملف Excel أولاً!");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (rows.length === 0) {
        alert("⚠️ ملف Excel فارغ!");
        return;
      }

      let importedCount = 0;
      if (!window.appStore.students) window.appStore.students = [];
      if (!window.appStore.users) window.appStore.users = [];

      // تخطي صف العناوين إن وجد والبدء بقراءة البيانات
      const startIndex =
        typeof rows[0][0] === "string" &&
        (rows[0][0].includes("اسم") || rows[0][0].includes("طالب"))
          ? 1
          : 0;

      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[0]) continue;

        const stuName = String(row[0] || "").trim();
        const stuNatId = String(row[1] || "").trim();
        const stuAge = String(row[2] || "").trim();
        const stuParentName = String(row[3] || "").trim();
        const stuParentPhone = String(row[4] || "").trim();
        const stuParentRelation = String(row[5] || "أب").trim();
        const stuResidence = String(row[6] || "").trim();

        if (!stuName) continue;

        const studentId =
          "stu_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

        const newStudent = {
          id: studentId,
          name: stuName,
          nationalId: stuNatId,
          age: stuAge,
          parentName: stuParentName,
          parentPhone: stuParentPhone,
          parentRelation: stuParentRelation || "أب",
          residence: stuResidence,
          phone: stuParentPhone,
          circleId: "",
          status: "active",
          createdAt: Date.now(),
        };

        window.appStore.students.push(newStudent);

        // إنشاء وتثبيت حساب دخول الطالب تلقائياً بالهوية
        const defaultPassword = stuNatId
          ? stuNatId.length >= 4
            ? stuNatId.slice(-4)
            : stuNatId
          : "1234";
        const studentUserRec = {
          id: studentId,
          name: stuName,
          role: "student",
          username: stuNatId || stuParentPhone || studentId,
          pass: defaultPassword,
          status: "active",
          createdAt: Date.now(),
        };
        window.appStore.users.push(studentUserRec);

        if (typeof saveToCloud === "function") {
          saveToCloud("students", newStudent.id, newStudent);
          saveToCloud("users", studentUserRec.id, studentUserRec);
        }

        importedCount++;
      }

      if (typeof saveLocalStore === "function") saveLocalStore();
      if (typeof closeModal === "function") closeModal("modal-excel-import");

      alert(
        `✅ تم بنجاح استيراد (${importedCount}) طالب ببياناتهم الكاملة (7 أعمدة)!`,
      );
      renderStudentsTable();
      if (typeof renderAccountsTable === "function") renderAccountsTable();
      fileInput.value = "";
    } catch (err) {
      console.error(err);
      alert("⚠️ حدث خطأ أثناء معالجة ملف Excel، يرجى التأكد من صيغة الملف.");
    }
  };

  reader.readAsArrayBuffer(file);
};

// 1. التنقل بين الأقسام داخل شاشة إدارة المَجْمَع
function switchComplexSection(section) {
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

  [secCircles, secTeachers, secStudents].forEach((sec) =>
    sec?.classList.add("style-hidden"),
  );

  if (section === "circles") {
    if (btnCircles) {
      btnCircles.style.borderColor = "var(--primary-brown)";
      const h3 = btnCircles.querySelector("h3");
      if (h3) h3.style.color = "var(--primary-brown)";
    }
    secCircles?.classList.remove("style-hidden");
    renderCirclesCards();
  } else if (section === "teachers") {
    if (btnTeachers) {
      btnTeachers.style.borderColor = "var(--primary-brown)";
      const h3 = btnTeachers.querySelector("h3");
      if (h3) h3.style.color = "var(--primary-brown)";
    }
    secTeachers?.classList.remove("style-hidden");
    renderTeachersTable();
  } else if (section === "students") {
    if (btnStudents) {
      btnStudents.style.borderColor = "var(--primary-brown)";
      const h3 = btnStudents.querySelector("h3");
      if (h3) h3.style.color = "var(--primary-brown)";
    }
    secStudents?.classList.remove("style-hidden");
    renderStudentsTable();
  }
}

// 2. إدارة الطلاب
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

function toggleSelectAllStudents(masterCheckbox) {
  const cbs = document.querySelectorAll(".student-select-cb");
  cbs.forEach((cb) => {
    cb.checked = masterCheckbox.checked;
  });
  updateBulkToolbarCount();
}

function getSelectedStudentIds() {
  const checked = document.querySelectorAll(".student-select-cb:checked");
  const ids = [];
  checked.forEach((cb) => ids.push(cb.value));
  return ids;
}

function updateBulkToolbarCount() {
  const ids = getSelectedStudentIds();
  const countSpan = document.getElementById("selected-students-count");
  if (countSpan) countSpan.textContent = ids.length;

  const masterCb = document.getElementById("select-all-students-cb");
  const allCbs = document.querySelectorAll(".student-select-cb");
  if (masterCb && allCbs.length > 0) {
    masterCb.checked = ids.length === allCbs.length;
  }
}

function openBulkCircleModal(actionType) {
  const selectedIds = getSelectedStudentIds();
  if (selectedIds.length === 0) {
    alert("⚠️ يرجى تحديد طالب واحد على الأقل أولاً!");
    return;
  }

  const titleEl = document.getElementById("modal-bulk-circle-title");
  const descEl = document.getElementById("bulk-circle-desc");
  const typeInput = document.getElementById("bulk-circle-action-type");
  const circleSelect = document.getElementById("bulk-target-circle");

  if (typeInput) typeInput.value = actionType;

  if (actionType === "assign") {
    if (titleEl)
      titleEl.textContent = `➕ إضافة (${selectedIds.length}) طلاب إلى حلقة`;
    if (descEl)
      descEl.textContent = "اختر الحلقة التي ترغب بإلحاق الطلاب المحددين بها:";
  } else {
    if (titleEl)
      titleEl.textContent = `🔄 نقل (${selectedIds.length}) طلاب إلى حلقة أخرى`;
    if (descEl)
      descEl.textContent = "اختر الحلقة الجديدة التي سيتم نقل الطلاب إليها:";
  }

  if (circleSelect) {
    let opts = '<option value="">— اختر الحلقة —</option>';
    (window.appStore.circles || []).forEach((c) => {
      opts += `<option value="${c.id}">${c.name}</option>`;
    });
    circleSelect.innerHTML = opts;
  }

  if (typeof openModal === "function") openModal("modal-bulk-circle");
}

function handleBulkCircleSubmit(e) {
  e.preventDefault();
  const actionType =
    document.getElementById("bulk-circle-action-type")?.value || "assign";
  const targetCircleId = document.getElementById("bulk-target-circle")?.value;
  const selectedIds = getSelectedStudentIds();

  if (!targetCircleId || selectedIds.length === 0) {
    alert("⚠️ يرجى اختيار الحلقة وتحديد الطلاب!");
    return;
  }

  const targetCircle = (window.appStore.circles || []).find(
    (c) => c.id === targetCircleId,
  );
  const circleName = targetCircle ? targetCircle.name : "الحلقة";

  let updatedCount = 0;
  (window.appStore.students || []).forEach((s) => {
    if (selectedIds.includes(s.id)) {
      s.circleId = targetCircleId;
      if (typeof saveToCloud === "function") saveToCloud("students", s.id, s);
      updatedCount++;
    }
  });

  if (typeof closeModal === "function") closeModal("modal-bulk-circle");
  alert(`✅ تم بنجاح معالجة (${updatedCount}) طالب في حلقة (${circleName})!`);
  renderStudentsTable();
  if (typeof renderCirclesCards === "function") renderCirclesCards();
}

function executeBulkDeleteStudents() {
  const selectedIds = getSelectedStudentIds();
  if (selectedIds.length === 0) {
    alert("⚠️ يرجى تحديد الطلاب المراد حذفهم أولاً!");
    return;
  }

  if (!confirm(`⚠️ هل أنت متأكد من حذف (${selectedIds.length}) طالب نهائياً؟`))
    return;

  window.appStore.students = (window.appStore.students || []).filter(
    (s) => !selectedIds.includes(s.id),
  );

  selectedIds.forEach((id) => {
    if (typeof saveToCloud === "function")
      saveToCloud("students", id, null, true);
  });

  alert(`✅ تم حذف (${selectedIds.length}) طالب بنجاح!`);
  renderStudentsTable();
  if (typeof renderAccountsTable === "function") renderAccountsTable();
  if (typeof renderCirclesCards === "function") renderCirclesCards();
}

function executeBulkExportStudentsExcel() {
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }

  let studentsToExport = (window.appStore.students || []).filter(
    (s) => s.status === "active",
  );
  const exportData = studentsToExport.map((s, idx) => {
    const circle = (window.appStore.circles || []).find(
      (c) => c.id === s.circleId,
    );
    return {
      م: idx + 1,
      "اسم الطالب": s.name || "—",
      "رقم الهوية": s.nationalId || "—",
      "عمر الطالب": s.age || "—",
      "اسم ولي الأمر": s.parentName || "—",
      "صلة القرابة": s.parentRelation || "—",
      "جوال ولي الأمر": s.parentPhone || "—",
      "مكان السكن": s.residence || "—",
      الحلقة: circle ? circle.name : "غير مسجل",
      الحالة: s.status === "active" ? "نشط" : "مؤرشف",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "الطلاب");
  XLSX.writeFile(
    workbook,
    `قائمة_الطلاب_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
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
    const teacherObj = (window.appStore.teachers || []).find(
      (t) =>
        t.userId === user.id || t.id === user.teacherId || t.id === user.id,
    );
    const teacherId = teacherObj ? teacherObj.id : user.id;
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
      (s.phone && String(s.phone).includes(searchVal));
    const matchesCircle = circleFilter === "all" || s.circleId === circleFilter;
    const matchesStatus = s.status === statusFilter;
    return matchesSearch && matchesCircle && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">لا يوجد طلاب مطابقون للبحث</td></tr>`;
    updatePendingBadgeCount();
    updateBulkToolbarCount();
    return;
  }

  let html = "";
  filtered.forEach((student) => {
    const circle = (window.appStore.circles || []).find(
      (c) => c.id === student.circleId,
    );
    const circleName = circle ? circle.name : "غير مسجل";

    const actionBtn = isTeacher
      ? `<button class="btn btn-outline-brown btn-sm" onclick="openTeacherStudentModal('${student.id}')">تعديل السجل والتسميع</button>`
      : `
        <div style="display: flex; gap: 0.35rem;">
          <button class="btn btn-outline-brown btn-sm" onclick="openModalEditStudentComprehensive('${student.id}')">تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStudent('${student.id}')">حذف</button>
        </div>
      `;

    html += `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" class="student-select-cb" value="${student.id}" onchange="updateBulkToolbarCount()" />
        </td>
        <td style="font-weight: 700;">${student.name || "—"}</td>
        <td>${student.nationalId || "—"}</td>
        <td>${student.phone || "بدون جوال"}</td>
        <td>${student.parentName || "—"}</td>
        <td>${student.parentRelation || "—"}</td>
        <td style="color: var(--primary-brown); font-weight: 700;">${student.parentPhone || "—"}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circleName}</span></td>
        <td>
          <span class="badge ${student.status === "active" ? "badge-active" : "badge-archived"}">
            ${student.status === "active" ? "نشط" : "مؤرشف (موقوف)"}
          </span>
        </td>
        <td>${actionBtn}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  updatePendingBadgeCount();
  updateBulkToolbarCount();
}

function updatePendingBadgeCount() {
  const badge = document.getElementById("pending-count-badge");
  if (badge) {
    const pendingCount = (window.appStore.students || []).filter(
      (s) => s.status === "pending",
    ).length;
    badge.textContent = pendingCount;
  }
}

function deleteStudent(studentId) {
  const student = (window.appStore.students || []).find(
    (s) => s.id === studentId,
  );
  if (!student) return;

  if (!confirm(`هل أنت متأكد من حذف الطالب (${student.name}) نهائياً؟`)) return;

  window.appStore.students = (window.appStore.students || []).filter(
    (s) => s.id !== studentId,
  );
  if (typeof saveToCloud === "function")
    saveToCloud("students", studentId, null, true);

  alert(`✅ تم حذف الطالب (${student.name}) بنجاح!`);
  renderStudentsTable();
  if (typeof renderAccountsTable === "function") renderAccountsTable();
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

  const userRec = (window.appStore.users || []).find(
    (u) =>
      u.id === student.id ||
      u.username === student.phone ||
      u.username === student.nationalId,
  );
  setVal(
    "edit-comp-password",
    userRec
      ? userRec.pass
      : student.nationalId
        ? student.nationalId.slice(-4)
        : "1234",
  );

  const circleSelect = document.getElementById("edit-comp-circle");
  if (circleSelect) {
    let opts = '<option value="">— غير مسجل بحلقة —</option>';
    (window.appStore.circles || []).forEach((c) => {
      opts += `<option value="${c.id}" ${c.id === student.circleId ? "selected" : ""}>${c.name}</option>`;
    });
    circleSelect.innerHTML = opts;
  }

  if (typeof openModal === "function")
    openModal("modal-edit-student-comprehensive");
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

    if (typeof saveToCloud === "function")
      saveToCloud("students", student.id, student);

    const newPass = document.getElementById("edit-comp-password")?.value.trim();
    if (newPass) {
      if (!window.appStore.users) window.appStore.users = [];
      let userRec = window.appStore.users.find(
        (u) =>
          u.id === student.id ||
          u.username === student.phone ||
          u.username === student.nationalId,
      );
      if (!userRec) {
        userRec = {
          id: student.id,
          name: student.name,
          role: "student",
          username: student.nationalId || student.phone || student.name,
          pass: newPass,
          status: student.status || "active",
          createdAt: Date.now(),
        };
        window.appStore.users.push(userRec);
      } else {
        userRec.pass = newPass;
        userRec.name = student.name;
        userRec.status = student.status || "active";
      }
      if (typeof saveToCloud === "function")
        saveToCloud("users", userRec.id, userRec);
    }

    if (typeof saveLocalStore === "function") saveLocalStore();
    alert("✅ تم حفظ تعديلات الطالب والرقم السري بنجاح!");
  }

  if (typeof closeModal === "function")
    closeModal("modal-edit-student-comprehensive");
  renderStudentsTable();
  if (typeof renderAccountsTable === "function") renderAccountsTable();
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
  setVal("teacher-edit-stu-att", attRecord.status || "");
  setVal("teacher-edit-stu-notes", attRecord.notes || "");

  if (typeof openModal === "function")
    openModal("modal-teacher-edit-student-record");
}

function handleTeacherSaveStudentRecord(e) {
  e.preventDefault();
  const studentId = document.getElementById("teacher-edit-stu-id")?.value;
  const status = document.getElementById("teacher-edit-stu-att")?.value || "";
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

  if (typeof saveToCloud === "function")
    saveToCloud("attendance", record.id, record);
  if (typeof closeModal === "function")
    closeModal("modal-teacher-edit-student-record");
  alert("✅ تم حفظ تعديلات السجل بنجاح!");
  if (typeof renderAttendanceTable === "function") renderAttendanceTable();
}

// 3. إدارة المعلمين ومتابعة التحضير والتقرير المالي
function switchTeacherSubTab(tab) {
  const btnList = document.getElementById("tab-btn-teachers-list");
  const btnAtt = document.getElementById("tab-btn-teachers-attendance");
  const boxList = document.getElementById("box-teachers-list-table");
  const boxAtt = document.getElementById("box-teachers-attendance-table");

  if (tab === "list") {
    btnList?.classList.add("active");
    btnAtt?.classList.remove("active");
    boxList?.classList.remove("style-hidden");
    boxAtt?.classList.add("style-hidden");
    renderTeachersTable();
  } else {
    btnAtt?.classList.add("active");
    btnList?.classList.remove("active");
    boxAtt?.classList.remove("style-hidden");
    boxList?.classList.add("style-hidden");
    renderTeachersAttendanceTable();
  }
}

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
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">لا يوجد معلمون مطابقون</td></tr>`;
    return;
  }

  const financialTeacherId = window.appStore.settings?.financialTeacherId;

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
    const isSuspended = t.status !== "active";
    const isFinance = financialTeacherId === t.id;

    html += `
      <tr>
        <td style="font-weight: 700;">
          ${t.name}
          ${isFinance ? '<span class="badge" style="background:#0b6b7d; color:#fff; margin-right:4px;">💼 مسؤول مالي</span>' : ""}
        </td>
        <td>${t.phone || "—"}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circleNamesStr} (${teacherCircles.length} حلقة)</span></td>
        <td dir="ltr" class="text-muted" style="text-align: right;">${lastLogin}</td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline-brown btn-sm" onclick="openModalEditTeacher('${t.id}')">تعديل</button>
            <button class="btn ${isSuspended ? "btn-success" : "btn-danger"} btn-sm" onclick="toggleTeacherStatus('${t.id}')">
              ${isSuspended ? "تفعيل" : "إيقاف"}
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteTeacher('${t.id}')">حذف</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// عرض وإدارة تحضير المعلمين والمدير
function renderTeachersAttendanceTable() {
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

  let teachers = (window.appStore.teachers || []).filter(
    (t) => t.status === "active",
  );

  if (searchVal) {
    teachers = teachers.filter(
      (t) => t.name && t.name.toLowerCase().includes(searchVal),
    );
  }

  if (teachers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted p-4">لا يوجد معلمون مطابقون للبحث</td></tr>`;
    return;
  }

  let html = "";
  teachers.forEach((t, idx) => {
    const teacherCircles = (window.appStore.circles || []).filter(
      (c) =>
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(t.id)) ||
        c.teacherId === t.id,
    );
    const circleNamesStr =
      teacherCircles.length > 0
        ? teacherCircles.map((c) => c.name).join(" ، ")
        : "غير مكلف";

    const recordId = `t_att_${t.id}_${dateVal}`;
    const attRecord =
      (window.appStore.teacherAttendance || []).find(
        (a) =>
          a.id === recordId || (a.teacherId === t.id && a.date === dateVal),
      ) || {};
    const currentStatus = attRecord.status || "absent";
    const checkinTime =
      attRecord.time ||
      (attRecord.status === "present" ? "تم التحضير" : "لم يحضر بعد");

    html += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: 700;">${t.name}</td>
        <td>${t.phone || "—"}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circleNamesStr}</span></td>
        <td dir="ltr" style="text-align: center; color: ${attRecord.status === "present" ? "#2e7d32" : "#888"}; font-weight: 700;">
          ${checkinTime}
        </td>
        <td>
          <select class="form-control" style="font-weight: 700;" onchange="setTeacherAttendance('${t.id}', this.value)">
            <option value="present" ${currentStatus === "present" ? "selected" : ""}>🟢 حاضر</option>
            <option value="absent" ${currentStatus === "absent" ? "selected" : ""}>🔴 غائب</option>
            <option value="late" ${currentStatus === "late" ? "selected" : ""}>🟡 متأخر</option>
            <option value="excused" ${currentStatus === "excused" ? "selected" : ""}>🔵 مستأذن</option>
          </select>
        </td>
        <td>
          <input type="text" class="form-control" placeholder="ملاحظة الإدارة..." value="${attRecord.notes || ""}" onchange="updateTeacherAttendanceNotes('${t.id}', this.value)">
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function setTeacherAttendance(teacherId, status) {
  const dateVal =
    document.getElementById("teacher-attendance-date-select")?.value ||
    new Date().toISOString().split("T")[0];
  const recordId = `t_att_${teacherId}_${dateVal}`;
  const teacher = (window.appStore.teachers || []).find(
    (t) => t.id === teacherId,
  );

  if (!window.appStore.teacherAttendance)
    window.appStore.teacherAttendance = [];

  let record = window.appStore.teacherAttendance.find(
    (a) =>
      a.id === recordId || (a.teacherId === teacherId && a.date === dateVal),
  );
  if (!record) {
    record = {
      id: recordId,
      teacherId,
      teacherName: teacher ? teacher.name : "معلم",
      date: dateVal,
      time:
        status === "present"
          ? new Date().toLocaleTimeString("ar-SA", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
      status,
      notes: "",
      updatedBy: "admin",
      createdAt: Date.now(),
    };
    window.appStore.teacherAttendance.push(record);
  } else {
    record.status = status;
    record.updatedBy = "admin";
    if (status === "present" && (!record.time || record.time === "—")) {
      record.time = new Date().toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  if (typeof saveToCloud === "function") {
    saveToCloud("teacherAttendance", record.id, record);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();
}

function updateTeacherAttendanceNotes(teacherId, notesVal) {
  const dateVal =
    document.getElementById("teacher-attendance-date-select")?.value ||
    new Date().toISOString().split("T")[0];
  const recordId = `t_att_${teacherId}_${dateVal}`;

  let record = (window.appStore.teacherAttendance || []).find(
    (a) =>
      a.id === recordId || (a.teacherId === teacherId && a.date === dateVal),
  );
  if (record) {
    record.notes = notesVal;
    if (typeof saveToCloud === "function") {
      saveToCloud("teacherAttendance", record.id, record);
    }
    if (typeof saveLocalStore === "function") saveLocalStore();
  }
}

function exportTeachersAttendanceExcel() {
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const dateVal =
    document.getElementById("teacher-attendance-date-select")?.value ||
    new Date().toISOString().split("T")[0];
  const teachers = (window.appStore.teachers || []).filter(
    (t) => t.status === "active",
  );

  if (teachers.length === 0) {
    alert("⚠️ لا توجد بيانات لتصديرها!");
    return;
  }

  const exportData = teachers.map((t, idx) => {
    const recordId = `t_att_${t.id}_${dateVal}`;
    const att =
      (window.appStore.teacherAttendance || []).find(
        (a) =>
          a.id === recordId || (a.teacherId === t.id && a.date === dateVal),
      ) || {};
    const teacherCircles = (window.appStore.circles || []).filter(
      (c) =>
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(t.id)) ||
        c.teacherId === t.id,
    );
    const circleNamesStr =
      teacherCircles.length > 0
        ? teacherCircles.map((c) => c.name).join(" ، ")
        : "غير مكلف";

    let statusLabel = "غائب";
    if (att.status === "present") statusLabel = "حاضر";
    else if (att.status === "late") statusLabel = "متأخر";
    else if (att.status === "excused") statusLabel = "مستأذن";

    return {
      م: idx + 1,
      "اسم المعلم": t.name || "—",
      "رقم الجوال": t.phone || "—",
      الحلقات: circleNamesStr,
      التاريخ: dateVal,
      "وقت الحضور": att.time || "—",
      "حالة الحضور": statusLabel,
      "ملاحظات الإدارة": att.notes || "—",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "تحضير_المعلمين");
  XLSX.writeFile(workbook, `تحضير_المعلمين_${dateVal}.xlsx`);
}

function deleteTeacher(teacherId) {
  const teacher = (window.appStore.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  if (!confirm(`هل أنت متأكد من حذف المعلم (${teacher.name}) نهائياً؟`)) return;

  window.appStore.teachers = (window.appStore.teachers || []).filter(
    (t) => t.id !== teacherId,
  );
  if (typeof saveToCloud === "function")
    saveToCloud("teachers", teacherId, null, true);

  alert(`✅ تم حذف المعلم (${teacher.name}) بنجاح!`);
  renderTeachersTable();
  if (typeof renderCirclesCards === "function") renderCirclesCards();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
  if (typeof renderAccountsTable === "function") renderAccountsTable();
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
    createdAt: Date.now(),
  };

  if (!window.appStore.teachers) window.appStore.teachers = [];
  window.appStore.teachers.push(newTeacher);

  if (typeof saveToCloud === "function")
    saveToCloud("teachers", newTeacher.id, newTeacher);

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
  alert("✅ تم إضافة المعلم وتكليفه بنجاح!");
}

function toggleTeacherStatus(teacherId) {
  const teacher = (window.appStore.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  teacher.status = teacher.status === "active" ? "suspended" : "active";
  if (typeof saveToCloud === "function")
    saveToCloud("teachers", teacher.id, teacher);

  renderTeachersTable();
  if (typeof renderAccountsTable === "function") renderAccountsTable();
}

function openModalEditTeacher(teacherId) {
  const teacher = (window.appStore.teachers || []).find(
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

  const userRec = (window.appStore.users || []).find(
    (u) =>
      u.id === teacher.userId ||
      u.id === teacher.id ||
      u.username === teacher.phone,
  );
  setVal("edit-teach-password", userRec ? userRec.pass : "1234");

  const financeCheckbox = document.getElementById("edit-teach-is-finance");
  if (financeCheckbox) {
    financeCheckbox.checked =
      window.appStore.settings?.financialTeacherId === teacher.id;
  }

  const container = document.getElementById(
    "edit-teacher-circles-checkbox-container",
  );
  if (container) {
    let html = "";
    (window.appStore.circles || []).forEach((c) => {
      const isChecked =
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(teacher.id)) ||
        c.teacherId === teacher.id
          ? "checked"
          : "";
      html += `
        <label class="checkbox-item-row">
          <input type="checkbox" name="edit_teacher_circles" value="${c.id}" ${isChecked}>
          <span>${c.name}</span>
        </label>
      `;
    });
    container.innerHTML =
      html || '<p class="text-muted p-2">لا توجد حلقات معرفة</p>';
  }

  if (typeof openModal === "function") openModal("modal-edit-teacher");
}

function handleSaveTeacherEdit(e) {
  e.preventDefault();
  const teacherId = document.getElementById("edit-teach-id")?.value;
  const teacher = (window.appStore.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  teacher.name =
    document.getElementById("edit-teach-name")?.value.trim() || teacher.name;
  teacher.phone =
    document.getElementById("edit-teach-phone")?.value.trim() || "";

  const selectedCircles = [];
  document
    .querySelectorAll('input[name="edit_teacher_circles"]:checked')
    .forEach((cb) => {
      selectedCircles.push(cb.value);
    });

  if (typeof saveToCloud === "function")
    saveToCloud("teachers", teacher.id, teacher);

  // تحديث الصلاحية المالية وحصرها في معلم واحد دون المساس بالسجلات
  const isFinanceChecked = document.getElementById(
    "edit-teach-is-finance",
  )?.checked;
  if (!window.appStore.settings) window.appStore.settings = {};

  if (isFinanceChecked) {
    window.appStore.settings.financialTeacherId = teacher.id;
  } else if (window.appStore.settings.financialTeacherId === teacher.id) {
    window.appStore.settings.financialTeacherId = null;
  }

  if (typeof saveToCloud === "function") {
    saveToCloud("settings", "finance_access", {
      financialTeacherId: window.appStore.settings.financialTeacherId,
    });
  }

  const newPass = document.getElementById("edit-teach-password")?.value.trim();
  if (newPass) {
    if (!window.appStore.users) window.appStore.users = [];
    let userRec = window.appStore.users.find(
      (u) =>
        u.id === teacher.userId ||
        u.id === teacher.id ||
        u.username === teacher.phone,
    );
    if (!userRec) {
      userRec = {
        id: teacher.userId || teacher.id,
        name: teacher.name,
        role: "teacher",
        username: teacher.phone || teacher.name,
        pass: newPass,
        status: teacher.status || "active",
        createdAt: Date.now(),
      };
      window.appStore.users.push(userRec);
    } else {
      userRec.pass = newPass;
      userRec.name = teacher.name;
      userRec.status = teacher.status || "active";
    }
    if (typeof saveToCloud === "function")
      saveToCloud("users", userRec.id, userRec);
  }

  (window.appStore.circles || []).forEach((c) => {
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
  if (typeof closeModal === "function") closeModal("modal-edit-teacher");
  alert("✅ تم تعديل بيانات المعلم والرقم السري والصلاحيات بنجاح!");
  renderTeachersTable();
  if (typeof renderCirclesCards === "function") renderCirclesCards();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
  if (typeof renderAccountsTable === "function") renderAccountsTable();
}

// 4. إدارة الحلقات
function renderCirclesCards() {
  const container = document.getElementById("circles-cards-container");
  if (!container) return;

  const searchVal = (document.getElementById("search-circles")?.value || "")
    .trim()
    .toLowerCase();
  const filtered = (window.appStore.circles || []).filter(
    (c) => c.name && c.name.toLowerCase().includes(searchVal),
  );

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
          <div><div class="circle-stat-val">${circleStudents.length}</div><div class="circle-stat-lbl">الطلاب</div></div>
          <div><div class="circle-stat-val" style="color: var(--primary-brown);">${assignedTeachers.length}</div><div class="circle-stat-lbl">المعلمون</div></div>
        </div>
        <div class="circle-teacher-info" style="font-size: 0.85rem; margin-bottom: 0.8rem;">
          <strong>المعلمون:</strong> ${teacherNamesStr}
        </div>
        <div class="circle-card-actions" style="display: flex; gap: 0.5rem; margin-top: 0.8rem;">
          <button class="btn btn-outline-brown btn-sm" style="flex: 1;" onclick="openModalEditCircle('${circle.id}')">تعديل</button>
          <button class="btn btn-danger btn-sm" style="flex: 1;" onclick="deleteCircle('${circle.id}')">حذف</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function deleteCircle(circleId) {
  const circle = (window.appStore.circles || []).find((c) => c.id === circleId);
  if (!circle) return;

  if (!confirm(`هل أنت متأكد من حذف حلقة (${circle.name}) نهائياً؟`)) return;

  window.appStore.circles = (window.appStore.circles || []).filter(
    (c) => c.id !== circleId,
  );
  (window.appStore.students || []).forEach((s) => {
    if (s.circleId === circleId) {
      s.circleId = "";
      if (typeof saveToCloud === "function") saveToCloud("students", s.id, s);
    }
  });

  if (typeof saveToCloud === "function")
    saveToCloud("circles", circleId, null, true);
  alert(`✅ تم حذف حلقة (${circle.name}) بنجاح!`);
  renderCirclesCards();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
  if (typeof renderTamayuzBoard === "function") renderTamayuzBoard();
}

function openModalAddCircle() {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setVal("edit-circle-id", "");
  setVal("circle-name", "");
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
  setVal("edit-circle-id", circle.id);
  setVal("circle-name", circle.name);

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
      el.style.display = el.textContent.toLowerCase().includes(q)
        ? "flex"
        : "none";
    });
}

function filterCircleModalStudents() {
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
}

function populateCircleTeachersList(selectedIds) {
  const container = document.getElementById("circle-teachers-list");
  if (!container) return;

  let html = "";
  (window.appStore.teachers || []).forEach((t) => {
    const isChecked = selectedIds.includes(t.id) ? "checked" : "";
    html += `
      <label class="checkbox-item-row">
        <input type="checkbox" name="circle_teachers" value="${t.id}" ${isChecked}>
        <span>${t.name}</span>
      </label>
    `;
  });
  container.innerHTML =
    html || '<p class="text-muted p-2">لا يوجد معلمون مسجلون</p>';
}

function populateCircleStudentsList(selectedStudentIds) {
  const container = document.getElementById("circle-students-list");
  if (!container) return;

  let html = "";
  (window.appStore.students || [])
    .filter((s) => s.status === "active")
    .forEach((s) => {
      const isChecked = selectedStudentIds.includes(s.id) ? "checked" : "";
      html += `
      <label class="checkbox-item-row">
        <input type="checkbox" name="circle_students" value="${s.id}" ${isChecked}>
        <span>${s.name}</span>
      </label>
    `;
    });
  container.innerHTML =
    html || '<p class="text-muted p-2">لا يوجد طلاب مسجلون</p>';
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
    alert("✅ تم تعديل الحلقة بنجاح!");
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
    alert("✅ تم إنشاء الحلقة بنجاح!");
  }

  if (typeof closeModal === "function") closeModal("modal-add-circle");
  if (typeof refreshAllViews === "function") refreshAllViews();
}

// 5. التحضير
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
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4">يرجى اختيار الحلقة لعرض قائمة التحضير</td></tr>`;
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
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4">لا يوجد طلاب مطابقون في هذه الحلقة</td></tr>`;
    return;
  }

  let html = "";
  students.forEach((student) => {
    const record =
      (window.appStore.attendance || []).find(
        (a) => a.studentId === student.id && a.date === dateVal,
      ) || {};
    const currentStatus = record.status || "";

    html += `
      <tr>
        <td style="font-weight: 700;">${student.name}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${getCircleName(student.circleId)}</span></td>
        <td>
          <select class="form-control" style="font-weight: 700;" onchange="setStudentAttendance('${student.id}', this.value)">
            <option value="" ${currentStatus === "" ? "selected" : ""}></option>
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

  if (typeof saveToCloud === "function")
    saveToCloud("attendance", record.id, record);
}

function updateAttendanceNotes(studentId, notesVal) {
  const dateVal = document.getElementById("attendance-date-select")?.value;
  const recordId = `att_${studentId}_${dateVal}`;

  let record = (window.appStore.attendance || []).find(
    (a) => a.id === recordId,
  );
  if (record) {
    record.notes = notesVal;
    if (typeof saveToCloud === "function")
      saveToCloud("attendance", record.id, record);
  }
}

function markAllAbsent() {
  const circleId = document.getElementById("attendance-circle-select")?.value;
  if (!circleId) return alert("اختر حلقة أولاً!");

  const students = (window.appStore.students || []).filter(
    (s) => s.circleId === circleId && s.status === "active",
  );
  students.forEach((s) => setStudentAttendance(s.id, "absent"));
  renderAttendanceTable();
  alert("✅ تم تحديد الجميع كـ (غائب) بنجاح!");
}

function getCircleName(circleId) {
  const c = (window.appStore.circles || []).find((x) => x.id === circleId);
  return c ? c.name : "—";
}

// 6. الاختبارات
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
  const type = document.getElementById("test-type")?.value || "";
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

  if (typeof saveToCloud === "function")
    saveToCloud("tests", newTest.id, newTest);
  if (typeof closeModal === "function") closeModal("modal-add-test");
  e.target.reset();
  renderTestsTable();
  alert("✅ تم حفظ الاختبار بنجاح!");
}

function openModalEditTest(testId) {
  const test = (window.appStore.tests || []).find((t) => t.id === testId);
  if (!test) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : "";
  };

  setVal("edit-test-id", test.id);
  setVal("edit-test-type", test.type || "");
  setVal("edit-test-score", test.score || "100");
  setVal("edit-test-rating", test.rating || "ممتاز");
  setVal("edit-test-date", test.date || new Date().toISOString().split("T")[0]);

  const circleSelect = document.getElementById("edit-test-circle-select");
  if (circleSelect) {
    let options = '<option value="">— اختر الحلقة —</option>';
    (window.appStore.circles || []).forEach((c) => {
      options += `<option value="${c.id}" ${c.id === test.circleId ? "selected" : ""}>${c.name}</option>`;
    });
    circleSelect.innerHTML = options;
  }

  populateEditTestStudentsDropdown(test.studentId);
  if (typeof openModal === "function") openModal("modal-edit-test");
}

function populateEditTestStudentsDropdown(selectedStudentId) {
  const circleId = document.getElementById("edit-test-circle-select")?.value;
  const studentSelect = document.getElementById("edit-test-student-select");
  if (!studentSelect) return;

  let options = '<option value="">— اختر الطالب —</option>';
  const list = circleId
    ? (window.appStore.students || []).filter(
        (s) => s.circleId === circleId && s.status === "active",
      )
    : (window.appStore.students || []).filter((s) => s.status === "active");

  list.forEach((s) => {
    options += `<option value="${s.id}" ${s.id === selectedStudentId ? "selected" : ""}>${s.name}</option>`;
  });
  studentSelect.innerHTML = options;
}

function handleSaveTestEdit(e) {
  e.preventDefault();
  const testId = document.getElementById("edit-test-id")?.value;
  const test = (window.appStore.tests || []).find((t) => t.id === testId);
  if (!test) return;

  test.circleId =
    document.getElementById("edit-test-circle-select")?.value || "";
  test.studentId =
    document.getElementById("edit-test-student-select")?.value || "";
  test.type = document.getElementById("edit-test-type")?.value || "";
  test.score = document.getElementById("edit-test-score")?.value || "100";
  test.rating = document.getElementById("edit-test-rating")?.value || "ممتاز";
  test.date = document.getElementById("edit-test-date")?.value || test.date;

  if (typeof saveToCloud === "function") saveToCloud("tests", test.id, test);
  if (typeof closeModal === "function") closeModal("modal-edit-test");
  alert("✅ تم تعديل بيانات الاختبار بنجاح!");
  renderTestsTable();
}

function deleteTest(testId) {
  if (!confirm("هل أنت متأكد من حذف هذا الاختبار نهائياً؟")) return;

  window.appStore.tests = (window.appStore.tests || []).filter(
    (t) => t.id !== testId,
  );
  if (typeof saveToCloud === "function")
    saveToCloud("tests", testId, null, true);
  alert("✅ تم حذف الاختبار بنجاح!");
  renderTestsTable();
}

function openCustomTestsPrintModal() {
  if (typeof openModal === "function") openModal("modal-print-tests-columns");
}

function executeCustomTestsPDF() {
  const colStudent = document.getElementById("chk-col-student")?.checked;
  const colCircle = document.getElementById("chk-col-circle")?.checked;
  const colType = document.getElementById("chk-col-type")?.checked;
  const colScore = document.getElementById("chk-col-score")?.checked;
  const colRating = document.getElementById("chk-col-rating")?.checked;
  const colDate = document.getElementById("chk-col-date")?.checked;

  const table = document.getElementById("tests-table-element");
  if (!table) return;

  const toggleCol = (index, show) => {
    table.querySelectorAll(`tr > :nth-child(${index})`).forEach((el) => {
      if (show) el.classList.remove("hide-on-print");
      else el.classList.add("hide-on-print");
    });
  };

  toggleCol(1, colStudent);
  toggleCol(2, colCircle);
  toggleCol(3, colType);
  toggleCol(4, colScore);
  toggleCol(5, colRating);
  toggleCol(6, colDate);

  if (typeof closeModal === "function") closeModal("modal-print-tests-columns");
  exportTestsPDF();
}

function renderTestsTable() {
  const tbody = document.getElementById("tests-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("search-tests")?.value || "")
    .trim()
    .toLowerCase();
  const circleFilter =
    document.getElementById("filter-test-circle")?.value || "all";

  const filtered = (window.appStore.tests || []).filter((t) => {
    const student = (window.appStore.students || []).find(
      (s) => s.id === t.studentId,
    );
    const studentName = student ? student.name.toLowerCase() : "";
    const testType = (t.type || "").toLowerCase();
    const matchesSearch =
      studentName.includes(searchVal) || testType.includes(searchVal);
    const matchesCircle = circleFilter === "all" || t.circleId === circleFilter;
    return matchesSearch && matchesCircle;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted p-3">لا توجد اختبارات مطابقة</td></tr>`;
    return;
  }

  let html = "";
  filtered.forEach((t) => {
    const student = (window.appStore.students || []).find(
      (s) => s.id === t.studentId,
    );
    const circle = (window.appStore.circles || []).find(
      (c) => c.id === t.circleId,
    );

    html += `
      <tr>
        <td style="font-weight:700;">${student ? student.name : "طالب"}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circle ? circle.name : "—"}</span></td>
        <td>${t.type || "—"}</td>
        <td style="font-weight:700; color:var(--primary-brown);">${t.score || "0"} / 100</td>
        <td><span class="badge badge-active">${t.rating || "—"}</span></td>
        <td>${t.date || "—"}</td>
        <td class="no-print">
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline-brown btn-sm" onclick="openModalEditTest('${t.id}')">تعديل</button>
            <button class="btn btn-danger btn-sm" onclick="deleteTest('${t.id}')">حذف</button>
          </div>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// 7. لوحة التميز الأسبوعي
function setTrophyWinner(studentId) {
  const user = window.currentUser;
  if (!user || user.role !== "admin") {
    alert("⚠️ خاصية تعيين صاحب الكأس متاحة للمدير فقط.");
    return;
  }

  if (window.appStore.trophyStudentId === studentId) {
    window.appStore.trophyStudentId = null;
  } else {
    window.appStore.trophyStudentId = studentId;
  }

  if (typeof saveToCloud === "function") {
    saveToCloud("settings", "trophy_winner", {
      studentId: window.appStore.trophyStudentId,
    });
  }

  renderTamayuzBoard();
}

function moveTamayuzCircle(fromIndex, toIndex) {
  let circles = getOrderedTamayuzCircles();
  if (toIndex < 0 || toIndex >= circles.length) return;

  const circleIds = circles.map((c) => c.id);
  const temp = circleIds[fromIndex];
  circleIds[fromIndex] = circleIds[toIndex];
  circleIds[toIndex] = temp;

  window.appStore.circlesOrder = circleIds;
  if (typeof saveToCloud === "function") {
    saveToCloud("settings", "circles_order", { order: circleIds });
  }

  renderTamayuzBoard();
}

function getOrderedTamayuzCircles() {
  let allCircles = [...(window.appStore.circles || [])];
  const order = window.appStore.circlesOrder || [];

  if (order.length > 0) {
    allCircles.sort((a, b) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      if (idxA > -1 && idxB > -1) return idxA - idxB;
      if (idxA > -1) return -1;
      if (idxB > -1) return 1;
      return 0;
    });
  }
  return allCircles;
}

function renderTamayuzBoard() {
  const boardCard = document.getElementById("tamayuz-board-card");
  const adminTbody = document.getElementById("tamayuz-students-body");
  if (!boardCard && !adminTbody) return;

  const circles = getOrderedTamayuzCircles();
  const totalCircles = circles.length;

  const qualifyingStudents = (window.appStore.students || []).filter((s) => {
    if (s.status !== "active") return false;
    if (typeof checkStudentCurrentWeekTamayuz === "function") {
      return checkStudentCurrentWeekTamayuz(s.id);
    }
    return true;
  });

  let gridClass = "tamayuz-grid-4";
  if (totalCircles === 5) gridClass = "tamayuz-grid-5";
  else if (totalCircles >= 6) gridClass = "tamayuz-grid-6";
  else if (totalCircles <= 3) gridClass = "tamayuz-grid-3";

  let boardHtml = `<div class="tamayuz-complex-board ${gridClass}" style="margin-top: 1rem;">`;

  if (totalCircles === 0) {
    boardHtml += `
      <div class="empty-state-card" style="grid-column: 1 / -1; padding: 2rem; text-align: center;">
        <p class="text-muted">لا توجد حلقات معرفة لعرضها في لوحة التميز</p>
      </div>
    `;
  } else {
    circles.forEach((circle, cIdx) => {
      const circleStudents = qualifyingStudents.filter(
        (s) => s.circleId === circle.id,
      );
      const teacher = (window.appStore.teachers || []).find(
        (t) =>
          (Array.isArray(circle.teacherIds) &&
            circle.teacherIds.includes(t.id)) ||
          circle.teacherId === t.id,
      );

      boardHtml += `
        <div class="tamayuz-circle-card" style="background: #ffffff; border: 2px solid var(--border-color); border-radius: 12px; padding: 1rem; position: relative; display: flex; flex-direction: column;">
          <div class="tamayuz-circle-header flex-between mb-2 pb-1" style="border-bottom: 1px solid var(--border-color);">
            <div>
              <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--primary-brown); margin: 0;">🏛️ ${circle.name}</h4>
              <small class="text-muted">المعلم: ${teacher ? teacher.name : "—"}</small>
            </div>
            <div class="no-print flex-align-gap">
              <button class="btn btn-outline-brown btn-sm p-1" style="font-size: 0.75rem;" onclick="moveTamayuzCircle(${cIdx}, ${cIdx - 1})" ${cIdx === 0 ? "disabled" : ""} title="تحريك لليمين">◀</button>
              <button class="btn btn-outline-brown btn-sm p-1" style="font-size: 0.75rem;" onclick="moveTamayuzCircle(${cIdx}, ${cIdx + 1})" ${cIdx === totalCircles - 1 ? "disabled" : ""} title="تحريك لليسار">▶</button>
            </div>
          </div>

          <div class="tamayuz-circle-students-list" style="flex: 1;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #555; margin-bottom: 0.5rem;">
              🎖️ الحاصلون على بطاقة التميز (${circleStudents.length}):
            </div>
      `;

      if (circleStudents.length === 0) {
        boardHtml += `<p class="text-muted" style="font-size: 0.8rem; text-align: center; padding: 0.8rem;">لا يوجد طلاب حاصلون على البطاقة</p>`;
      } else {
        circleStudents.forEach((stu) => {
          const hasTrophy = window.appStore.trophyStudentId === stu.id;
          boardHtml += `
            <div class="tamayuz-stu-row flex-between p-2 mb-1" style="background: ${hasTrophy ? "#fff8e1" : "#faf8f5"}; border: 1px solid ${hasTrophy ? "#b78103" : "var(--border-color)"}; border-radius: 6px;">
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-dark);">${stu.name}</strong>
                ${hasTrophy ? '<span class="badge badge-warning" style="margin-right: 4px;">🏆 صاحب الكأس</span>' : ""}
              </div>
              <div class="flex-align-gap no-print">
                <button class="btn btn-sm ${hasTrophy ? "btn-danger" : "btn-outline-brown"}" style="padding: 2px 8px; font-size: 0.75rem;" onclick="setTrophyWinner('${stu.id}')">
                  ${hasTrophy ? "سحب الكأس" : "🏆 منح الكأس"}
                </button>
              </div>
            </div>
          `;
        });
      }

      boardHtml += `</div></div>`;
    });
  }

  boardHtml += `</div>`;

  const existingGrid = boardCard?.querySelector(".tamayuz-complex-board");
  if (existingGrid) existingGrid.outerHTML = boardHtml;
  else if (boardCard) boardCard.insertAdjacentHTML("beforeend", boardHtml);

  if (adminTbody) {
    if (qualifyingStudents.length === 0) {
      adminTbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-3">لا يوجد طلاب حاصلون على البطاقة</td></tr>`;
      return;
    }
    let adminHtml = "";
    qualifyingStudents.forEach((stu) => {
      const circle = (window.appStore.circles || []).find(
        (c) => c.id === stu.circleId,
      );
      const isTrophy = window.appStore.trophyStudentId === stu.id;
      adminHtml += `
        <tr style="${isTrophy ? "background:#fff8e1;" : ""}">
          <td style="font-weight: 800;">
            ${isTrophy ? "🏆 " : "⭐ "}${stu.name}
            ${isTrophy ? '<span class="badge badge-warning">صاحب الكأس</span>' : ""}
          </td>
          <td><span style="font-weight: 600; color: var(--text-dark);">${circle ? circle.name : "جامع الهدى"}</span></td>
          <td><span class="badge badge-active">1 بطاقة</span></td>
          <td><span class="badge badge-active">مكتمل 100%</span></td>
          <td class="no-print">
            <button class="btn btn-sm ${isTrophy ? "btn-danger" : "btn-outline-brown"}" onclick="setTrophyWinner('${stu.id}')">
              ${isTrophy ? "سحب الكأس" : "🏆 منح الكأس"}
            </button>
          </td>
        </tr>
      `;
    });
    adminTbody.innerHTML = adminHtml;
  }
}

// 8. ملاحظات المعلمين
function renderTeacherNotesTable() {
  const tbody = document.getElementById("teacher-notes-table-body");
  if (!tbody) return;

  const searchVal = (
    document.getElementById("search-teacher-notes")?.value || ""
  )
    .trim()
    .toLowerCase();
  const circleFilter =
    document.getElementById("filter-teacher-notes-circle")?.value || "all";

  let records = (window.appStore.tasmeea || []).filter(
    (t) => t.adminNotes && t.adminNotes.trim() !== "",
  );
  records.sort(
    (a, b) =>
      (b.date || "").localeCompare(a.date || "") ||
      (b.updatedAt || 0) - (a.updatedAt || 0),
  );

  const filtered = records.filter((t) => {
    const student = (window.appStore.students || []).find(
      (s) => s.id === t.studentId,
    );
    const studentName = student ? student.name.toLowerCase() : "";
    const noteText = (t.adminNotes || "").toLowerCase();
    const matchesSearch =
      studentName.includes(searchVal) || noteText.includes(searchVal);
    const matchesCircle = circleFilter === "all" || t.circleId === circleFilter;
    return matchesSearch && matchesCircle;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">لا توجد ملاحظات مسجلة</td></tr>`;
    return;
  }

  let html = "";
  filtered.forEach((t, idx) => {
    const student = (window.appStore.students || []).find(
      (s) => s.id === t.studentId,
    );
    const circle = (window.appStore.circles || []).find(
      (c) => c.id === t.circleId,
    );

    let teacherName = "—";
    if (circle) {
      const teacher = (window.appStore.teachers || []).find(
        (teach) =>
          (Array.isArray(circle.teacherIds) &&
            circle.teacherIds.includes(teach.id)) ||
          circle.teacherId === teach.id,
      );
      if (teacher) teacherName = teacher.name;
    }

    html += `
      <tr>
        <td>${idx + 1}</td>
        <td>${t.date || "—"}</td>
        <td style="font-weight: 700;">${teacherName}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circle ? circle.name : "—"}</span></td>
        <td style="font-weight: 700; color: var(--primary-brown);">${student ? student.name : "طالب"}</td>
        <td style="white-space: normal; min-width: 250px; line-height: 1.6;">${t.adminNotes}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// 9. محرك شاشة التميز الأسبوعي
function getQualifyingTamayuzStudents() {
  const activeStudents = (window.appStore.students || []).filter(
    (s) => s.status === "active",
  );
  const qualifying = activeStudents.filter((s) => {
    return (
      typeof checkStudentCurrentWeekTamayuz === "function" &&
      checkStudentCurrentWeekTamayuz(s.id)
    );
  });

  let orderedList = [...qualifying];
  const savedOrder = window.appStore.screenOrder || [];
  if (savedOrder.length > 0) {
    orderedList.sort((a, b) => {
      const idxA = savedOrder.indexOf(a.id);
      const idxB = savedOrder.indexOf(b.id);
      if (idxA > -1 && idxB > -1) return idxA - idxB;
      if (idxA > -1) return -1;
      if (idxB > -1) return 1;
      return 0;
    });
  }
  return orderedList;
}

function renderScreenView() {
  const screenGrid = document.getElementById("mosque-screen-grid");
  const manageTbody = document.getElementById("screen-manage-table-body");
  const students = getQualifyingTamayuzStudents();

  if (screenGrid) {
    if (students.length === 0) {
      screenGrid.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1; background: #ffffff; border-radius: 12px; padding: 3rem;">
          <h3>لا يوجد فرسان تميز مؤهلون لهذا الأسبوع بعد</h3>
          <p class="text-muted">يشترط حضور 4 أيام وتسميع بدرجة ممتاز كاملة</p>
        </div>
      `;
    } else {
      let gridHtml = "";
      students.forEach((stu, index) => {
        const circle = (window.appStore.circles || []).find(
          (c) => c.id === stu.circleId,
        );
        const circleName = circle ? circle.name : "جامع الهدى";
        const isTrophyWinner =
          window.appStore.trophyStudentId === stu.id || index === 0;

        gridHtml += `
          <div class="card ${isTrophyWinner ? "screen-card-first" : ""}" style="text-align: center; border: ${isTrophyWinner ? "2px solid var(--primary-brown)" : "1px solid var(--border-color)"}; background: ${isTrophyWinner ? "#faf3eb" : "#ffffff"}; border-radius: 12px; padding: 1.5rem; position: relative;">
            <div style="font-size: 1.8rem; font-weight: 900; color: var(--primary-brown); margin-bottom: 0.5rem;">
              #${index + 1} ${isTrophyWinner ? '<span style="font-size: 2.2rem;">🏆</span>' : "⭐"}
            </div>
            <h2 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 0.4rem; color: var(--text-dark);">${stu.name}</h2>
            <p style="font-size: 0.95rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.8rem;">حلقة: ${circleName}</p>
            <div style="display: flex; justify-content: center; gap: 0.5rem;">
              <span class="badge badge-active" style="font-size: 0.85rem;">حضور 100%</span>
              <span class="badge badge-active" style="font-size: 0.85rem;">ممتاز</span>
            </div>
          </div>
        `;
      });
      screenGrid.innerHTML = gridHtml;
    }
  }

  if (manageTbody) {
    if (students.length === 0) {
      manageTbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-3">لا يوجد طلاب مؤهلون</td></tr>`;
    } else {
      let tbodyHtml = "";
      students.forEach((stu, index) => {
        const circle = (window.appStore.circles || []).find(
          (c) => c.id === stu.circleId,
        );
        const circleName = circle ? circle.name : "جامع الهدى";
        const isFirst =
          index === 0 || window.appStore.trophyStudentId === stu.id;

        tbodyHtml += `
          <tr>
            <td style="font-weight: 800; font-size: 1.1rem; width: 60px; text-align: center;">
              ${index + 1} ${isFirst ? "🏆" : ""}
            </td>
            <td style="font-weight: 700;">${stu.name}</td>
            <td><span style="font-weight: 600; color: var(--text-dark);">${circleName}</span></td>
            <td><span class="badge badge-active">متميز</span></td>
            <td style="text-align: center; width: 140px;">
              <div style="display: flex; gap: 0.35rem; justify-content: center;">
                <button class="btn btn-outline-brown btn-sm" onclick="moveScreenStudentUp(${index})" ${index === 0 ? "disabled" : ""}>⬆️ للأعلى</button>
                <button class="btn btn-outline-brown btn-sm" onclick="moveScreenStudentDown(${index})" ${index === students.length - 1 ? "disabled" : ""}>⬇️ للأسفل</button>
              </div>
            </td>
          </tr>
        `;
      });
      manageTbody.innerHTML = tbodyHtml;
    }
  }
}

function moveScreenStudentUp(index) {
  const students = getQualifyingTamayuzStudents();
  if (index <= 0 || index >= students.length) return;

  const currentIds = students.map((s) => s.id);
  const temp = currentIds[index];
  currentIds[index] = currentIds[index - 1];
  currentIds[index - 1] = temp;

  window.appStore.screenOrder = currentIds;
  if (typeof saveToCloud === "function")
    saveToCloud("screenOrder", "current_order", { order: currentIds });
  renderScreenView();
}

function moveScreenStudentDown(index) {
  const students = getQualifyingTamayuzStudents();
  if (index < 0 || index >= students.length - 1) return;

  const currentIds = students.map((s) => s.id);
  const temp = currentIds[index];
  currentIds[index] = currentIds[index + 1];
  currentIds[index + 1] = temp;

  window.appStore.screenOrder = currentIds;
  if (typeof saveToCloud === "function")
    saveToCloud("screenOrder", "current_order", { order: currentIds });
  renderScreenView();
}

function resetScreenStudentOrder() {
  if (!confirm("هل ترغب في إعادة ضبط الترتيب للأولوية التلقائية؟")) return;

  window.appStore.screenOrder = [];
  if (typeof saveToCloud === "function")
    saveToCloud("screenOrder", "current_order", { order: [] });
  renderScreenView();
  alert("✅ تمت إعادة الضبط للترتيب التلقائي بنجاح!");
}

// 10. إدارة الحسابات والتحكم الدائم في الأرقام السرية للجميع
function renderAccountsTable() {
  const tbody = document.getElementById("accounts-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("search-accounts")?.value || "")
    .trim()
    .toLowerCase();
  const roleFilter =
    document.getElementById("filter-account-role")?.value || "all";
  const statusFilter =
    document.getElementById("filter-account-status")?.value || "all";

  const combinedAccounts = [];

  (window.appStore.users || []).forEach((u) => {
    if (u.role === "admin" || (window.ROLES && u.role === window.ROLES.ADMIN))
      return;
    combinedAccounts.push({
      id: u.id,
      name: u.name,
      role: u.role || "student",
      username: u.username || u.phone || "—",
      phone: u.phone || "—",
      status: u.status || "active",
      source: "user",
    });
  });

  (window.appStore.teachers || []).forEach((t) => {
    const exists = combinedAccounts.some(
      (a) => a.id === t.id || (t.userId && a.id === t.userId),
    );
    if (!exists) {
      combinedAccounts.push({
        id: t.id,
        userId: t.userId || t.id,
        name: t.name,
        role: "teacher",
        username: t.phone || `teacher_${t.id}`,
        phone: t.phone || "—",
        status: t.status || "active",
        source: "teacher",
      });
    }
  });

  (window.appStore.students || []).forEach((s) => {
    if (!combinedAccounts.some((a) => a.id === s.id)) {
      combinedAccounts.push({
        id: s.id,
        name: s.name,
        role: "student",
        username: s.phone || s.nationalId || "طالب",
        phone: s.phone || s.parentPhone || "—",
        status: s.status === "active" ? "active" : "archived",
        source: "student",
      });
    }
  });

  const filtered = combinedAccounts.filter((acc) => {
    const matchesSearch =
      (acc.name && acc.name.toLowerCase().includes(searchVal)) ||
      (acc.username && String(acc.username).includes(searchVal)) ||
      (acc.phone && String(acc.phone).includes(searchVal));

    const matchesRole = roleFilter === "all" || acc.role === roleFilter;
    let matchesStatus = true;
    if (statusFilter === "active") matchesStatus = acc.status === "active";
    else if (statusFilter === "suspended")
      matchesStatus = acc.status === "suspended" || acc.status === "archived";

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">لا توجد حسابات مطابقة</td></tr>`;
    return;
  }

  let html = "";
  filtered.forEach((acc, idx) => {
    const roleBadge =
      acc.role === "teacher"
        ? '<span class="badge" style="background:#9c6d47; color:#fff;">معلم</span>'
        : acc.role === "screen"
          ? '<span class="badge" style="background:#2e7d32; color:#fff;">التميز الأسبوعي</span>'
          : '<span class="badge badge-warning">طالب</span>';

    const isActive = acc.status === "active";

    html += `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-weight: 700;">${acc.name}</td>
        <td>${roleBadge}</td>
        <td><code>${acc.username}</code></td>
        <td>
          <span class="badge ${isActive ? "badge-active" : "badge-danger"}">
            ${isActive ? "نشط" : "موقوف (مؤرشف)"}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn ${isActive ? "btn-danger" : "btn-success"} btn-sm" onclick="toggleUserAccountStatus('${acc.id}', '${acc.source}', '${acc.role}')">
              ${isActive ? "إيقاف الحساب" : "تفعيل الحساب"}
            </button>
            <button class="btn btn-outline-brown btn-sm" onclick="openModalEditUserAccount('${acc.id}', '${acc.source}')">تعديل الرقم السري</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function toggleUserAccountStatus(id, source, role) {
  if (role === "admin" && window.currentUser && window.currentUser.id === id) {
    alert("⚠️ لا يمكنك إيقاف حساب المدير المسجل به حالياً.");
    return;
  }

  if (source === "student") {
    toggleArchiveStudent(id);
    return;
  }

  if (source === "teacher" || role === "teacher") {
    const teach = (window.appStore.teachers || []).find(
      (t) => t.id === id || t.userId === id,
    );
    if (teach) {
      teach.status = teach.status === "active" ? "suspended" : "active";
      if (typeof saveToCloud === "function")
        saveToCloud("teachers", teach.id, teach);
    }
  }

  const user = (window.appStore.users || []).find(
    (u) => u.id === id || (source === "teacher" && u.id === `u_t_${id}`),
  );
  if (user) {
    user.status = user.status === "active" ? "suspended" : "active";
    if (typeof saveToCloud === "function") saveToCloud("users", user.id, user);
  }

  renderAccountsTable();
  if (typeof renderTeachersTable === "function") renderTeachersTable();
  if (typeof renderStudentsTable === "function") renderStudentsTable();
}

function openModalEditUserAccount(id, source) {
  const setVal = (inputid, val) => {
    const el = document.getElementById(inputid);
    if (el) el.value = val !== undefined && val !== null ? val : "";
  };

  if (source === "student") {
    openModalEditStudentComprehensive(id);
    return;
  }

  if (source === "teacher") {
    const teach = (window.appStore.teachers || []).find((t) => t.id === id);
    if (teach) {
      openModalEditTeacher(teach.id);
      return;
    }
  }

  const user = (window.appStore.users || []).find((u) => u.id === id);
  if (!user) return;

  setVal("edit-account-user-id", user.id);
  setVal("edit-account-name", user.name);
  setVal("edit-account-username", user.username || "");
  setVal("edit-account-password", user.pass || "");

  if (typeof openModal === "function") openModal("modal-edit-user-account");
}

function handleSaveUserAccount(e) {
  e.preventDefault();
  const id = document.getElementById("edit-account-user-id")?.value;
  const user = (window.appStore.users || []).find((u) => u.id === id);

  if (user) {
    user.name =
      document.getElementById("edit-account-name")?.value.trim() || user.name;
    user.username =
      document.getElementById("edit-account-username")?.value.trim() ||
      user.username;
    const newPass = document
      .getElementById("edit-account-password")
      ?.value.trim();
    if (newPass) user.pass = newPass;

    if (typeof saveToCloud === "function") saveToCloud("users", user.id, user);
    if (typeof saveLocalStore === "function") saveLocalStore();
    alert("✅ تم حفظ تعديلات الحساب والرقم السري بنجاح!");
  }

  if (typeof closeModal === "function") closeModal("modal-edit-user-account");
  renderAccountsTable();
}

// 11. إرسال الرسائل والإشعارات
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

// 12. طلبات تعديل البيانات
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
          <button class="btn btn-success btn-sm" onclick="approveProfileRequest('${req.id}')">قبول</button>
          <button class="btn btn-danger btn-sm" onclick="rejectProfileRequest('${req.id}')">رفض</button>
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
    if (typeof saveToCloud === "function")
      saveToCloud("students", student.id, student);
  }

  req.status = "approved";
  if (typeof saveToCloud === "function")
    saveToCloud("profileRequests", req.id, req);
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
  if (typeof saveToCloud === "function")
    saveToCloud("profileRequests", req.id, req);
  alert(`❌ تم رفض طلب التعديل.`);
  renderProfileRequestsList();
}
