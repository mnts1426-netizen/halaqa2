/**
 * ==========================================================================
 * tasmeea.js - محرك التسميع اليومي، إتاحة التسميع للمدير، وتوثيق عمليات المعلمين
 * مَجْمَع عبدالله بن مهدي القرآني
 * ==========================================================================
 */

window.appStore = window.appStore || {
  students: [],
  teachers: [],
  circles: [],
  tasmeea: [],
  attendance: [],
  teacherLogs: [],
};

document.addEventListener("DOMContentLoaded", () => {
  const circleSelect = document.getElementById("tasmeea-circle-select");
  const dateSelect = document.getElementById("tasmeea-date-select");

  if (dateSelect && !dateSelect.value) {
    // تاريخ اليوم بالتوقيت المحلي - وليس عبر toISOString() التي تحوّل للتوقيت العالمي
    // UTC فتُظهر أحياناً تاريخ الأمس (بين منتصف الليل والثالثة فجراً بتوقيت السعودية
    // UTC+3)، فيُحفظ اعتماد المعلم/المدير تحت تاريخ خاطئ ويبدو أن التعديل "لم يُحفظ"
    // عند البحث عنه لاحقاً تحت تاريخ اليوم الصحيح
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    dateSelect.value = `${y}-${m}-${d}`;
  }

  if (circleSelect) {
    circleSelect.addEventListener("change", renderTasmeeaStudents);
  }
  if (dateSelect) {
    dateSelect.addEventListener("change", renderTasmeeaStudents);
  }

  const kashfCircleSelect = document.getElementById("kashf-circle-select");
  if (kashfCircleSelect) {
    kashfCircleSelect.addEventListener("change", renderTasmeeaKashfStudents);
  }
});

function isOfficialWorkdayTasmeea(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day >= 0 && day <= 3;
}

// تذكير غير مزعج (نافذة في منتصف الشاشة، وليس شريطاً بالأعلى) يظهر للمعلم بحد
// أقصى مرتين في اليوم، وفقط أيام الأحد-الأربعاء، لتذكيره بتحضير طلابه إن لم يكن
// قد أتمّ ذلك بعد - بدون قفل أي شيء، يُغلَق فوراً بضغطة زر واحدة
const TASMEEA_ATT_REMINDER_KEY_PREFIX = "halaqat_tasmeea_att_reminder_";

function maybeShowTasmeeaAttendanceReminderModal() {
  const today = toLocalDateStr(new Date());
  if (!isOfficialWorkdayTasmeea(today)) return;
  if (document.getElementById("tasmeea-attendance-reminder-modal")) return;

  const storageKey = TASMEEA_ATT_REMINDER_KEY_PREFIX + today;
  const shownCount = Number(localStorage.getItem(storageKey) || 0);
  if (shownCount >= 2) return;
  localStorage.setItem(storageKey, String(shownCount + 1));

  const modal = document.createElement("div");
  modal.id = "tasmeea-attendance-reminder-modal";
  modal.style.cssText =
    "position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 99998;";
  modal.innerHTML = `
    <div style="background: #fff; border-radius: 12px; padding: 1.5rem; max-width: 340px; width: 90%; text-align: center; box-shadow: 0 8px 30px rgba(0,0,0,0.25);">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏰</div>
      <h3 style="margin: 0 0 0.5rem; font-weight: 800; color: var(--primary-brown);">تذكير بتحضير الطلاب</h3>
      <p class="text-muted" style="margin-bottom: 1.2rem;">لا تنسَ تحضير جميع طلاب حلقتك لهذا اليوم.</p>
      <button class="btn btn-primary" style="width: 100%;" onclick="document.getElementById('tasmeea-attendance-reminder-modal').remove()">إنهاء</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function getCircleNameTasmeea(circleId) {
  const c = (window.appStore?.circles || []).find((x) => x.id === circleId);
  return c ? c.name : "—";
}

// ترحيل تلقائي لمقرر اليوم: يبقى نفس آخر مقرر معروف ويتكرر يوماً بعد يوم
window.getCarriedForwardLessonValue = function (
  studentId,
  dateVal,
  todayField,
  nextFieldName,
) {
  const allTasm = (window.appStore?.tasmeea || [])
    .filter((t) => t.studentId === studentId)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const todayRecord = allTasm.find((t) => t.date === dateVal);
  if (todayRecord && todayRecord[todayField]) {
    return todayRecord[todayField];
  }

  for (const t of allTasm) {
    if (t.date >= dateVal) continue;
    if (t[nextFieldName]) return t[nextFieldName];
    if (t[todayField]) return t[todayField];
  }
  return "";
};

// عرض قائمة طلاب الحلقة مع إتاحة الوصول الكامل للمدير وعزل المعلم
function renderTasmeeaStudents() {
  const circleId = document.getElementById("tasmeea-circle-select")?.value;
  const dateVal = document.getElementById("tasmeea-date-select")?.value;
  const container = document.getElementById("tasmeea-students-container");

  if (!container) return;

  const user = window.currentUser;
  const isTeacher = user && user.role === "teacher";

  if (isTeacher) {
    const teacherObj = (window.appStore?.teachers || []).find(
      (t) =>
        t.userId === user.id ||
        t.id === user.teacherId ||
        t.id === user.id ||
        t.phone === user.phone,
    );
    const teacherId = teacherObj ? teacherObj.id : user.teacherId || user.id;

    const teacherCircles = (window.appStore?.circles || []).filter(
      (c) =>
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(teacherId)) ||
        c.teacherId === teacherId,
    );
    const teacherCircleIds = teacherCircles.map((c) => c.id);

    if (circleId && !teacherCircleIds.includes(circleId)) {
      container.innerHTML = `
        <div class="empty-state-card">
          <h3>⚠️ غير مصرح لك بالوصول</h3>
          <p class="text-muted">هذه الحلقة غير مسندة لك حالياً.</p>
        </div>
      `;
      return;
    }
  }

  if (!circleId) {
    container.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </div>
        <h3>اختر الحلقة للتسميع</h3>
        <p class="text-muted">اختر حلقة وتاريخ لبدء تسجيل أو تعديل التسميع اليومي والتحضير</p>
      </div>
    `;
    return;
  }

  const circleStudents = (window.appStore.students || [])
    .filter((s) => s.circleId === circleId && s.status === "active")
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

  if (circleStudents.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <h3>لا يوجد طلاب في هذه الحلقة</h3>
        <p class="text-muted">يمكنك إضافة طلاب للحلقة من شاشة إدارة المَجْمَع</p>
      </div>
    `;
    return;
  }

  // تنبيه توعوي فقط (لا يقفل تسجيل المقررات): يذكّر المعلم بتحضير كل طلاب
  // الحلقة لهذا اليوم إن لم يكن قد فعل بعد. المدير لا يُعنى بهذا التنبيه.
  const allAttendanceTaken = circleStudents.every((s) => {
    const rec = (window.appStore.attendance || []).find(
      (a) => a.studentId === s.id && a.date === dateVal,
    );
    return rec && rec.status && rec.status !== "";
  });
  const isAdminUser = user && user.role === "admin";
  const showAttendanceReminderBanner = !isAdminUser && !allAttendanceTaken;

  let html = "";
  if (showAttendanceReminderBanner) {
    const remaining = circleStudents.filter((s) => {
      const rec = (window.appStore.attendance || []).find(
        (a) => a.studentId === s.id && a.date === dateVal,
      );
      return !(rec && rec.status && rec.status !== "");
    }).length;
    html += `
      <div class="empty-state-card" style="margin-bottom: 1rem; background: #fff3e0; border: 1px solid #ffcc80;">
        <h3>⚠️ سجّل حضور جميع الطلاب</h3>
        <p class="text-muted">يفضَّل تحضير جميع طلاب الحلقة لهذا اليوم قبل البدء بتسجيل المقررات. متبقٍ (${remaining}) طالباً بدون تحضير.</p>
      </div>
    `;
  }

  circleStudents.forEach((student, index) => {
    const existingRecord =
      (window.appStore.tasmeea || []).find(
        (t) => t.studentId === student.id && t.date === dateVal,
      ) || {};

    const attRecord =
      (window.appStore.attendance || []).find(
        (a) => a.studentId === student.id && a.date === dateVal,
      ) || {};

    html += buildStudentAccordionCard(
      student,
      existingRecord,
      attRecord,
      index + 1,
      dateVal,
    );
  });

  container.innerHTML = html;

  if (
    !isAdminUser &&
    !allAttendanceTaken &&
    typeof maybeShowTasmeeaAttendanceReminderModal === "function"
  ) {
    maybeShowTasmeeaAttendanceReminderModal();
  }
}

// كشف المرحليات: متابعة عدد الصفحات الباقية على كل طالب حتى يُتم حفظ المرحلية
// (جزئين)، تعبئته مفتوحة دائماً للمعلم وغير مرتبطة بيوم أو أسبوع محدد
function renderTasmeeaKashfStudents() {
  const circleId = document.getElementById("kashf-circle-select")?.value;
  const container = document.getElementById("kashf-students-container");
  if (!container) return;

  const user = window.currentUser;
  const isTeacher = user && user.role === "teacher";

  if (isTeacher) {
    const teacherObj = (window.appStore?.teachers || []).find(
      (t) =>
        t.userId === user.id ||
        t.id === user.teacherId ||
        t.id === user.id ||
        t.phone === user.phone,
    );
    const teacherId = teacherObj ? teacherObj.id : user.teacherId || user.id;

    const teacherCircles = (window.appStore?.circles || []).filter(
      (c) =>
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(teacherId)) ||
        c.teacherId === teacherId,
    );
    const teacherCircleIds = teacherCircles.map((c) => c.id);

    if (circleId && !teacherCircleIds.includes(circleId)) {
      container.innerHTML = `
        <div class="empty-state-card">
          <h3>⚠️ غير مصرح لك بالوصول</h3>
          <p class="text-muted">هذه الحلقة غير مسندة لك حالياً.</p>
        </div>
      `;
      return;
    }
  }

  if (!circleId) {
    container.innerHTML = `
      <div class="empty-state-card">
        <h3>اختر الحلقة</h3>
        <p class="text-muted">قم باختيار الحلقة لعرض كشف المرحليات الخاص بطلابها</p>
      </div>
    `;
    return;
  }

  const circleStudents = (window.appStore.students || [])
    .filter((s) => s.circleId === circleId && s.status === "active")
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

  if (circleStudents.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <h3>لا يوجد طلاب في هذه الحلقة</h3>
        <p class="text-muted">يمكنك إضافة طلاب للحلقة من شاشة إدارة المَجْمَع</p>
      </div>
    `;
    return;
  }

  const isAdminUser = user && user.role === "admin";

  let rows = "";
  circleStudents.forEach((student, index) => {
    const entry =
      (window.appStore.tasmeeaKashf || []).find(
        (k) => k.studentId === student.id,
      ) || {};

    const remainingVal =
      entry.remainingPages === undefined || entry.remainingPages === null
        ? ""
        : entry.remainingPages;
    const prevRemainingHtml =
      entry.previousRemainingPages !== undefined &&
      entry.previousRemainingPages !== null
        ? `<div class="text-muted" style="font-size: 0.7rem; margin-top: 2px;">السابق: ${escapeHtml(String(entry.previousRemainingPages))}</div>`
        : "";
    const prevNotesHtml =
      entry.previousNotes
        ? `<div class="text-muted" style="font-size: 0.7rem; margin-top: 2px;">السابق: ${escapeHtml(entry.previousNotes)}</div>`
        : "";

    rows += `
      <tr>
        <td style="text-align: center; width: 40px;">${index + 1}</td>
        <td style="font-weight: 700;">${escapeHtml(student.name)}</td>
        <td style="width: 140px;">
          <input
            type="number"
            min="0"
            class="form-control"
            value="${remainingVal}"
            placeholder="عدد الصفحات"
            onchange="saveKashfField('${student.id}', '${circleId}', 'remainingPages', this.value)"
          />
          ${prevRemainingHtml}
        </td>
        <td>
          <input
            type="text"
            class="form-control"
            value="${escapeHtml(entry.notes || "")}"
            placeholder="ملاحظات"
            onchange="saveKashfField('${student.id}', '${circleId}', 'notes', this.value)"
          />
          ${prevNotesHtml}
        </td>
        ${
          isAdminUser
            ? `<td style="width: 60px; text-align: center;">
          <button class="btn btn-danger btn-sm" title="حذف بيانات هذا الطالب من الكشف" onclick="deleteKashfEntry('${student.id}')">🗑️</button>
        </td>`
            : ""
        }
      </tr>
    `;
  });

  container.innerHTML = `
    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px;">م</th>
              <th>اسم الطالب</th>
              <th style="width: 140px;">عدد الصفحات الباقي</th>
              <th>ملاحظات</th>
              ${isAdminUser ? '<th style="width: 60px;">حذف</th>' : ""}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// حذف بيانات كشف المرحليات لطالب واحد (متاح للمدير فقط من واجهة العرض) - يعيد
// الصف لحالته الفارغة الأصلية دون التأثير على بقية طلاب الحلقة
window.deleteKashfEntry = function (studentId) {
  const user = window.currentUser;
  if (!user || user.role !== "admin") {
    alert("⚠️ هذه الخاصية متاحة لمدير المَجْمَع فقط.");
    return;
  }
  if (!confirm("هل أنت متأكد من حذف بيانات هذا الطالب من كشف المرحليات؟"))
    return;

  saveToCloud("tasmeeaKashf", `kashf_${studentId}`, null, true);
  if (typeof showQuickSaveConfirmation === "function") {
    showQuickSaveConfirmation("🗑️ تم الحذف");
  }
  renderTasmeeaKashfStudents();
};

// استخراج/طباعة تقرير كشف المرحليات لنفس الحلقة المختارة، مباشرة من شاشة الكشف
// نفسها (متاح للمدير فقط) - يستخدم محرك التقارير المشترك (reports.js) بنفس
// التصميم والترويسة والتذييل المستخدمين في بقية التقارير، دون مغادرة الشاشة
window.printKashfPageReport = function () {
  const user = window.currentUser;
  if (!user || user.role !== "admin") {
    alert("⚠️ هذه الخاصية متاحة لمدير المَجْمَع فقط.");
    return;
  }
  const circleId = document.getElementById("kashf-circle-select")?.value;
  if (!circleId) {
    alert("⚠️ يرجى اختيار الحلقة أولاً.");
    return;
  }

  const reportCircleSelect = document.getElementById("report-circle-select");
  const reportTypeSelect = document.getElementById("report-type-select");
  if (!reportCircleSelect || !reportTypeSelect) return;

  reportCircleSelect.value = circleId;
  reportTypeSelect.value = "tasmeea_kashf";
  if (typeof handleReportTypeChange === "function") handleReportTypeChange();
  if (typeof generateReport === "function") generateReport();
  if (typeof printOfficialReport === "function") printOfficialReport();
};

// حفظ حقل واحد من كشف المرحليات لطالب محدد، مع الاحتفاظ بالقيمة السابقة (قبل هذا
// التعديل) لغرض المتابعة - بدون التأثير على بقية حقول الكشف الخاصة بنفس الطالب
window.saveKashfField = function (studentId, circleId, field, rawValue) {
  const user = window.currentUser;
  const existing =
    (window.appStore.tasmeeaKashf || []).find(
      (k) => k.studentId === studentId,
    ) || {};

  const value =
    field === "remainingPages"
      ? rawValue === ""
        ? null
        : Number(rawValue)
      : rawValue;

  const entry = {
    id: existing.id || `kashf_${studentId}`,
    studentId,
    circleId,
    remainingPages:
      existing.remainingPages === undefined ? null : existing.remainingPages,
    notes: existing.notes || "",
    previousRemainingPages:
      existing.previousRemainingPages === undefined
        ? null
        : existing.previousRemainingPages,
    previousNotes: existing.previousNotes || "",
    updatedAt: Date.now(),
    updatedByName: user ? user.name || user.username || "" : "",
    updatedByRole: user ? user.role : "",
  };

  if (field === "remainingPages") {
    entry.previousRemainingPages =
      existing.remainingPages === undefined ? null : existing.remainingPages;
    entry.remainingPages = value;
  } else if (field === "notes") {
    entry.previousNotes = existing.notes || "";
    entry.notes = value;
  }

  if (!window.appStore.tasmeeaKashf) window.appStore.tasmeeaKashf = [];
  const idx = window.appStore.tasmeeaKashf.findIndex(
    (k) => k.studentId === studentId,
  );
  if (idx >= 0) window.appStore.tasmeeaKashf[idx] = entry;
  else window.appStore.tasmeeaKashf.push(entry);

  saveToCloud("tasmeeaKashf", entry.id, entry);
  if (typeof showQuickSaveConfirmation === "function") {
    showQuickSaveConfirmation("✅ تم حفظ التعديل");
  }
  renderTasmeeaKashfStudents();
};

function buildStudentAccordionCard(
  student,
  record,
  attRecord,
  index,
  currentDateVal,
) {
  const ratings = ["ممتاز", "جيد جداً", "جيد", "يعيد"];

  const buildRatingSelect = (currentVal, name) => {
    let opts = '<option value="">— التقدير —</option>';
    ratings.forEach((r) => {
      const selected = currentVal === r ? "selected" : "";
      opts += `<option value="${r}" ${selected}>${r}</option>`;
    });
    return `<select class="form-control" name="${name}" style="font-weight: 700; background: #fff;">${opts}</select>`;
  };

  const isSaved = Boolean(record.id);
  const user = window.currentUser;
  const isAdmin = user && user.role === "admin";

  // الحالة تكون غير محددة افتراضياً حتى يسجل المعلم أي طالب
  const currentAtt = attRecord.status || "";

  const initialHifz = getCarriedForwardLessonValue(
    student.id,
    currentDateVal,
    "hifzSurah",
    "nextHifz",
  );
  const initialMurajaa = getCarriedForwardLessonValue(
    student.id,
    currentDateVal,
    "murajaaSurah",
    "nextMurajaa",
  );
  const initialTilawa = getCarriedForwardLessonValue(
    student.id,
    currentDateVal,
    "tilawaSurah",
    "nextTilawa",
  );

  // المعلم: ثلاث حالات فقط (غير محدد/حاضر/غائب)، ولا يقدر يعدّل حالة سبق تسجيلها
  // (القائمة تُقفَل بعدها). المدير: كل الحالات الأربع دائماً وقابلة للتعديل دوماً
  const isLockedForTeacher = !isAdmin && currentAtt !== "";
  const quickAttOptions = isAdmin
    ? `
    <option value="" ${currentAtt === "" ? "selected" : ""}>— غير محدد —</option>
    <option value="present" ${currentAtt === "present" ? "selected" : ""}>🟢 حاضر</option>
    <option value="late" ${currentAtt === "late" ? "selected" : ""}>🟡 متأخر</option>
    <option value="absent" ${currentAtt === "absent" ? "selected" : ""}>🔴 غائب</option>
    <option value="excused" ${currentAtt === "excused" ? "selected" : ""}>🔵 مستأذن</option>
  `
    : `
    <option value="" ${currentAtt === "" ? "selected" : ""}>— غير محدد —</option>
    <option value="present" ${currentAtt === "present" ? "selected" : ""}>🟢 حاضر</option>
    <option value="absent" ${currentAtt === "absent" ? "selected" : ""}>🔴 غائب</option>
  `;

  return `
    <div class="card mb-3" style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;" id="tasmeea-card-${student.id}">
      
      <!-- شريط الطالب الرئيسي -->
      <div class="card-header flex-between p-3" style="background: #faf8f5; cursor: pointer;" onclick="toggleTasmeeaAccordion('${student.id}')">
        <div class="flex-align-gap" style="flex: 1;">
          <span class="avatar-sm" style="background: var(--primary-brown); color:#fff; border-radius:50%; width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.85rem;">
            ${index}
          </span>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem; font-weight:800; color: var(--text-dark);">
              ${escapeHtml(student.name)}
            </h3>
            <small class="text-muted">
              ${isSaved ? '<span style="color:#2e7d32; font-weight:700;">🟢 تم رصد التسميع</span>' : "⚪ لم يُرصد التسميع بعد"}
              ${isAdmin ? '<span class="badge" style="background:#805333; color:#fff; margin-right:4px; font-size:0.72rem;">تعديل المدير</span>' : ""}
            </small>
          </div>
        </div>

        <div class="flex-align-gap" onclick="event.stopPropagation();">
          <select class="form-control" style="width: auto; min-width: 135px; font-weight: 700;" onchange="saveQuickAttendance('${student.id}', this.value)" ${isLockedForTeacher ? 'disabled title="لا يمكن تعديل حالة مسجّلة مسبقاً - متاح لمدير المَجْمَع فقط"' : ""}>
            ${quickAttOptions}
          </select>

          <span id="tasmeea-arrow-${student.id}" style="font-size: 0.9rem; color: var(--primary-brown); margin-right: 0.5rem; transition: transform 0.2s;">
            ▼
          </span>
        </div>
      </div>

      <!-- تفاصيل التسميع وتعديل المقررات المتاحة للمدير والمعلم -->
      <div id="tasmeea-details-${student.id}" style="display: none; padding: 1.25rem; border-top: 1px solid var(--border-color); background: #ffffff;">
        <form onsubmit="saveStudentTasmeea(event, '${student.id}')">
          <div class="tasmeea-sections-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            
            <!-- 1. الدرس الجديد -->
            <div class="tasmeea-section-box p-3" style="background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px;">
              <h4 style="font-weight: 800; color: var(--primary-brown); margin-bottom: 0.6rem;">📖 الدرس الجديد</h4>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">مقرر اليوم</label>
                <input type="text" class="form-control" name="hifz_surah" value="${escapeHtml(initialHifz)}" placeholder="مثال: البقرة (1-15)">
              </div>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">التقدير</label>
                ${buildRatingSelect(record.hifzRating, "hifz_rating")}
              </div>
              <div class="form-group mb-2" style="border-top: 2px dashed #ef6c00; background: linear-gradient(135deg, #fff3e0 0%, #ffebee 100%); border-radius: 6px; padding: 0.5rem 0.6rem; margin-top: 0.5rem;">
                <label style="font-size: 0.82rem; color: #d84315; font-weight: 800;">📌 مقرر الغد</label>
                <input type="text" class="form-control" name="next_hifz" value="${escapeHtml(record.nextHifz)}" placeholder="مثال: سورة البقرة (16-30)">
              </div>
              <button type="button" class="btn btn-success btn-sm" style="width: 100%;" onclick="saveTasmeeaSection('${student.id}', 'hifz')">✅ اعتماد الدرس الجديد (اليوم والغد)</button>
              ${isAdmin ? `<button type="button" class="btn btn-danger btn-sm mt-1" style="width: 100%;" onclick="cancelTasmeeaSection('${student.id}', 'hifz')">↩️ إلغاء الاعتماد</button>` : ""}
            </div>

            <!-- 2. المراجعة -->
            <div class="tasmeea-section-box p-3" style="background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px;">
              <h4 style="font-weight: 800; color: var(--primary-brown); margin-bottom: 0.6rem;">🔄 المراجعة</h4>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">مقرر اليوم</label>
                <input type="text" class="form-control" name="murajaa_surah" value="${escapeHtml(initialMurajaa)}" placeholder="مثال: سورة يس كاملة">
              </div>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">التقدير</label>
                ${buildRatingSelect(record.murajaaRating, "murajaa_rating")}
              </div>
              <div class="form-group mb-2" style="border-top: 2px dashed #ef6c00; background: linear-gradient(135deg, #fff3e0 0%, #ffebee 100%); border-radius: 6px; padding: 0.5rem 0.6rem; margin-top: 0.5rem;">
                <label style="font-size: 0.82rem; color: #d84315; font-weight: 800;">📌 مقرر الغد</label>
                <input type="text" class="form-control" name="next_murajaa" value="${escapeHtml(record.nextMurajaa)}" placeholder="مثال: سورة الكهف كاملة">
              </div>
              <button type="button" class="btn btn-success btn-sm" style="width: 100%;" onclick="saveTasmeeaSection('${student.id}', 'murajaa')">✅ اعتماد المراجعة (اليوم والغد)</button>
              ${isAdmin ? `<button type="button" class="btn btn-danger btn-sm mt-1" style="width: 100%;" onclick="cancelTasmeeaSection('${student.id}', 'murajaa')">↩️ إلغاء الاعتماد</button>` : ""}
            </div>

            <!-- 3. التلاوة -->
            <div class="tasmeea-section-box p-3" style="background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px;">
              <h4 style="font-weight: 800; color: var(--primary-brown); margin-bottom: 0.6rem;">🎧 التلاوة</h4>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">مقرر اليوم</label>
                <input type="text" class="form-control" name="tilawa_surah" value="${escapeHtml(initialTilawa)}" placeholder="مثال: آل عمران (1-20)">
              </div>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">التقدير</label>
                ${buildRatingSelect(record.tilawaRating, "tilawa_rating")}
              </div>
              <div class="form-group mb-2" style="border-top: 2px dashed #ef6c00; background: linear-gradient(135deg, #fff3e0 0%, #ffebee 100%); border-radius: 6px; padding: 0.5rem 0.6rem; margin-top: 0.5rem;">
                <label style="font-size: 0.82rem; color: #d84315; font-weight: 800;">📌 مقرر الغد</label>
                <input type="text" class="form-control" name="next_tilawa" value="${escapeHtml(record.nextTilawa)}" placeholder="مثال: سورة النساء (1-10)">
              </div>
              <button type="button" class="btn btn-success btn-sm" style="width: 100%;" onclick="saveTasmeeaSection('${student.id}', 'tilawa')">✅ اعتماد التلاوة (اليوم والغد)</button>
              ${isAdmin ? `<button type="button" class="btn btn-danger btn-sm mt-1" style="width: 100%;" onclick="cancelTasmeeaSection('${student.id}', 'tilawa')">↩️ إلغاء الاعتماد</button>` : ""}
            </div>

          </div>

          <!-- الملاحظات -->
          <div class="form-row mt-3">
            <div class="form-group flex-1">
              <label style="font-size: 0.85rem; font-weight: 700;">💬 توجيه وملاحظة للطالب وولي الأمر:</label>
              <input type="text" class="form-control" name="student_notes" value="${escapeHtml(record.studentNotes)}" placeholder="أحسنت الترتيل، يُرجى التركيز على الغنة...">
            </div>
            <div class="form-group flex-1">
              <label style="font-size: 0.85rem; font-weight: 700; color: var(--primary-brown);">📝 ملاحظة موجهة للإدارة:</label>
              <input type="text" class="form-control" name="admin_notes" value="${escapeHtml(record.adminNotes)}" placeholder="اكتب ملاحظة خاصة موجهة للمدير بخصوص الطالب...">
            </div>
          </div>

          <!-- زر الحفظ والاعتماد -->
          <div class="mt-3 text-left" style="display: flex; justify-content: flex-end;">
            <button type="submit" class="btn btn-primary">اعتماد الملاحظات</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function toggleTasmeeaAccordion(studentId) {
  const details = document.getElementById(`tasmeea-details-${studentId}`);
  const arrow = document.getElementById(`tasmeea-arrow-${studentId}`);
  if (!details) return;

  const isHidden =
    details.style.display === "none" || details.style.display === "";
  details.style.display = isHidden ? "block" : "none";
  if (arrow) {
    arrow.textContent = isHidden ? "▲" : "▼";
  }
}

// التحضير السريع: تفعيل تغييب غير المحضرين تلقائياً فور تحضير أول طالب
function saveQuickAttendance(studentId, status) {
  const dateVal = document.getElementById("tasmeea-date-select")?.value;
  const circleId = document.getElementById("tasmeea-circle-select")?.value;

  if (!dateVal) {
    alert("⚠️ يرجى تحديد التاريخ أولاً");
    return;
  }

  const user = window.currentUser;
  const isTeacher = user && user.role === "teacher";
  const isAdmin = user && user.role === "admin";

  const recordId = `att_${studentId}_${dateVal}`;
  if (!window.appStore.attendance) window.appStore.attendance = [];

  let record = window.appStore.attendance.find((a) => a.id === recordId);

  if (isTeacher) {
    if (status !== "" && status !== "present" && status !== "absent") {
      alert("⚠️ المعلم يقدر يسجّل فقط (حاضر) أو (غائب).");
      renderTasmeeaStudents();
      return;
    }
    if (record && record.status && record.status !== "") {
      alert(
        "⚠️ لا يمكن تعديل حالة حضور مسجّلة مسبقاً - هذا متاح لمدير المَجْمَع فقط.",
      );
      renderTasmeeaStudents();
      return;
    }
  }

  if (
    record &&
    typeof record.status !== "undefined" &&
    record.status !== status &&
    typeof window.logAttendanceHistorySnapshot === "function"
  ) {
    window.logAttendanceHistorySnapshot(record, user);
  }

  if (!record) {
    record = {
      id: recordId,
      studentId: studentId,
      circleId: circleId || "",
      date: dateVal,
      status: status,
      notes: isTeacher ? "تحضير المعلم" : "تحضير الإدارة",
      updatedBy: isTeacher ? "teacher" : "admin",
      createdAt: Date.now(),
    };
    window.appStore.attendance.push(record);
  } else {
    record.status = status;
    if (circleId) record.circleId = circleId;
    record.updatedBy = isTeacher ? "teacher" : "admin";
  }

  if (typeof saveToCloud === "function") {
    saveToCloud("attendance", record.id, record);
  }

  if (typeof saveLocalStore === "function") saveLocalStore();

  // تحديث فوري لكروت التسميع ليظهر التغييب التلقائي لبقية الطلاب مباشرة
  renderTasmeeaStudents();

  if (typeof window.logTeacherActivity === "function") {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === studentId,
    );
    const stuName = student ? student.name : "طالب";
    const statusText =
      status === "present"
        ? "حاضر 🟢"
        : status === "late"
          ? "متأخر 🟡"
          : status === "absent"
            ? "غائب 🔴"
            : status === "excused"
              ? "مستأذن 🔵"
              : "إلغاء التحضير";

    const actorTitle = isAdmin ? "المدير" : "المعلم";
    window.logTeacherActivity(
      "تحضير سريع",
      `رصد حضور الطالب (${stuName}) كـ (${statusText}) بواسطة (${actorTitle})`,
      user?.name || actorTitle,
      getCircleNameTasmeea(circleId),
    );
  }
}

// اعتماد قسم واحد فقط
function saveTasmeeaSection(studentId, section) {
  const dateVal = document.getElementById("tasmeea-date-select")?.value;
  const circleId = document.getElementById("tasmeea-circle-select")?.value;

  if (!dateVal || !circleId) {
    alert("⚠️ يرجى التأكد من اختيار الحلقة والتاريخ أولاً.");
    return;
  }

  const detailsEl = document.getElementById(`tasmeea-details-${studentId}`);
  if (!detailsEl) return;

  const fieldMap = {
    hifz: {
      surahField: "hifz_surah",
      ratingField: "hifz_rating",
      nextField: "next_hifz",
      recordSurah: "hifzSurah",
      recordRating: "hifzRating",
      recordNext: "nextHifz",
      recordOrder: "hifzOrderAt",
      label: "الدرس الجديد",
    },
    murajaa: {
      surahField: "murajaa_surah",
      ratingField: "murajaa_rating",
      nextField: "next_murajaa",
      recordSurah: "murajaaSurah",
      recordRating: "murajaaRating",
      recordNext: "nextMurajaa",
      recordOrder: "murajaaOrderAt",
      label: "المراجعة",
    },
    tilawa: {
      surahField: "tilawa_surah",
      ratingField: "tilawa_rating",
      nextField: "next_tilawa",
      recordSurah: "tilawaSurah",
      recordRating: "tilawaRating",
      recordNext: "nextTilawa",
      recordOrder: "tilawaOrderAt",
      label: "التلاوة",
    },
  };
  const cfg = fieldMap[section];
  if (!cfg) return;

  const surahVal = (
    detailsEl.querySelector(`[name="${cfg.surahField}"]`)?.value || ""
  ).trim();
  const ratingVal =
    detailsEl.querySelector(`[name="${cfg.ratingField}"]`)?.value || "";
  const nextVal = (
    detailsEl.querySelector(`[name="${cfg.nextField}"]`)?.value || ""
  ).trim();

  if (!surahVal && !ratingVal && !nextVal) {
    alert(
      `⚠️ يرجى تعبئة مقرر اليوم أو الغد الخاص بـ (${cfg.label}) قبل الاعتماد.`,
    );
    return;
  }

  const user = window.currentUser;
  const isAdmin = user && user.role === "admin";
  const recordId = `tasm_${studentId}_${dateVal}`;

  if (!window.appStore.tasmeea) window.appStore.tasmeea = [];
  let record = window.appStore.tasmeea.find((t) => t.id === recordId);
  if (!record) {
    record = {
      id: recordId,
      studentId: studentId,
      circleId: circleId,
      date: dateVal,
      hifzSurah: "",
      hifzRating: "",
      murajaaSurah: "",
      murajaaRating: "",
      tilawaSurah: "",
      tilawaRating: "",
      rating: "",
      studentNotes: "",
      adminNotes: "",
      nextHifz: "",
      nextMurajaa: "",
      nextTilawa: "",
    };
    window.appStore.tasmeea.push(record);
  }

  record[cfg.recordSurah] = surahVal;
  record[cfg.recordRating] = ratingVal;
  record[cfg.recordNext] = nextVal;

  if (surahVal) {
    if (!record[cfg.recordOrder]) record[cfg.recordOrder] = Date.now();
  } else {
    record[cfg.recordOrder] = null;
  }
  record.rating =
    record.hifzRating || record.murajaaRating || record.tilawaRating || "ممتاز";
  record.updatedBy = isAdmin ? "admin" : "teacher";
  record.updatedAt = Date.now();

  if (typeof saveToCloud === "function") {
    saveToCloud("tasmeea", record.id, record);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  if (typeof window.logTeacherActivity === "function") {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === studentId,
    );
    const stuName = student ? student.name : "طالب";
    const actorTitle = isAdmin ? "المدير" : "المعلم";
    window.logTeacherActivity(
      `اعتماد ${cfg.label}`,
      `تم اعتماد (${cfg.label}) للطالب (${stuName}) - اليوم: ${surahVal || "—"} (${ratingVal || "—"}) | الغد: ${nextVal || "—"} بواسطة (${actorTitle})`,
      user?.name || actorTitle,
      getCircleNameTasmeea(circleId),
    );
  }

  alert(`✅ تم اعتماد (${cfg.label}) لليوم والغد بنجاح!`);
  renderTasmeeaStudents();
}

// إلغاء اعتماد قسم مُعتمد سابقاً
function cancelTasmeeaSection(studentId, section) {
  const user = window.currentUser;
  if (!user || user.role !== "admin") {
    alert("⚠️ إلغاء الاعتماد متاح للمدير فقط.");
    return;
  }

  const dateVal = document.getElementById("tasmeea-date-select")?.value;
  const circleId = document.getElementById("tasmeea-circle-select")?.value;
  if (!dateVal || !circleId) return;

  const fieldMap = {
    hifz: {
      recordSurah: "hifzSurah",
      recordRating: "hifzRating",
      recordNext: "nextHifz",
      recordOrder: "hifzOrderAt",
      label: "الدرس الجديد",
    },
    murajaa: {
      recordSurah: "murajaaSurah",
      recordRating: "murajaaRating",
      recordNext: "nextMurajaa",
      recordOrder: "murajaaOrderAt",
      label: "المراجعة",
    },
    tilawa: {
      recordSurah: "tilawaSurah",
      recordRating: "tilawaRating",
      recordNext: "nextTilawa",
      recordOrder: "tilawaOrderAt",
      label: "التلاوة",
    },
  };
  const cfg = fieldMap[section];
  if (!cfg) return;

  const recordId = `tasm_${studentId}_${dateVal}`;
  const record = (window.appStore.tasmeea || []).find((t) => t.id === recordId);
  if (!record) {
    alert("⚠️ لا يوجد اعتماد مسجّل لهذا القسم أصلاً.");
    return;
  }

  if (!confirm(`هل أنت متأكد من إلغاء اعتماد (${cfg.label}) لهذا الطالب؟`))
    return;

  record[cfg.recordSurah] = "";
  record[cfg.recordRating] = "";
  record[cfg.recordNext] = "";
  record[cfg.recordOrder] = null;
  record.rating =
    record.hifzRating || record.murajaaRating || record.tilawaRating || "";
  record.updatedBy = "admin";
  record.updatedAt = Date.now();

  if (typeof saveToCloud === "function") {
    saveToCloud("tasmeea", record.id, record);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  if (typeof window.logTeacherActivity === "function") {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === studentId,
    );
    const stuName = student ? student.name : "طالب";
    window.logTeacherActivity(
      `إلغاء اعتماد ${cfg.label}`,
      `تم إلغاء اعتماد (${cfg.label}) للطالب (${stuName}) بواسطة (المدير)`,
      user?.name || "المدير",
      getCircleNameTasmeea(circleId),
    );
  }

  alert(`↩️ تم إلغاء اعتماد (${cfg.label}) بنجاح.`);
  renderTasmeeaStudents();
}

// حفظ واعتماد التسميع وترحيل المقررات مع توثيق العملية
function saveStudentTasmeea(e, studentId) {
  e.preventDefault();
  const form = e.target;
  const dateVal = document.getElementById("tasmeea-date-select")?.value;
  const circleId = document.getElementById("tasmeea-circle-select")?.value;

  if (!dateVal || !circleId) {
    alert("⚠️ يرجى التأكد من اختيار الحلقة والتاريخ أولاً.");
    return;
  }

  const user = window.currentUser;
  const isAdmin = user && user.role === "admin";

  const hifzRating = form.elements["hifz_rating"]?.value || "";
  const murajaaRating = form.elements["murajaa_rating"]?.value || "";
  const tilawaRating = form.elements["tilawa_rating"]?.value || "";

  const fallbackRating = hifzRating || murajaaRating || tilawaRating || "ممتاز";

  const newHifzSurah = form.elements["hifz_surah"]?.value.trim() || "";
  const newMurajaaSurah = form.elements["murajaa_surah"]?.value.trim() || "";
  const newTilawaSurah = form.elements["tilawa_surah"]?.value.trim() || "";

  if (!window.appStore.tasmeea) window.appStore.tasmeea = [];
  const existingIndex = window.appStore.tasmeea.findIndex(
    (t) => t.id === `tasm_${studentId}_${dateVal}`,
  );
  const oldRecord =
    existingIndex > -1 ? window.appStore.tasmeea[existingIndex] : null;
  const previousAdminNotes = oldRecord ? oldRecord.adminNotes || "" : "";

  const carryOrderAt = (oldVal, newVal, oldOrderAt) => {
    if (!newVal) return null;
    if (oldVal && oldOrderAt) return oldOrderAt;
    return Date.now();
  };

  const tasmeeaData = {
    id: `tasm_${studentId}_${dateVal}`,
    studentId: studentId,
    circleId: circleId,
    date: dateVal,
    hifzSurah: newHifzSurah,
    hifzRating: hifzRating,
    hifzOrderAt: carryOrderAt(
      oldRecord?.hifzSurah,
      newHifzSurah,
      oldRecord?.hifzOrderAt,
    ),
    murajaaSurah: newMurajaaSurah,
    murajaaRating: murajaaRating,
    murajaaOrderAt: carryOrderAt(
      oldRecord?.murajaaSurah,
      newMurajaaSurah,
      oldRecord?.murajaaOrderAt,
    ),
    tilawaSurah: newTilawaSurah,
    tilawaRating: tilawaRating,
    tilawaOrderAt: carryOrderAt(
      oldRecord?.tilawaSurah,
      newTilawaSurah,
      oldRecord?.tilawaOrderAt,
    ),
    rating: fallbackRating,
    studentNotes: form.elements["student_notes"]?.value.trim() || "",
    adminNotes: form.elements["admin_notes"]?.value.trim() || "",
    nextHifz: form.elements["next_hifz"]?.value.trim() || "",
    nextMurajaa: form.elements["next_murajaa"]?.value.trim() || "",
    nextTilawa: form.elements["next_tilawa"]?.value.trim() || "",
    updatedBy: isAdmin ? "admin" : "teacher",
    updatedAt: Date.now(),
  };

  if (existingIndex > -1) {
    window.appStore.tasmeea[existingIndex] = tasmeeaData;
  } else {
    window.appStore.tasmeea.push(tasmeeaData);
  }

  if (typeof saveToCloud === "function") {
    saveToCloud("tasmeea", tasmeeaData.id, tasmeeaData);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  if (typeof window.logTeacherActivity === "function") {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === studentId,
    );
    const stuName = student ? student.name : "طالب";
    const actionName = isAdmin ? "تعديل مقرر (إدارة)" : "رصد تسميع";

    window.logTeacherActivity(
      actionName,
      `رصد وتحديث مقرر الطالب (${stuName}) - حفظ: ${tasmeeaData.hifzSurah || "—"} (${tasmeeaData.hifzRating || "—"}) | مراجعة: ${tasmeeaData.murajaaSurah || "—"} | تلاوة: ${tasmeeaData.tilawaSurah || "—"}`,
      user?.name || actionName,
      getCircleNameTasmeea(circleId),
    );
  }

  if (
    tasmeeaData.adminNotes &&
    tasmeeaData.adminNotes !== previousAdminNotes &&
    typeof window.sendAdminPushNotification === "function"
  ) {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === studentId,
    );
    const stuName = student ? student.name : "طالب";
    window.sendAdminPushNotification(
      "📝 ملاحظة معلم جديدة",
      `ملاحظة من المعلم بخصوص الطالب (${stuName}): ${tasmeeaData.adminNotes}`,
    );
  }

  alert("✅ تم حفظ التسميع واعتماد خطة المقررات بنجاح!");
  renderTasmeeaStudents();
}
