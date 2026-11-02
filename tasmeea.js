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

  // إن بقيت الصفحة مفتوحة حتى بعد منتصف الليل: يتقدّم التاريخ وحده لليوم الجديد (فقط إن كان
  // ما زال على "اليوم" الذي فُتحت به الصفحة، وليس تاريخاً اختاره المستخدم بنفسه)
  if (dateSelect) {
    const localToday = () => {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
    };
    let autoDate = dateSelect.value;
    const advanceIfNewDay = () => {
      const today = localToday();
      if (today === autoDate) return;
      if (dateSelect.value === autoDate) {
        dateSelect.value = today;
        if (
          document.getElementById("view-tasmeea")?.classList.contains("active")
        ) {
          renderTasmeeaStudents();
        }
      }
      autoDate = today;
    };
    setInterval(advanceIfNewDay, 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") advanceIfNewDay();
    });
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
    <div style="background: var(--bg-card); border-radius: 12px; padding: 1.5rem; max-width: 340px; width: 90%; text-align: center; box-shadow: 0 8px 30px rgba(0,0,0,0.25);">
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

// حقول كل قسم من أقسام التسميع الثلاثة
window.TASMEEA_SECTION_FIELDS = {
  hifz: {
    surah: "hifzSurah",
    rating: "hifzRating",
    next: "nextHifz",
    order: "hifzOrderAt",
    stopped: "hifzStopped",
    label: "الدرس الجديد",
  },
  murajaa: {
    surah: "murajaaSurah",
    rating: "murajaaRating",
    next: "nextMurajaa",
    order: "murajaaOrderAt",
    stopped: "murajaaStopped",
    label: "المراجعة",
  },
  tilawa: {
    surah: "tilawaSurah",
    rating: "tilawaRating",
    next: "nextTilawa",
    order: "tilawaOrderAt",
    stopped: "tilawaStopped",
    label: "التلاوة",
  },
};

// التوقف: زر "متوقف" يسجّل القسم متوقفاً في ذلك اليوم فقط دون كتابة أي نص في خانة الدرس.
// والنصوص القديمة التي كتبها المعلم يدوياً (مثل "متوقف عن الدرس") تُعامل كتوقف أيضاً، فلا
// تُرحَّل كمقرر ولا تظهر كبداية أو نهاية في التقارير
window.isTasmeeaStopText = function (value) {
  return /(توقف|موقوف)/.test(String(value || ""));
};

window.isTasmeeaSectionStopped = function (record, section) {
  const f = window.TASMEEA_SECTION_FIELDS[section];
  if (!record || !f) return false;
  return record[f.stopped] === true || isTasmeeaStopText(record[f.surah]);
};

// نص القسم للعرض في الجداول والتقارير اليومية: "⏸️ متوقف" للقسم المتوقف، وإلا نص المقرر
window.tasmeeaSectionDisplay = function (record, section, emptyText) {
  const f = window.TASMEEA_SECTION_FIELDS[section];
  if (!record || !f) return emptyText;
  if (isTasmeeaSectionStopped(record, section)) return "⏸️ متوقف";
  return escapeHtml(record[f.surah]) || emptyText;
};

// ترحيل تلقائي لمقرر اليوم: يبقى نفس آخر مقرر معروف ويتكرر يوماً بعد يوم (أيام التوقف
// تُتخطّى فيبقى آخر درس حقيقي هو المقرر)
window.getCarriedForwardLessonValue = function (
  studentId,
  dateVal,
  todayField,
  nextFieldName,
) {
  const allTasm = (window.appStore?.tasmeea || [])
    .filter((t) => t.studentId === studentId)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const usable = (v) => Boolean(v) && !isTasmeeaStopText(v);

  const todayRecord = allTasm.find((t) => t.date === dateVal);
  if (todayRecord && usable(todayRecord[todayField])) {
    return todayRecord[todayField];
  }

  for (const t of allTasm) {
    if (t.date >= dateVal) continue;
    if (usable(t[nextFieldName])) return t[nextFieldName];
    if (usable(t[todayField])) return t[todayField];
  }
  return "";
};

// عرض قائمة طلاب الحلقة مع إتاحة الوصول الكامل للمدير وعزل المعلم
// ==========================================================================
// حفظ حالة الشاشة عند إعادة الرسم: كل إعادة رسم لقائمة الطلاب (بعد انتهاء المزامنة
// السحابية، أو بعد اعتماد قسم، أو بعد تحضير طالب آخر) كانت تستبدل المحتوى كاملاً فتُغلق
// البطاقات المفتوحة وتُمسح كل حقول المعلم المكتوبة التي لم تُعتمد بعد، فيضطر لإعادة
// كتابتها واعتمادها مرة ثانية. هذه الدوال تلتقط الحقول المعدَّلة فعلاً (وليس المحفوظة) مع
// البطاقات المفتوحة والتركيز ثم تعيدها بعد الرسم.
// ==========================================================================
function isFormFieldEdited(el) {
  if (el.tagName === "SELECT") {
    let defaultIdx = [...el.options].findIndex((o) => o.defaultSelected);
    if (defaultIdx < 0) defaultIdx = 0;
    return el.selectedIndex !== defaultIdx;
  }
  return el.value !== el.defaultValue;
}

// بعد حفظ حقول (أو إلغاء اعتمادها) تُعدّ قيمها الحالية "محفوظة" فلا تُستعاد كأنها
// كتابة غير محفوظة عند إعادة الرسم التالية
function markTasmeeaFieldsClean(studentId, names) {
  const details = document.getElementById(`tasmeea-details-${studentId}`);
  if (!details) return;
  details.querySelectorAll("input[name], select[name]").forEach((el) => {
    if (names && !names.includes(el.name)) return;
    if (el.tagName === "SELECT") {
      [...el.options].forEach((o) => {
        o.defaultSelected = o.selected;
      });
    } else {
      el.defaultValue = el.value;
    }
  });
}

function captureTasmeeaUiState(container, renderKey) {
  if (!container || container.dataset.renderKey !== renderKey) return null;
  const state = { open: [], fields: {}, focus: null };
  container.querySelectorAll('[id^="tasmeea-details-"]').forEach((details) => {
    const sid = details.id.replace("tasmeea-details-", "");
    if (details.style.display === "block") state.open.push(sid);
    details.querySelectorAll("input[name], select[name]").forEach((el) => {
      if (isFormFieldEdited(el)) state.fields[`${sid}|${el.name}`] = el.value;
    });
  });
  const active = document.activeElement;
  if (active && active.name && container.contains(active)) {
    const details = active.closest('[id^="tasmeea-details-"]');
    if (details) {
      state.focus = {
        key: `${details.id.replace("tasmeea-details-", "")}|${active.name}`,
        start: active.selectionStart,
        end: active.selectionEnd,
      };
    }
  }
  return state;
}

function restoreTasmeeaUiState(container, state) {
  if (!container || !state) return;
  const findField = (key) => {
    const sep = key.indexOf("|");
    const details = document.getElementById(
      `tasmeea-details-${key.slice(0, sep)}`,
    );
    return details
      ? details.querySelector(`[name="${key.slice(sep + 1)}"]`)
      : null;
  };
  state.open.forEach((sid) => {
    const details = document.getElementById(`tasmeea-details-${sid}`);
    if (details) details.style.display = "block";
    const arrow = document.getElementById(`tasmeea-arrow-${sid}`);
    if (arrow) arrow.textContent = "▲";
  });
  Object.entries(state.fields).forEach(([key, value]) => {
    const el = findField(key);
    if (el) el.value = value;
  });
  if (state.focus) {
    const el = findField(state.focus.key);
    if (el) {
      el.focus({ preventScroll: true });
      try {
        if (state.focus.start !== null && state.focus.start !== undefined)
          el.setSelectionRange(state.focus.start, state.focus.end);
      } catch (e) {}
    }
  }
}

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
    .filter((s) => studentInCircle(s, circleId) && s.status === "active")
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

  const tasmeeaRenderKey = `${circleId}|${dateVal}`;
  const savedUiState = captureTasmeeaUiState(container, tasmeeaRenderKey);
  container.innerHTML = html;
  container.dataset.renderKey = tasmeeaRenderKey;
  restoreTasmeeaUiState(container, savedUiState);

  if (
    !isAdminUser &&
    !allAttendanceTaken &&
    typeof maybeShowTasmeeaAttendanceReminderModal === "function"
  ) {
    maybeShowTasmeeaAttendanceReminderModal();
  }
}

// عنوان العمود الإضافي الفارغ (بين "عدد الصفحات الباقي" و"ملاحظات") في كشف
// المرحليات وتقريره - يسجّله المعلم أو المدير
const KASHF_DETAIL_LABEL = "المرحلية";

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
    .filter((s) => studentInCircle(s, circleId) && s.status === "active")
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
        <td>
          <input
            type="text"
            class="form-control"
            value="${escapeHtml(entry.detail || "")}"
            placeholder="${KASHF_DETAIL_LABEL}"
            onchange="saveKashfField('${student.id}', '${circleId}', 'detail', this.value)"
          />
        </td>
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

  // حقول الكشف تُحفظ عند مغادرة الحقل (onchange): إعادة الرسم بعد المزامنة أثناء الكتابة
  // كانت تمسح ما يُكتب ولم يُحفظ بعد؛ يُحفظ الحقل المفتوح حالياً (قيمته ومكان المؤشر) فقط
  const kashfRenderKey = `${circleId}`;
  let kashfFocus = null;
  if (container.dataset.renderKey === kashfRenderKey) {
    const oldFields = [...container.querySelectorAll("input, select")];
    const idx = oldFields.indexOf(document.activeElement);
    if (idx >= 0) {
      kashfFocus = {
        idx,
        count: oldFields.length,
        value: oldFields[idx].value,
        start: oldFields[idx].selectionStart,
        end: oldFields[idx].selectionEnd,
      };
    }
  }

  container.innerHTML = `
    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px;">م</th>
              <th>اسم الطالب</th>
              <th>${KASHF_DETAIL_LABEL}</th>
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
  container.dataset.renderKey = kashfRenderKey;

  if (kashfFocus) {
    const newFields = [...container.querySelectorAll("input, select")];
    const target = newFields[kashfFocus.idx];
    if (target && newFields.length === kashfFocus.count) {
      target.value = kashfFocus.value;
      target.focus({ preventScroll: true });
      try {
        if (kashfFocus.start !== null && kashfFocus.start !== undefined)
          target.setSelectionRange(kashfFocus.start, kashfFocus.end);
      } catch (e) {}
    }
  }
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
    detail: existing.detail || "",
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
  } else if (field === "detail") {
    entry.detail = value;
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

  const buildRatingSelect = (currentVal, name, extraAttr = "") => {
    let opts = '<option value="">— التقدير —</option>';
    ratings.forEach((r) => {
      const selected = currentVal === r ? "selected" : "";
      opts += `<option value="${r}" ${selected}>${r}</option>`;
    });
    return `<select class="form-control" name="${name}" style="font-weight: 700; background: var(--bg-card);" ${extraAttr}>${opts}</select>`;
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

  // زر "متوقف" بجانب زر الاعتماد لكل قسم. القسم المتوقف في هذا اليوم: خاناته معطّلة وتعرض
  // آخر مقرر للعلم فقط، ولا يلغي التوقف إلا المدير
  const isStoppedToday = (section) =>
    record[window.TASMEEA_SECTION_FIELDS[section].stopped] === true;
  const stopDis = (section) => (isStoppedToday(section) ? "disabled" : "");
  const stoppedBanner = (section, carried) =>
    isStoppedToday(section)
      ? `<div style="background:#fff3e0; border:1px solid #ef6c00; color:#e65100; border-radius:6px; padding:6px 8px; font-weight:800; font-size:0.82rem; margin-bottom:0.5rem;">⏸️ متوقف في هذا اليوم${carried ? ` — آخر مقرر: ${escapeHtml(carried)}` : ""}</div>`
      : "";
  const sectionButtons = (section, approveLabel) => {
    if (isStoppedToday(section)) {
      return isAdmin
        ? `<button type="button" class="btn btn-danger btn-sm" style="width: 100%;" onclick="cancelTasmeeaStop('${student.id}', '${section}')">↩️ إلغاء التوقف</button>`
        : `<div class="text-muted" style="font-size:0.78rem; text-align:center;">إلغاء التوقف متاح للمدير فقط</div>`;
    }
    return `
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="btn btn-success btn-sm" style="flex: 1 1 140px;" onclick="saveTasmeeaSection('${student.id}', '${section}')">${approveLabel}</button>
                <button type="button" class="btn btn-sm" style="flex: 0 0 auto; background:#ef6c00; color:#fff; font-weight:800;" onclick="stopTasmeeaSection('${student.id}', '${section}')">⏸️ متوقف</button>
              </div>
              ${isAdmin ? `<button type="button" class="btn btn-danger btn-sm mt-1" style="width: 100%;" onclick="cancelTasmeeaSection('${student.id}', '${section}')">↩️ إلغاء الاعتماد</button>` : ""}`;
  };

  // المعلم: ثلاث حالات فقط (غير محدد/حاضر/غائب)، ولا يقدر يعدّل حالة سبق تسجيلها
  // (القائمة تُقفَل بعدها). المدير: كل الحالات الأربع دائماً وقابلة للتعديل دوماً
  const isLockedForTeacher = !isAdmin && currentAtt !== "";
  let quickAttOptions;
  if (isAdmin) {
    quickAttOptions = `
    <option value="" ${currentAtt === "" ? "selected" : ""}>— غير محدد —</option>
    <option value="present" ${currentAtt === "present" ? "selected" : ""}>🟢 حاضر</option>
    <option value="late" ${currentAtt === "late" ? "selected" : ""}>🟡 متأخر</option>
    <option value="absent" ${currentAtt === "absent" ? "selected" : ""}>🔴 غائب</option>
    <option value="excused" ${currentAtt === "excused" ? "selected" : ""}>🔵 مستأذن</option>
  `;
  } else {
    quickAttOptions = `
    <option value="" ${currentAtt === "" ? "selected" : ""}>— غير محدد —</option>
    <option value="present" ${currentAtt === "present" ? "selected" : ""}>🟢 حاضر</option>
    <option value="absent" ${currentAtt === "absent" ? "selected" : ""}>🔴 غائب</option>
  `;
    // المعلم مقيَّد باختيار 3 حالات فقط، لكن لو كانت الحالة الفعلية محدَّدة من
    // المدير بقيمة خارج هذه الثلاث (متأخر/مستأذن) يجب أن تظهر له كما هي فعلاً
    if (currentAtt === "late") {
      quickAttOptions += `<option value="late" selected>🟡 متأخر</option>`;
    } else if (currentAtt === "excused") {
      quickAttOptions += `<option value="excused" selected>🔵 مستأذن</option>`;
    }
  }

  return `
    <div class="card mb-3" style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;" id="tasmeea-card-${student.id}">
      
      <!-- شريط الطالب الرئيسي -->
      <div class="card-header flex-between p-3" style="background: var(--bg-soft-panel); cursor: pointer;" onclick="toggleTasmeeaAccordion('${student.id}')">
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
              ${!isAdmin && typeof adminEditBadgeHtml === "function" ? adminEditBadgeHtml(attRecord, "الحضور") + adminEditBadgeHtml(record, "التسميع") : ""}
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
      <div id="tasmeea-details-${student.id}" style="display: none; padding: 1.25rem; border-top: 1px solid var(--border-color); background: var(--bg-card);">
        <form onsubmit="saveStudentTasmeea(event, '${student.id}')">
          <div class="tasmeea-sections-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            
            <!-- 1. الدرس الجديد -->
            <div class="tasmeea-section-box p-3" style="background: var(--bg-soft-panel); border: 1px solid var(--border-color); border-radius: 8px;">
              <h4 style="font-weight: 800; color: var(--primary-brown); margin-bottom: 0.6rem;">📖 الدرس الجديد</h4>
              ${stoppedBanner("hifz", initialHifz)}
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">مقرر اليوم</label>
                <input type="text" class="form-control" name="hifz_surah" value="${escapeHtml(initialHifz)}" ${stopDis("hifz")} placeholder="مثال: البقرة (1-15)">
              </div>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">التقدير</label>
                ${buildRatingSelect(record.hifzRating, "hifz_rating", stopDis("hifz"))}
              </div>
              <div class="form-group mb-2" style="border-top: 2px dashed #ef6c00; background: linear-gradient(135deg, #fff3e0 0%, #ffebee 100%); border-radius: 6px; padding: 0.5rem 0.6rem; margin-top: 0.5rem;">
                <label style="font-size: 0.82rem; color: #d84315; font-weight: 800;">📌 مقرر الغد</label>
                <input type="text" class="form-control" name="next_hifz" value="${escapeHtml(record.nextHifz)}" ${stopDis("hifz")} placeholder="مثال: سورة البقرة (16-30)">
              </div>
              ${sectionButtons("hifz", "✅ اعتماد الدرس الجديد (اليوم والغد)")}
            </div>

            <!-- 2. المراجعة -->
            <div class="tasmeea-section-box p-3" style="background: var(--bg-soft-panel); border: 1px solid var(--border-color); border-radius: 8px;">
              <h4 style="font-weight: 800; color: var(--primary-brown); margin-bottom: 0.6rem;">🔄 المراجعة</h4>
              ${stoppedBanner("murajaa", initialMurajaa)}
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">مقرر اليوم</label>
                <input type="text" class="form-control" name="murajaa_surah" value="${escapeHtml(initialMurajaa)}" ${stopDis("murajaa")} placeholder="مثال: سورة يس كاملة">
              </div>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">التقدير</label>
                ${buildRatingSelect(record.murajaaRating, "murajaa_rating", stopDis("murajaa"))}
              </div>
              <div class="form-group mb-2" style="border-top: 2px dashed #ef6c00; background: linear-gradient(135deg, #fff3e0 0%, #ffebee 100%); border-radius: 6px; padding: 0.5rem 0.6rem; margin-top: 0.5rem;">
                <label style="font-size: 0.82rem; color: #d84315; font-weight: 800;">📌 مقرر الغد</label>
                <input type="text" class="form-control" name="next_murajaa" value="${escapeHtml(record.nextMurajaa)}" ${stopDis("murajaa")} placeholder="مثال: سورة الكهف كاملة">
              </div>
              ${sectionButtons("murajaa", "✅ اعتماد المراجعة (اليوم والغد)")}
            </div>

            <!-- 3. التلاوة -->
            <div class="tasmeea-section-box p-3" style="background: var(--bg-soft-panel); border: 1px solid var(--border-color); border-radius: 8px;">
              <h4 style="font-weight: 800; color: var(--primary-brown); margin-bottom: 0.6rem;">🎧 التلاوة</h4>
              ${stoppedBanner("tilawa", initialTilawa)}
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">مقرر اليوم</label>
                <input type="text" class="form-control" name="tilawa_surah" value="${escapeHtml(initialTilawa)}" ${stopDis("tilawa")} placeholder="مثال: آل عمران (1-20)">
              </div>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">التقدير</label>
                ${buildRatingSelect(record.tilawaRating, "tilawa_rating", stopDis("tilawa"))}
              </div>
              <div class="form-group mb-2" style="border-top: 2px dashed #ef6c00; background: linear-gradient(135deg, #fff3e0 0%, #ffebee 100%); border-radius: 6px; padding: 0.5rem 0.6rem; margin-top: 0.5rem;">
                <label style="font-size: 0.82rem; color: #d84315; font-weight: 800;">📌 مقرر الغد</label>
                <input type="text" class="form-control" name="next_tilawa" value="${escapeHtml(record.nextTilawa)}" ${stopDis("tilawa")} placeholder="مثال: سورة النساء (1-10)">
              </div>
              ${sectionButtons("tilawa", "✅ اعتماد التلاوة (اليوم والغد)")}
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

  // فتح طالب يُغلق شريط الطالب المفتوح قبله (ما كُتب فيه يبقى محفوظاً في مكانه ولا يُمسح)
  if (isHidden) {
    document
      .querySelectorAll('#tasmeea-students-container [id^="tasmeea-details-"]')
      .forEach((other) => {
        if (other === details || other.style.display !== "block") return;
        other.style.display = "none";
        const otherArrow = document.getElementById(
          other.id.replace("tasmeea-details-", "tasmeea-arrow-"),
        );
        if (otherArrow) otherArrow.textContent = "▼";
      });
  }

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
  const stoppedRecord = window.appStore.tasmeea.find((t) => t.id === recordId);
  const stopField = window.TASMEEA_SECTION_FIELDS[section].stopped;
  if (stoppedRecord && stoppedRecord[stopField] === true) {
    // القسم مسجّل "متوقف" اليوم: إلغاء التوقف للمدير فقط
    if (!isAdmin) {
      alert(
        `⚠️ (${cfg.label}) مسجّل متوقف في هذا اليوم، وإلغاء التوقف متاح للمدير فقط.`,
      );
      return;
    }
    if (
      !confirm(
        `(${cfg.label}) مسجّل متوقف في هذا اليوم.\nهل تريد إلغاء التوقف واعتماد المقرر؟`,
      )
    )
      return;
    stoppedRecord[stopField] = false;
  }

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

  markTasmeeaFieldsClean(studentId, [
    cfg.surahField,
    cfg.ratingField,
    cfg.nextField,
  ]);
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

  markTasmeeaFieldsClean(studentId, [
    `${section}_surah`,
    `${section}_rating`,
    `next_${section}`,
  ]);
  alert(`↩️ تم إلغاء اعتماد (${cfg.label}) بنجاح.`);
  renderTasmeeaStudents();
}

// زر "متوقف" لقسم واحد في هذا اليوم فقط (المعلم أو المدير): لا يُكتب أي نص في خانة الدرس،
// فيبقى آخر درس حقيقي هو المقرر ويُرحَّل كما هو، ولا يظهر التوقف في تقرير البداية والنهاية،
// ويظهر لولي الأمر "متوقف" مع آخر مقرر. لا يمنع التميز. إلغاؤه للمدير فقط
function stopTasmeeaSection(studentId, section) {
  const dateVal = document.getElementById("tasmeea-date-select")?.value;
  const circleId = document.getElementById("tasmeea-circle-select")?.value;
  if (!dateVal || !circleId) {
    alert("⚠️ يرجى التأكد من اختيار الحلقة والتاريخ أولاً.");
    return;
  }
  const cfg = window.TASMEEA_SECTION_FIELDS[section];
  if (!cfg) return;

  const user = window.currentUser;
  const isAdmin = user && user.role === "admin";
  const recordId = `tasm_${studentId}_${dateVal}`;
  if (!window.appStore.tasmeea) window.appStore.tasmeea = [];
  let record = window.appStore.tasmeea.find((t) => t.id === recordId);

  if (record && record[cfg.stopped] === true) {
    alert(`ℹ️ (${cfg.label}) مسجّل متوقف في هذا اليوم مسبقاً.`);
    return;
  }

  const hasApproval =
    record &&
    ((record[cfg.surah] && !isTasmeeaStopText(record[cfg.surah])) ||
      record[cfg.rating] ||
      record[cfg.next]);
  if (hasApproval) {
    // المعلم لا يلغي اعتماداً سابقاً (إلغاء الاعتماد للمدير فقط)
    if (!isAdmin) {
      alert(
        `⚠️ (${cfg.label}) معتمد في هذا اليوم، ولا يمكن تحويله إلى متوقف إلا من المدير.`,
      );
      return;
    }
    if (
      !confirm(
        `(${cfg.label}) معتمد في هذا اليوم.\nتسجيله متوقفاً يلغي اعتماد اليوم لهذا القسم. متابعة؟`,
      )
    )
      return;
  } else if (
    !confirm(`تسجيل (${cfg.label}) متوقفاً لهذا الطالب في هذا اليوم؟`)
  ) {
    return;
  }

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

  record[cfg.surah] = "";
  record[cfg.rating] = "";
  record[cfg.next] = "";
  record[cfg.order] = null;
  record[cfg.stopped] = true;
  record.rating =
    record.hifzRating || record.murajaaRating || record.tilawaRating || "";
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
      `توقف ${cfg.label}`,
      `تم تسجيل (${cfg.label}) متوقفاً للطالب (${stuName}) بواسطة (${actorTitle})`,
      user?.name || actorTitle,
      getCircleNameTasmeea(circleId),
    );
  }

  markTasmeeaFieldsClean(studentId, [
    `${section}_surah`,
    `${section}_rating`,
    `next_${section}`,
  ]);
  alert(`⏸️ تم تسجيل (${cfg.label}) متوقفاً لهذا اليوم.`);
  renderTasmeeaStudents();
}

// إلغاء التوقف (للمدير فقط)
function cancelTasmeeaStop(studentId, section) {
  const user = window.currentUser;
  if (!user || user.role !== "admin") {
    alert("⚠️ إلغاء التوقف متاح للمدير فقط.");
    return;
  }
  const dateVal = document.getElementById("tasmeea-date-select")?.value;
  const circleId = document.getElementById("tasmeea-circle-select")?.value;
  if (!dateVal || !circleId) return;
  const cfg = window.TASMEEA_SECTION_FIELDS[section];
  if (!cfg) return;

  const record = (window.appStore.tasmeea || []).find(
    (t) => t.id === `tasm_${studentId}_${dateVal}`,
  );
  if (!record || record[cfg.stopped] !== true) {
    alert("⚠️ هذا القسم غير مسجّل متوقفاً في هذا اليوم.");
    return;
  }
  if (!confirm(`هل أنت متأكد من إلغاء توقف (${cfg.label}) لهذا الطالب؟`))
    return;

  record[cfg.stopped] = false;
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
    window.logTeacherActivity(
      `إلغاء توقف ${cfg.label}`,
      `تم إلغاء توقف (${cfg.label}) للطالب (${student ? student.name : "طالب"}) بواسطة (المدير)`,
      user?.name || "المدير",
      getCircleNameTasmeea(circleId),
    );
  }
  alert(`↩️ تم إلغاء توقف (${cfg.label}).`);
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

  // القسم المسجّل "متوقف" في هذا اليوم يبقى متوقفاً كما هو (خاناته معطّلة في الشاشة وتعرض
  // آخر مقرر للعلم فقط)، فلا يُحفظ ذلك المقرر كاعتماد جديد لهذا اليوم
  Object.keys(window.TASMEEA_SECTION_FIELDS).forEach((section) => {
    const f = window.TASMEEA_SECTION_FIELDS[section];
    if (oldRecord && oldRecord[f.stopped] === true) {
      tasmeeaData[f.surah] = "";
      tasmeeaData[f.rating] = "";
      tasmeeaData[f.next] = "";
      tasmeeaData[f.order] = null;
      tasmeeaData[f.stopped] = true;
    }
  });
  tasmeeaData.rating =
    tasmeeaData.hifzRating ||
    tasmeeaData.murajaaRating ||
    tasmeeaData.tilawaRating ||
    (Object.keys(window.TASMEEA_SECTION_FIELDS).some(
      (s) => tasmeeaData[window.TASMEEA_SECTION_FIELDS[s].stopped],
    )
      ? ""
      : fallbackRating);

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

  markTasmeeaFieldsClean(studentId);
  alert("✅ تم حفظ التسميع واعتماد خطة المقررات بنجاح!");
  renderTasmeeaStudents();
}
