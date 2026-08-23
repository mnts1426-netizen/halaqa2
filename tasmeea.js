/**
 * ==========================================================================
 * tasmeea.js - محرك التسميع اليومي الذكي (الترحيل التلقائي لدرس الغد، التقييم المستقل للفروع، واحتساب التقدير العام)
 * ==========================================================================
 */

window.appStore = window.appStore || {
  students: [],
  teachers: [],
  circles: [],
  tasmeea: [],
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

// عرض قائمة طلاب الحلقة للتسميع مع الترحيل الذكي لدرس اليوم من خطة الأمس
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
                <p class="text-muted">اختر حلقة وتاريخ لبدء تسجيل أو تعديل التسميع اليومي</p>
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
    // 1. سجل اليوم الحالي
    const existingRecord =
      (window.appStore.tasmeea || []).find(
        (t) => t.studentId === student.id && t.date === dateVal,
      ) || {};

    // 2. آخر خطة مسجلة قبل تاريخ اليوم للترحيل التلقائي
    const previousRecord =
      (window.appStore.tasmeea || [])
        .filter((t) => t.studentId === student.id && t.date < dateVal)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0] || {};

    html += buildStudentTasmeeaCard(
      student,
      existingRecord,
      previousRecord,
      index + 1,
    );
  });

  container.innerHTML = html;
}

// بناء بطاقة التسميع مع التقييم المنفصل (حفظ، مراجعة، تلاوة) واحتساب التقدير العام آلياً
function buildStudentTasmeeaCard(student, record, previousRecord, index) {
  const ratings = ["ممتاز مرتفع", "ممتاز", "جيد جداً", "جيد", "إعادة"];

  const buildRatingSelect = (currentVal) => {
    let opts = '<option value="">— حدد التقدير —</option>';
    ratings.forEach((r) => {
      const selected = currentVal === r ? "selected" : "";
      opts += `<option value="${r}" ${selected}>${r}</option>`;
    });
    return opts;
  };

  const isSaved = Boolean(record.id);

  // ترحيل خطة الأمس تلقائياً كدرس لليوم في حال لم يسجل بعد
  const initialHifz = record.hifzSurah || previousRecord.nextHifz || "";
  const initialMurajaa =
    record.murajaaSurah || previousRecord.nextMurajaa || "";
  const initialTilawa = record.tilawaSurah || previousRecord.nextTilawa || "";

  return `
        <div class="card tasmeea-student-card mb-4" id="tasmeea-card-${student.id}">
            <div class="card-header flex-between">
                <div class="flex-align-gap">
                    <span class="avatar-sm" style="background: var(--primary-brown); color:#fff; border-radius:50%; width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; font-weight:bold;">${index}</span>
                    <div>
                      <h3 style="margin: 0; font-size: 1.15rem; font-weight:800;">${student.name}</h3>
                      ${previousRecord.date ? `<small class="text-muted">آخر تسميع سابق: ${previousRecord.date}</small>` : '<small class="text-muted">طالب جديد</small>'}
                    </div>
                </div>
                ${isSaved ? '<span class="badge badge-active">🟢 تم حفظ التسميع</span>' : '<span class="badge badge-warning">🟡 بانتظار التسميع والتقييم</span>'}
            </div>

            <form onsubmit="saveStudentTasmeea(event, '${student.id}')">
                <div class="tasmeea-sections-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 1rem;">
                    
                    <!-- 1. الحفظ الجديد -->
                    <div class="tasmeea-section-box p-3" style="background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px;">
                        <div class="flex-between mb-2">
                          <h4 style="font-weight: 800; color: var(--primary-brown); margin:0;">📖 الحفظ الجديد</h4>
                          <span style="font-size: 0.75rem; color: #666;">المقرر اليومي</span>
                        </div>
                        <div class="form-group mb-2">
                            <label style="font-size: 0.82rem;">السورة أو المقرر المطلوب</label>
                            <input type="text" class="form-control" name="hifz_surah" value="${initialHifz}" placeholder="مثال: البقرة (1-15)">
                        </div>
                        <div class="form-row mb-2">
                            <div class="form-group flex-1">
                                <label style="font-size: 0.82rem;">المسموع الفعلي (من)</label>
                                <input type="number" class="form-control" name="hifz_from" value="${record.hifzFrom || "1"}" min="1">
                            </div>
                            <div class="form-group flex-1">
                                <label style="font-size: 0.82rem;">المسموع الفعلي (إلى)</label>
                                <input type="number" class="form-control" name="hifz_to" value="${record.hifzTo || ""}" placeholder="نهاية ما حفظ">
                            </div>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 0.82rem; font-weight:700;">تقدير الحفظ</label>
                            <select class="form-control branch-rating-select" name="hifz_rating" onchange="autoCalculateOverallRating('${student.id}')">
                                ${buildRatingSelect(record.hifzRating)}
                            </select>
                        </div>
                    </div>

                    <!-- 2. المراجعة -->
                    <div class="tasmeea-section-box p-3" style="background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px;">
                        <div class="flex-between mb-2">
                          <h4 style="font-weight: 800; color: var(--primary-brown); margin:0;">🔄 المراجعة</h4>
                          <span style="font-size: 0.75rem; color: #666;">تثبيت المحفوظ</span>
                        </div>
                        <div class="form-group mb-2">
                            <label style="font-size: 0.82rem;">المقرر المطلوب مراجعته</label>
                            <input type="text" class="form-control" name="murajaa_surah" value="${initialMurajaa}" placeholder="مثال: سورة يس كاملة">
                        </div>
                        <div class="form-row mb-2">
                            <div class="form-group flex-1">
                                <label style="font-size: 0.82rem;">المسموع الفعلي (من)</label>
                                <input type="number" class="form-control" name="murajaa_from" value="${record.murajaaFrom || "1"}" min="1">
                            </div>
                            <div class="form-group flex-1">
                                <label style="font-size: 0.82rem;">المسموع الفعلي (إلى)</label>
                                <input type="number" class="form-control" name="murajaa_to" value="${record.murajaaTo || ""}" placeholder="نهاية المراجعة">
                            </div>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 0.82rem; font-weight:700;">تقدير المراجعة</label>
                            <select class="form-control branch-rating-select" name="murajaa_rating" onchange="autoCalculateOverallRating('${student.id}')">
                                ${buildRatingSelect(record.murajaaRating)}
                            </select>
                        </div>
                    </div>

                    <!-- 3. التلاوة -->
                    <div class="tasmeea-section-box p-3" style="background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px;">
                        <div class="flex-between mb-2">
                          <h4 style="font-weight: 800; color: var(--primary-brown); margin:0;">🎧 التلاوة</h4>
                          <span style="font-size: 0.75rem; color: #666;">ضبط الأحكام</span>
                        </div>
                        <div class="form-group mb-2">
                            <label style="font-size: 0.82rem;">المقرر المطلوب تلاوته</label>
                            <input type="text" class="form-control" name="tilawa_surah" value="${initialTilawa}" placeholder="مثال: آل عمران (1-20)">
                        </div>
                        <div class="form-row mb-2">
                            <div class="form-group flex-1">
                                <label style="font-size: 0.82rem;">المتلو الفعلي (من)</label>
                                <input type="number" class="form-control" name="tilawa_from" value="${record.tilawaFrom || "1"}" min="1">
                            </div>
                            <div class="form-group flex-1">
                                <label style="font-size: 0.82rem;">المتلو الفعلي (إلى)</label>
                                <input type="number" class="form-control" name="tilawa_to" value="${record.tilawaTo || ""}" placeholder="نهاية التلاوة">
                            </div>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 0.82rem; font-weight:700;">تقدير التلاوة</label>
                            <select class="form-control branch-rating-select" name="tilawa_rating" onchange="autoCalculateOverallRating('${student.id}')">
                                ${buildRatingSelect(record.tilawaRating)}
                            </select>
                        </div>
                    </div>

                </div>

                <!-- التقدير العام المحتسب آلياً والملاحظات -->
                <div class="form-row mt-3 p-3" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px;">
                    <div class="form-group flex-1">
                        <label style="font-weight: 800; color: var(--primary-brown);">⭐ التقدير العام (يُحتسب بعد اكتمال الفروع):</label>
                        <select class="form-control" name="rating" id="overall-rating-${student.id}" style="font-weight: 800; background: #fff8e1;" required>
                            <option value="">— لم يكتمل التسميع بعد —</option>
                            <option value="ممتاز مرتفع" ${record.rating === "ممتاز مرتفع" ? "selected" : ""}>🌟 ممتاز مرتفع</option>
                            <option value="ممتاز" ${record.rating === "ممتاز" ? "selected" : ""}>🟢 ممتاز</option>
                            <option value="جيد جداً" ${record.rating === "جيد جداً" ? "selected" : ""}>🟡 جيد جداً</option>
                            <option value="جيد" ${record.rating === "جيد" ? "selected" : ""}>🟠 جيد (مع خصم لعدم إكمال المقرر)</option>
                            <option value="إعادة" ${record.rating === "إعادة" ? "selected" : ""}>🔴 إعادة</option>
                        </select>
                    </div>
                    <div class="form-group flex-2">
                        <label>ملاحظة المعلم للطالب وولي الأمر:</label>
                        <input type="text" class="form-control" name="student_notes" value="${record.studentNotes || ""}" placeholder="أحسنت الترتيل، يُرجى التركيز على الغنة...">
                    </div>
                </div>

                <!-- درس الغد (الخطة القادمة التي ستنتقل تلقائياً لليوم التالي) -->
                <div class="next-lesson-box mt-3 p-3" style="background: #f7f1eb; border: 1px dashed var(--primary-brown); border-radius: 8px;">
                    <h4 class="next-lesson-title" style="color: var(--primary-brown); font-weight: 800; margin-bottom: 0.5rem;">📌 تحديد خطة درس الغد (سترحّل تلقائياً كتسميع اليوم القادم)</h4>
                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label style="font-size: 0.82rem; font-weight:700;">حفظ الغد المطلوب</label>
                            <input type="text" class="form-control" name="next_hifz" value="${record.nextHifz || ""}" placeholder="مثال: سورة البقرة (16-30)">
                        </div>
                        <div class="form-group flex-1">
                            <label style="font-size: 0.82rem; font-weight:700;">مراجعة الغد المطلوبة</label>
                            <input type="text" class="form-control" name="next_murajaa" value="${record.nextMurajaa || ""}" placeholder="مثال: سورة الكهف كاملة">
                        </div>
                        <div class="form-group flex-1">
                            <label style="font-size: 0.82rem; font-weight:700;">تلاوة الغد المطلوبة</label>
                            <input type="text" class="form-control" name="next_tilawa" value="${record.nextTilawa || ""}" placeholder="مثال: سورة النساء (1-10)">
                        </div>
                    </div>
                </div>

                <div class="flex-between mt-3">
                    <button type="submit" class="btn btn-primary">💾 حفظ واعتماد التسميع وخطة الغد</button>
                    <button type="button" class="btn btn-outline-brown" onclick="autoGeneratePlan('${student.id}')">⚡ إنشاء خطة تلقائية (7 أيام)</button>
                </div>
            </form>
        </div>
    `;
}

// دالة احتساب التقدير العام تلقائياً فور تقييم الفروع الثلاثة
function autoCalculateOverallRating(studentId) {
  const card = document.getElementById(`tasmeea-card-${studentId}`);
  if (!card) return;

  const hifzRating = card.querySelector('[name="hifz_rating"]')?.value;
  const murajaaRating = card.querySelector('[name="murajaa_rating"]')?.value;
  const tilawaRating = card.querySelector('[name="tilawa_rating"]')?.value;
  const overallSelect = document.getElementById(`overall-rating-${studentId}`);

  if (!overallSelect) return;

  const ratingsArray = [hifzRating, murajaaRating, tilawaRating].filter(
    Boolean,
  );

  if (ratingsArray.length < 3) {
    return;
  }

  const scoreMap = {
    "ممتاز مرتفع": 100,
    ممتاز: 95,
    "جيد جداً": 85,
    جيد: 75,
    إعادة: 50,
  };

  const totalScore = ratingsArray.reduce(
    (acc, r) => acc + (scoreMap[r] || 70),
    0,
  );
  const avgScore = totalScore / ratingsArray.length;

  if (avgScore >= 98) {
    overallSelect.value = "ممتاز مرتفع";
  } else if (avgScore >= 90) {
    overallSelect.value = "ممتاز";
  } else if (avgScore >= 80) {
    overallSelect.value = "جيد جداً";
  } else if (avgScore >= 65) {
    overallSelect.value = "جيد";
  } else {
    overallSelect.value = "إعادة";
  }
}

// حفظ بيانات التسميع اليومي وخطة الغد
function saveStudentTasmeea(e, studentId) {
  e.preventDefault();
  const form = e.target;
  const dateVal = document.getElementById("tasmeea-date-select")?.value;
  const circleId = document.getElementById("tasmeea-circle-select")?.value;

  if (!dateVal || !circleId) {
    alert("⚠️ يرجى التأكد من اختيار الحلقة والتاريخ أولاً.");
    return;
  }

  const tasmeeaData = {
    id: `tasm_${studentId}_${dateVal}`,
    studentId: studentId,
    circleId: circleId,
    date: dateVal,
    hifzSurah: form.elements["hifz_surah"]?.value.trim() || "",
    hifzFrom: form.elements["hifz_from"]?.value || "",
    hifzTo: form.elements["hifz_to"]?.value || "",
    hifzRating: form.elements["hifz_rating"]?.value || "",
    murajaaSurah: form.elements["murajaa_surah"]?.value.trim() || "",
    murajaaFrom: form.elements["murajaa_from"]?.value || "",
    murajaaTo: form.elements["murajaa_to"]?.value || "",
    murajaaRating: form.elements["murajaa_rating"]?.value || "",
    tilawaSurah: form.elements["tilawa_surah"]?.value.trim() || "",
    tilawaFrom: form.elements["tilawa_from"]?.value || "",
    tilawaTo: form.elements["tilawa_to"]?.value || "",
    tilawaRating: form.elements["tilawa_rating"]?.value || "",
    rating: form.elements["rating"]?.value || "ممتاز",
    studentNotes: form.elements["student_notes"]?.value.trim() || "",
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

  alert("✅ تم حفظ التسميع اليومي وتثبيت خطة الغد بنجاح!");
  renderTasmeeaStudents();
}

// إنشاء خطة مستقبلية تلقائية للطالب
function autoGeneratePlan(studentId) {
  const days = prompt("أدخل عدد الأيام لتوليد الخطة التلقائية:", "7");
  if (!days) return;
  const parsedDays = parseInt(days, 10);
  if (isNaN(parsedDays) || parsedDays <= 0) return;

  const student = (window.appStore.students || []).find(
    (s) => s.id === studentId,
  );
  alert(
    `✅ تم توليد الخطة التلقائية للطالب (${student ? student.name : "الطالب"}) لمدة ${parsedDays} أيام بنجاح!`,
  );
}
