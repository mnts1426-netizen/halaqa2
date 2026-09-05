/**
 * ==========================================================================
 * tasmeea.js - محرك التسميع اليومي، إتاحة التسميع للمدير، وتوثيق عمليات المعلمين
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
    dateSelect.value = new Date().toISOString().split("T")[0];
  }

  if (circleSelect) {
    circleSelect.addEventListener("change", renderTasmeeaStudents);
  }
  if (dateSelect) {
    dateSelect.addEventListener("change", renderTasmeeaStudents);
  }
});

function isOfficialWorkdayTasmeea(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day >= 0 && day <= 3;
}

function getCircleNameTasmeea(circleId) {
  const c = (window.appStore?.circles || []).find((x) => x.id === circleId);
  return c ? c.name : "—";
}

// عرض قائمة طلاب الحلقة مع إتاحة الوصول الكامل للمدير وعزل المعلم
function renderTasmeeaStudents() {
  const circleId = document.getElementById("tasmeea-circle-select")?.value;
  const dateVal = document.getElementById("tasmeea-date-select")?.value;
  const container = document.getElementById("tasmeea-students-container");

  if (!container) return;

  const user = window.currentUser;
  const isAdmin = user && user.role === "admin";
  const isTeacher = user && user.role === "teacher";

  // التحقق الأمني: المعلم يُقيد بحلقاته فقط، بينما يُتاح للمدير فحص أي حلقة
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

  const circleStudents = (window.appStore.students || []).filter(
    (s) => s.circleId === circleId && s.status === "active",
  );

  if (circleStudents.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <h3>لا يوجد طلاب في هذه الحلقة</h3>
        <p class="text-muted">يمكنك إضافة طلاب للحلقة من شاشة إدارة المَجْمَع</p>
      </div>
    `;
    return;
  }

  let html = "";
  circleStudents.forEach((student, index) => {
    const existingRecord =
      (window.appStore.tasmeea || []).find(
        (t) => t.studentId === student.id && t.date === dateVal,
      ) || {};

    const previousPlanRecord =
      (window.appStore.tasmeea || [])
        .filter(
          (t) =>
            t.studentId === student.id &&
            t.date < dateVal &&
            (t.nextHifz || t.nextMurajaa || t.nextTilawa),
        )
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0] || {};

    const attRecord =
      (window.appStore.attendance || []).find(
        (a) => a.studentId === student.id && a.date === dateVal,
      ) || {};

    html += buildStudentAccordionCard(
      student,
      existingRecord,
      previousPlanRecord,
      attRecord,
      index + 1,
      dateVal,
    );
  });

  container.innerHTML = html;
}

function buildStudentAccordionCard(
  student,
  record,
  previousPlanRecord,
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
  const isTeacher = user && user.role === "teacher";
  const isAdmin = user && user.role === "admin";
  const isWorkday = isOfficialWorkdayTasmeea(currentDateVal);

  let currentAtt = attRecord.status || "";
  if (!currentAtt && isWorkday) {
    currentAtt = "absent";
  }

  const initialHifz = record.hifzSurah || previousPlanRecord.nextHifz || "";
  const initialMurajaa =
    record.murajaaSurah || previousPlanRecord.nextMurajaa || "";
  const initialTilawa =
    record.tilawaSurah || previousPlanRecord.nextTilawa || "";

  let quickAttOptions = "";
  if (isTeacher) {
    quickAttOptions = `
      <option value="" ${currentAtt === "" ? "selected" : ""}>— غير محدد —</option>
      <option value="present" ${currentAtt === "present" ? "selected" : ""}>🟢 حاضر</option>
      <option value="late" ${currentAtt === "late" ? "selected" : ""}>🟡 متأخر</option>
      ${currentAtt === "absent" ? '<option value="absent" selected disabled>🔴 غائب (تلقائي)</option>' : ""}
      ${currentAtt === "excused" ? '<option value="excused" selected disabled>🔵 مستأذن (إدارة)</option>' : ""}
    `;
  } else {
    quickAttOptions = `
      <option value="" ${currentAtt === "" ? "selected" : ""}>— غير محدد —</option>
      <option value="present" ${currentAtt === "present" ? "selected" : ""}>🟢 حاضر</option>
      <option value="absent" ${currentAtt === "absent" ? "selected" : ""}>🔴 غائب</option>
      <option value="late" ${currentAtt === "late" ? "selected" : ""}>🟡 متأخر</option>
      <option value="excused" ${currentAtt === "excused" ? "selected" : ""}>🔵 مستأذن</option>
    `;
  }

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
              ${student.name}
            </h3>
            <small class="text-muted">
              ${isSaved ? '<span style="color:#2e7d32; font-weight:700;">🟢 تم رصد التسميع</span>' : "⚪ لم يُرصد التسميع بعد"}
              ${isAdmin ? '<span class="badge" style="background:#805333; color:#fff; margin-right:4px; font-size:0.72rem;">تعديل المدير</span>' : ""}
            </small>
          </div>
        </div>

        <div class="flex-align-gap" onclick="event.stopPropagation();">
          <select class="form-control" style="width: auto; min-width: 135px; font-weight: 700;" onchange="saveQuickAttendance('${student.id}', this.value)">
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
            
            <!-- 1. الحفظ الجديد -->
            <div class="tasmeea-section-box p-3" style="background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px;">
              <h4 style="font-weight: 800; color: var(--primary-brown); margin-bottom: 0.6rem;">📖 الحفظ الجديد</h4>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">المقرر الحالي</label>
                <input type="text" class="form-control" name="hifz_surah" value="${initialHifz}" placeholder="مثال: البقرة (1-15)">
              </div>
              <div class="form-group mb-0">
                <label style="font-size: 0.82rem;">التقدير</label>
                ${buildRatingSelect(record.hifzRating, "hifz_rating")}
              </div>
            </div>

            <!-- 2. المراجعة -->
            <div class="tasmeea-section-box p-3" style="background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px;">
              <h4 style="font-weight: 800; color: var(--primary-brown); margin-bottom: 0.6rem;">🔄 المراجعة</h4>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">المقرر الحالي</label>
                <input type="text" class="form-control" name="murajaa_surah" value="${initialMurajaa}" placeholder="مثال: سورة يس كاملة">
              </div>
              <div class="form-group mb-0">
                <label style="font-size: 0.82rem;">التقدير</label>
                ${buildRatingSelect(record.murajaaRating, "murajaa_rating")}
              </div>
            </div>

            <!-- 3. التلاوة -->
            <div class="tasmeea-section-box p-3" style="background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px;">
              <h4 style="font-weight: 800; color: var(--primary-brown); margin-bottom: 0.6rem;">🎧 التلاوة</h4>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">المقرر الحالي</label>
                <input type="text" class="form-control" name="tilawa_surah" value="${initialTilawa}" placeholder="مثال: آل عمران (1-20)">
              </div>
              <div class="form-group mb-0">
                <label style="font-size: 0.82rem;">التقدير</label>
                ${buildRatingSelect(record.tilawaRating, "tilawa_rating")}
              </div>
            </div>

          </div>

          <!-- الملاحظات -->
          <div class="form-row mt-3">
            <div class="form-group flex-1">
              <label style="font-size: 0.85rem; font-weight: 700;">💬 توجيه وملاحظة للطالب وولي الأمر:</label>
              <input type="text" class="form-control" name="student_notes" value="${record.studentNotes || ""}" placeholder="أحسنت الترتيل، يُرجى التركيز على الغنة...">
            </div>
            <div class="form-group flex-1">
              <label style="font-size: 0.85rem; font-weight: 700; color: var(--primary-brown);">📝 ملاحظة موجهة للإدارة:</label>
              <input type="text" class="form-control" name="admin_notes" value="${record.adminNotes || ""}" placeholder="اكتب ملاحظة خاصة موجهة للمدير بخصوص الطالب...">
            </div>
          </div>

          <!-- خطة درس الغد -->
          <div class="mt-3 p-3" style="background: #f7f1eb; border: 1px dashed var(--primary-brown); border-radius: 8px;">
            <h4 style="color: var(--primary-brown); font-weight: 800; font-size: 0.95rem; margin-bottom: 0.6rem;">
              📌 تحديد وتعديل خطة درس الغد (المقرر المطلوب لليوم التالي)
            </h4>
            <div class="form-row">
              <div class="form-group flex-1">
                <label style="font-size: 0.8rem; font-weight: 700;">حفظ الغد</label>
                <input type="text" class="form-control" name="next_hifz" value="${record.nextHifz || ""}" placeholder="مثال: سورة البقرة (16-30)">
              </div>
              <div class="form-group flex-1">
                <label style="font-size: 0.8rem; font-weight: 700;">مراجعة الغد</label>
                <input type="text" class="form-control" name="next_murajaa" value="${record.nextMurajaa || ""}" placeholder="مثال: سورة الكهف كاملة">
              </div>
              <div class="form-group flex-1">
                <label style="font-size: 0.8rem; font-weight: 700;">تلاوة الغد</label>
                <input type="text" class="form-control" name="next_tilawa" value="${record.nextTilawa || ""}" placeholder="مثال: سورة النساء (1-10)">
              </div>
            </div>
          </div>

          <!-- زر الحفظ والاعتماد -->
          <div class="mt-3 text-left" style="display: flex; justify-content: flex-end;">
            <button type="submit" class="btn btn-primary">💾 حفظ واعتماد المقررات والتسميع</button>
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

// التحضير السريع مع توثيق العملية في سجل المعلم
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

  if (isTeacher && status !== "present" && status !== "late" && status !== "") {
    alert(
      "⚠️ غير مصرح للمعلم باختيار هذه الحالة. التعديلات محصورة بإدارة المَجْمَع.",
    );
    renderTasmeeaStudents();
    return;
  }

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

  // توثيق حركة التحضير في سجل العمليات
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
      user.name,
      getCircleNameTasmeea(circleId),
    );
  }
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

  const tasmeeaData = {
    id: `tasm_${studentId}_${dateVal}`,
    studentId: studentId,
    circleId: circleId,
    date: dateVal,
    hifzSurah: form.elements["hifz_surah"]?.value.trim() || "",
    hifzRating: hifzRating,
    murajaaSurah: form.elements["murajaa_surah"]?.value.trim() || "",
    murajaaRating: murajaaRating,
    tilawaSurah: form.elements["tilawa_surah"]?.value.trim() || "",
    tilawaRating: tilawaRating,
    rating: fallbackRating,
    studentNotes: form.elements["student_notes"]?.value.trim() || "",
    adminNotes: form.elements["admin_notes"]?.value.trim() || "",
    nextHifz: form.elements["next_hifz"]?.value.trim() || "",
    nextMurajaa: form.elements["next_murajaa"]?.value.trim() || "",
    nextTilawa: form.elements["next_tilawa"]?.value.trim() || "",
    updatedBy: isAdmin ? "admin" : "teacher",
    updatedAt: Date.now(),
  };

  if (!window.appStore.tasmeea) window.appStore.tasmeea = [];
  const existingIndex = window.appStore.tasmeea.findIndex(
    (t) => t.id === tasmeeaData.id,
  );
  const previousAdminNotes =
    existingIndex > -1
      ? window.appStore.tasmeea[existingIndex].adminNotes || ""
      : "";

  if (existingIndex > -1) {
    window.appStore.tasmeea[existingIndex] = tasmeeaData;
  } else {
    window.appStore.tasmeea.push(tasmeeaData);
  }

  if (typeof saveToCloud === "function") {
    saveToCloud("tasmeea", tasmeeaData.id, tasmeeaData);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  // توثيق حركة رصد/تعديل المقرر والتسميع
  if (typeof window.logTeacherActivity === "function") {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === studentId,
    );
    const stuName = student ? student.name : "طالب";
    const actionName = isAdmin ? "تعديل مقرر (إدارة)" : "رصد تسميع";

    window.logTeacherActivity(
      actionName,
      `رصد وتحديث مقرر الطالب (${stuName}) - حفظ: ${tasmeeaData.hifzSurah || "—"} (${tasmeeaData.hifzRating || "—"}) | مراجعة: ${tasmeeaData.murajaaSurah || "—"} | تلاوة: ${tasmeeaData.tilawaSurah || "—"}`,
      user.name,
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
