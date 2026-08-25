/**
 * ==========================================================================
 * tasmeea.js - محرك التسميع اليومي الذكي وقائمة الطلاب المنسدلة والتحضير السريع
 * ==========================================================================
 */

window.appStore = window.appStore || {
  students: [],
  teachers: [],
  circles: [],
  tasmeea: [],
  attendance: [],
};

// تهيئة شاشة التسميع عند تغيير الحلقة أو التاريخ
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

// عرض قائمة طلاب الحلقة مع التحضير السريع وإمكانية فتح بطاقة التسميع بالنقر
function renderTasmeeaStudents() {
  const circleId = document.getElementById("tasmeea-circle-select")?.value;
  const dateVal = document.getElementById("tasmeea-date-select")?.value;
  const container = document.getElementById("tasmeea-students-container");

  if (!container) return;

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
        <p class="text-muted">يمكنك إضافة طلاب للحلقة من شاشة الطلاب</p>
      </div>
    `;
    return;
  }

  let html = "";
  circleStudents.forEach((student, index) => {
    // 1. سجل تسميع اليوم
    const existingRecord =
      (window.appStore.tasmeea || []).find(
        (t) => t.studentId === student.id && t.date === dateVal,
      ) || {};

    // 2. آخر خطة مسجلة قبل اليوم للترحيل التلقائي القابل للتعديل
    const previousRecord =
      (window.appStore.tasmeea || [])
        .filter((t) => t.studentId === student.id && t.date < dateVal)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0] || {};

    // 3. سجل حضور اليوم للتحضير السريع
    const attRecord =
      (window.appStore.attendance || []).find(
        (a) => a.studentId === student.id && a.date === dateVal,
      ) || {};

    html += buildStudentAccordionCard(
      student,
      existingRecord,
      previousRecord,
      attRecord,
      index + 1,
    );
  });

  container.innerHTML = html;
}

// بناء بطاقة الطالب المنسدلة
function buildStudentAccordionCard(
  student,
  record,
  previousRecord,
  attRecord,
  index,
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
  const currentAtt = attRecord.status || "";

  // ترحيل خطة الأمس كمقرر لليوم مع إمكانية التعديل
  const initialHifz = record.hifzSurah || previousRecord.nextHifz || "";
  const initialMurajaa =
    record.murajaaSurah || previousRecord.nextMurajaa || "";
  const initialTilawa = record.tilawaSurah || previousRecord.nextTilawa || "";

  return `
    <div class="card mb-3" style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;" id="tasmeea-card-${student.id}">
      
      <!-- شريط الطالب الرئيسي: الاسم + قائمة التحضير المنسدلة -->
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
            </small>
          </div>
        </div>

        <div class="flex-align-gap" onclick="event.stopPropagation();">
          <!-- قائمة التحضير المنسدلة -->
          <select class="form-control" style="width: auto; min-width: 125px; font-weight: 700;" onchange="saveQuickAttendance('${student.id}', this.value)">
            <option value="" ${currentAtt === "" ? "selected" : ""}>— التحضير —</option>
            <option value="present" ${currentAtt === "present" ? "selected" : ""}>🟢 حاضر</option>
            <option value="absent" ${currentAtt === "absent" ? "selected" : ""}>🔴 غائب</option>
            <option value="late" ${currentAtt === "late" ? "selected" : ""}>🟡 متأخر</option>
            <option value="excused" ${currentAtt === "excused" ? "selected" : ""}>🔵 مستأذن</option>
          </select>

          <span id="tasmeea-arrow-${student.id}" style="font-size: 0.9rem; color: var(--primary-brown); margin-right: 0.5rem; transition: transform 0.2s;">
            ▼
          </span>
        </div>
      </div>

      <!-- الصفحة المنسدلة لتفاصيل التسميع -->
      <div id="tasmeea-details-${student.id}" style="display: none; padding: 1.25rem; border-top: 1px solid var(--border-color); background: #ffffff;">
        <form onsubmit="saveStudentTasmeea(event, '${student.id}')">
          <div class="tasmeea-sections-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            
            <!-- 1. الحفظ الجديد -->
            <div class="tasmeea-section-box p-3" style="background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px;">
              <h4 style="font-weight: 800; color: var(--primary-brown); margin-bottom: 0.6rem;">📖 الحفظ الجديد</h4>
              <div class="form-group mb-2">
                <label style="font-size: 0.82rem;">المقرر</label>
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
                <label style="font-size: 0.82rem;">المقرر</label>
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
                <label style="font-size: 0.82rem;">المقرر</label>
                <input type="text" class="form-control" name="tilawa_surah" value="${initialTilawa}" placeholder="مثال: آل عمران (1-20)">
              </div>
              <div class="form-group mb-0">
                <label style="font-size: 0.82rem;">التقدير</label>
                ${buildRatingSelect(record.tilawaRating, "tilawa_rating")}
              </div>
            </div>

          </div>

          <!-- الملاحظات: خانة للطالب وخانة للمدير -->
          <div class="form-row mt-3">
            <div class="form-group flex-1">
              <label style="font-size: 0.85rem; font-weight: 700;">💬 ملاحظة المعلم للطالب وولي الأمر:</label>
              <input type="text" class="form-control" name="student_notes" value="${record.studentNotes || ""}" placeholder="أحسنت الترتيل، يُرجى التركيز على الغنة...">
            </div>
            <div class="form-group flex-1">
              <label style="font-size: 0.85rem; font-weight: 700; color: var(--primary-brown);">📝 ملاحظة المعلم للمدير / الإدارة:</label>
              <input type="text" class="form-control" name="admin_notes" value="${record.adminNotes || ""}" placeholder="اكتب ملاحظة خاصة موجهة للمدير بخصوص الطالب...">
            </div>
          </div>

          <!-- تحديد خطة درس الغد -->
          <div class="mt-3 p-3" style="background: #f7f1eb; border: 1px dashed var(--primary-brown); border-radius: 8px;">
            <h4 style="color: var(--primary-brown); font-weight: 800; font-size: 0.95rem; margin-bottom: 0.6rem;">
              📌 تحديد خطة درس الغد (تُرحَّل تلقائياً كتسميع اليوم القادم)
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

          <!-- زر الحفظ -->
          <div class="mt-3 text-left" style="display: flex; justify-content: flex-end;">
            <button type="submit" class="btn btn-primary">💾 حفظ واعتماد التسميع وخطة الغد</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// دالة فتح وإغلاق بطاقة التسميع المنسدلة للطالب
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

// حفظ التحضير الفوري المباشر من شريط الطالب
function saveQuickAttendance(studentId, status) {
  const dateVal = document.getElementById("tasmeea-date-select")?.value;
  const circleId = document.getElementById("tasmeea-circle-select")?.value;

  if (!dateVal) {
    alert("⚠️ يرجى تحديد التاريخ أولاً");
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
      notes: "",
    };
    window.appStore.attendance.push(record);
  } else {
    record.status = status;
    if (circleId) record.circleId = circleId;
  }

  if (typeof saveToCloud === "function") {
    saveToCloud("attendance", record.id, record);
  }
}

// حفظ بيانات التسميع اليومي وخطة الغد والملاحظات
function saveStudentTasmeea(e, studentId) {
  e.preventDefault();
  const form = e.target;
  const dateVal = document.getElementById("tasmeea-date-select")?.value;
  const circleId = document.getElementById("tasmeea-circle-select")?.value;

  if (!dateVal || !circleId) {
    alert("⚠️ يرجى التأكد من اختيار الحلقة والتاريخ أولاً.");
    return;
  }

  const hifzRating = form.elements["hifz_rating"]?.value || "";
  const murajaaRating = form.elements["murajaa_rating"]?.value || "";
  const tilawaRating = form.elements["tilawa_rating"]?.value || "";

  // تعيين قيمة تقدير متوافقة مع محركات التقارير
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
    updatedAt: Date.now(),
  };

  if (!window.appStore.tasmeea) window.appStore.tasmeea = [];
  const existingIndex = window.appStore.tasmeea.findIndex(
    (t) => t.id === tasmeeaData.id,
  );

  if (existingIndex > -1) {
    window.appStore.tasmeea[existingIndex] = tasmeeaData;
  } else {
    window.appStore.tasmeea.push(tasmeeaData);
  }

  if (typeof saveToCloud === "function") {
    saveToCloud("tasmeea", tasmeeaData.id, tasmeeaData);
  }

  alert("✅ تم حفظ التسميع وخطة الغد بنجاح!");
  renderTasmeeaStudents();
}
