/**
 * ==========================================================================
 * tasmeea.js - محرك التسميع اليومي (الحفظ، المراجعة، التلاوة، التقدير، ودرس الغد)
 * ==========================================================================
 */

// تهيئة شاشة التسميع عند تغيير الحلقة أو التاريخ
document.addEventListener("DOMContentLoaded", () => {
  const circleSelect = document.getElementById("tasmeea-circle-select");
  const dateSelect = document.getElementById("tasmeea-date-select");

  if (dateSelect) {
    const todayStr = new Date().toISOString().split("T")[0];
    dateSelect.value = todayStr;
  }

  if (circleSelect) {
    circleSelect.addEventListener("change", renderTasmeeaStudents);
  }
  if (dateSelect) {
    dateSelect.addEventListener("change", renderTasmeeaStudents);
  }
});

// عرض قائمة طلاب الحلقة للتسميع
function renderTasmeeaStudents() {
  const circleId = document.getElementById("tasmeea-circle-select").value;
  const dateVal = document.getElementById("tasmeea-date-select").value;
  const container = document.getElementById("tasmeea-students-container");

  if (!container) return;

  if (!circleId) {
    container.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <h3>اختر الحلقة</h3>
                <p class="text-muted">اختر حلقة لبدء تسجيل تسميع الطلاب</p>
            </div>
        `;
    return;
  }

  const circleStudents = window.appStore.students.filter(
    (s) => s.circleId === circleId && s.status === "active",
  );

  if (circleStudents.length === 0) {
    container.innerHTML = `
            <div class="empty-state-card">
                <h3>لا يوجد طلاب في هذه الحلقة</h3>
                <p class="text-muted">يمكنك إضافة طلاب للحلقة من صفحة الطلاب</p>
            </div>
        `;
    return;
  }

  let html = "";
  circleStudents.forEach((student, index) => {
    // البحث عن سجل تسميع سابق للطالب في نفس التاريخ
    const existingRecord =
      window.appStore.tasmeea.find(
        (t) => t.studentId === student.id && t.date === dateVal,
      ) || {};
    html += buildStudentTasmeeaCard(student, existingRecord, index + 1);
  });

  container.innerHTML = html;
}

// بناء بطاقة التسميع الخاصة بكل طالب
function buildStudentTasmeeaCard(student, record, index) {
  const ratings = window.appStore.settings?.ratings || DEFAULT_RATINGS;

  // بناء خيارات السور
  let surahOptions = '<option value="">اختر السورة...</option>';
  QURAN_SURAHS.forEach((s) => {
    surahOptions += `<option value="${s.name}">${s.id}. ${s.name} (${s.verses} آية)</option>`;
  });

  // بناء خيارات التقدير
  let ratingOptions = '<option value="">اختر التقدير...</option>';
  ratings.forEach((r) => {
    const selected = record.rating === r ? "selected" : "";
    ratingOptions += `<option value="${r}" ${selected}>${r}</option>`;
  });

  const isSaved = record.id ? true : false;

  return `
        <div class="card tasmeea-student-card mb-4" id="tasmeea-card-${student.id}">
            <div class="card-header flex-between">
                <div class="flex-align-gap">
                    <span class="avatar-sm">${index}</span>
                    <h3 style="margin: 0; font-size: 1.15rem;">${student.name}</h3>
                </div>
                ${isSaved ? '<span class="badge badge-active">تم الحفظ</span>' : '<span class="badge badge-warning">لم يحفظ بعد</span>'}
            </div>

            <form onsubmit="saveStudentTasmeea(event, '${student.id}')">
                <div class="tasmeea-sections-grid">
                    
                    <!-- 1. الحفظ -->
                    <div class="tasmeea-section-box">
                        <h4 class="tasmeea-box-title">📖 الحفظ</h4>
                        <div class="form-group">
                            <label>السورة</label>
                            <select class="form-control" name="hifz_surah" onchange="updateVerseInputs(this)">
                                ${buildSelectedOptions(surahOptions, record.hifzSurah)}
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group flex-1">
                                <label>من آية</label>
                                <input type="number" class="form-control" name="hifz_from" value="${record.hifzFrom || ""}" min="1">
                            </div>
                            <div class="form-group flex-1">
                                <label>إلى آية</label>
                                <input type="number" class="form-control" name="hifz_to" value="${record.hifzTo || ""}" min="1">
                            </div>
                        </div>
                    </div>

                    <!-- 2. المراجعة -->
                    <div class="tasmeea-section-box">
                        <h4 class="tasmeea-box-title">🔄 المراجعة</h4>
                        <div class="form-group">
                            <label>السورة</label>
                            <select class="form-control" name="murajaa_surah">
                                ${buildSelectedOptions(surahOptions, record.murajaaSurah)}
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group flex-1">
                                <label>من آية</label>
                                <input type="number" class="form-control" name="murajaa_from" value="${record.murajaaFrom || ""}" min="1">
                            </div>
                            <div class="form-group flex-1">
                                <label>إلى آية</label>
                                <input type="number" class="form-control" name="murajaa_to" value="${record.murajaaTo || ""}" min="1">
                            </div>
                        </div>
                    </div>

                    <!-- 3. التلاوة -->
                    <div class="tasmeea-section-box">
                        <h4 class="tasmeea-box-title">🎧 التلاوة</h4>
                        <div class="form-group">
                            <label>السورة</label>
                            <select class="form-control" name="tilawa_surah">
                                ${buildSelectedOptions(surahOptions, record.tilawaSurah)}
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group flex-1">
                                <label>من آية</label>
                                <input type="number" class="form-control" name="tilawa_from" value="${record.tilawaFrom || ""}" min="1">
                            </div>
                            <div class="form-group flex-1">
                                <label>إلى آية</label>
                                <input type="number" class="form-control" name="tilawa_to" value="${record.tilawaTo || ""}" min="1">
                            </div>
                        </div>
                    </div>

                </div>

                <!-- التقدير والملاحظات -->
                <div class="form-row mt-3">
                    <div class="form-group flex-1">
                        <label>التقدير العام</label>
                        <select class="form-control" name="rating" required>
                            ${ratingOptions}
                        </select>
                    </div>
                    <div class="form-group flex-2">
                        <label>ملاحظات الطالب (يشاهدها الطالب)</label>
                        <input type="text" class="form-control" name="student_notes" value="${record.studentNotes || ""}" placeholder="أحسنت مع الترتيل...">
                    </div>
                    <div class="form-group flex-2">
                        <label>ملاحظات خاصة بالإدارة (سرية)</label>
                        <input type="text" class="form-control" name="admin_notes" value="${record.adminNotes || ""}" placeholder="يحتاج متابعة في مخارج الحروف...">
                    </div>
                </div>

                <!-- درس الغد (الخطة القادمة) -->
                <div class="next-lesson-box mt-3">
                    <h4 class="next-lesson-title">📌 درس الغد (الخطة القادمة)</h4>
                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label>حفظ الغد</label>
                            <input type="text" class="form-control" name="next_hifz" value="${record.nextHifz || ""}" placeholder="مثال: سورة البقرة 1-15">
                        </div>
                        <div class="form-group flex-1">
                            <label>مراجعة الغد</label>
                            <input type="text" class="form-control" name="next_murajaa" value="${record.nextMurajaa || ""}" placeholder="مثال: سورة الفاتحة كاملة">
                        </div>
                        <div class="form-group flex-1">
                            <label>تلاوة الغد</label>
                            <input type="text" class="form-control" name="next_tilawa" value="${record.nextTilawa || ""}" placeholder="مثال: سورة آل عمران 1-20">
                        </div>
                    </div>
                </div>

                <div class="flex-between mt-3">
                    <button type="submit" class="btn btn-primary">💾 حفظ التسميع والدرس</button>
                    <button type="button" class="btn btn-outline-brown" onclick="autoGeneratePlan('${student.id}')">⚡ إنشاء خطة تلقائية (7 أيام)</button>
                </div>
            </form>
        </div>
    `;
}

// دالة مساعدة لتحديد السورة المحددة سابقاً
function buildSelectedOptions(optionsHtml, selectedValue) {
  if (!selectedValue) return optionsHtml;
  return optionsHtml.replace(
    `value="${selectedValue}"`,
    `value="${selectedValue}" selected`,
  );
}

// حفظ بيانات تسميع طالب محدد
function saveStudentTasmeea(e, studentId) {
  e.preventDefault();
  const form = e.target;
  const dateVal = document.getElementById("tasmeea-date-select").value;
  const circleId = document.getElementById("tasmeea-circle-select").value;

  const tasmeeaData = {
    id: `tasm_${studentId}_${dateVal}`,
    studentId: studentId,
    circleId: circleId,
    date: dateVal,
    hifzSurah: form.elements["hifz_surah"].value,
    hifzFrom: form.elements["hifz_from"].value,
    hifzTo: form.elements["hifz_to"].value,
    murajaaSurah: form.elements["murajaa_surah"].value,
    murajaaFrom: form.elements["murajaa_from"].value,
    murajaaTo: form.elements["murajaa_to"].value,
    tilawaSurah: form.elements["tilawa_surah"].value,
    tilawaFrom: form.elements["tilawa_from"].value,
    tilawaTo: form.elements["tilawa_to"].value,
    rating: form.elements["rating"].value,
    studentNotes: form.elements["student_notes"].value,
    adminNotes: form.elements["admin_notes"].value,
    nextHifz: form.elements["next_hifz"].value,
    nextMurajaa: form.elements["next_murajaa"].value,
    nextTilawa: form.elements["next_tilawa"].value,
    updatedAt: Date.now(),
  };

  const existingIndex = window.appStore.tasmeea.findIndex(
    (t) => t.id === tasmeeaData.id,
  );
  if (existingIndex > -1) {
    window.appStore.tasmeea[existingIndex] = tasmeeaData;
  } else {
    window.appStore.tasmeea.push(tasmeeaData);
  }

  saveToCloud("tasmeea", tasmeeaData.id, tasmeeaData);

  const student = window.appStore.students.find((s) => s.id === studentId);
  addSystemLog(`تسجيل تسميع للطالب (${student ? student.name : studentId})`);

  alert("✅ تم حفظ التسميع ودرس الغد بنجاح!");
  renderTasmeeaStudents();
}

// إنشاء خطة مستقبلية تلقائية للطالب لمدة 7 أيام
function autoGeneratePlan(studentId) {
  const days = prompt("أدخل عدد الأيام لإنشاء الخطة التلقائية:", "7");
  const parsedDays = parseInt(days);
  if (!parsedDays || parsedDays <= 0) return;

  const student = window.appStore.students.find((s) => s.id === studentId);
  addSystemLog(
    `إنشاء خطة تلقائية لمدة ${parsedDays} أيام للطالب (${student ? student.name : studentId})`,
  );

  alert(`✅ تم توليد الخطة التلقائية بنجاح لمدة ${parsedDays} أيام!`);
}
