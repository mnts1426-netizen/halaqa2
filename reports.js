/**
 * ==========================================================================
 * reports.js - محرك التقارير الرسمية الملكية المطابقة للنماذج المعتمدة
 * مَجْمَع عبدالله بن مهدي القرآني
 * ==========================================================================
 */

// تنسيق تاريخ محلي "YYYY-MM-DD" بدون المرور عبر toISOString() (التي تحوّل للتوقيت العالمي
// UTC فتُرجع أحياناً اليوم السابق في المناطق ذات الفارق الموجب كالسعودية UTC+3، وهي
// السبب الجذري لظهور "اليوم السابق" بدل التاريخ المطلوب فعلياً في تقارير الفترات)
function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const reportTypeSelect = document.getElementById("report-type-select");
  if (reportTypeSelect) {
    handleReportTypeChange();
  }
  populateReportStudentsDropdown();
  populateReportWeekRangeDropdowns();

  // ضبط التاريخ التلقائي على اليوم الحالي
  const dateFromInput = document.getElementById("report-date-from");
  const dateToInput = document.getElementById("report-date-to");
  const today = toLocalDateStr(new Date());
  if (dateFromInput && !dateFromInput.value) dateFromInput.value = today;
  if (dateToInput && !dateToInput.value) dateToInput.value = today;
});

// نقطة انطلاق ترقيم أسابيع التميز (الأسبوع الأول): يوم الأحد 17 ربيع الأول 1448هـ (30 أغسطس 2026م)
const TAMAYUZ_EPOCH_SUNDAY = new Date(2026, 7, 30);

function getHijriShortLabel(date) {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
    }).formatToParts(date);
    const day = parts.find((p) => p.type === "day")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    return day && month ? `${day}/${month}` : "";
  } catch (e) {
    return "";
  }
}

function getCurrentTamayuzWeekNumber() {
  const now = new Date();
  const nowSunday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay(),
  );
  const diffDays = Math.round(
    (nowSunday - TAMAYUZ_EPOCH_SUNDAY) / (24 * 60 * 60 * 1000),
  );
  const weekNum = Math.floor(diffDays / 7) + 1;
  return weekNum < 1 ? 1 : weekNum;
}

function getSundayDateForWeekNumber(weekNumber) {
  const d = new Date(TAMAYUZ_EPOCH_SUNDAY);
  d.setDate(d.getDate() + (weekNumber - 1) * 7);
  return d;
}

function populateReportWeekRangeDropdowns() {
  const weekFromSelect = document.getElementById("report-week-from");
  const weekToSelect = document.getElementById("report-week-to");
  if (!weekFromSelect || !weekToSelect) return;

  const currentWeekNum = getCurrentTamayuzWeekNumber();

  let optionsHtml = "";
  for (let n = 1; n <= currentWeekNum; n++) {
    const hijriLabel = getHijriShortLabel(getSundayDateForWeekNumber(n));
    optionsHtml += `<option value="${n}">الأسبوع ${n}${hijriLabel ? ` (${hijriLabel})` : ""}</option>`;
  }

  weekFromSelect.innerHTML = optionsHtml;
  weekToSelect.innerHTML = optionsHtml;
  weekToSelect.value = String(currentWeekNum);
  weekFromSelect.value = String(Math.max(1, currentWeekNum - 4));
}

function populateReportStudentsDropdown() {
  const studentSelect = document.getElementById("report-student-select");
  const circleId =
    document.getElementById("report-circle-select")?.value || "all";
  if (!studentSelect) return;

  const user = window.currentUser;
  const currentVal = studentSelect.value || "all";
  let students = (window.appStore.students || []).filter(
    (s) => s.status === "active",
  );

  if (user && user.role === "teacher") {
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
    students = students.filter((s) => teacherCircleIds.includes(s.circleId));
  }

  if (circleId !== "all") {
    students = students.filter((s) => studentInCircle(s, circleId));
  }

  students = students
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

  let optionsHtml = '<option value="all">كل الطلاب</option>';
  students.forEach((s) => {
    optionsHtml += `<option value="${s.id}">${escapeHtml(s.name)}</option>`;
  });

  studentSelect.innerHTML = optionsHtml;
  if (students.some((s) => s.id === currentVal)) {
    studentSelect.value = currentVal;
  } else {
    studentSelect.value = "all";
  }
}

function handleReportTypeChange() {
  const reportType = document.getElementById("report-type-select")?.value;
  const circleGroup = document.getElementById("report-circle-group");
  const studentGroup = document.getElementById("report-student-group");
  const weekRangeGroup = document.getElementById("report-week-range-group");
  const dateFromGroup = document.getElementById("report-date-from-group");
  const dateToGroup = document.getElementById("report-date-to-group");
  const wrapper = document.getElementById("report-results-wrapper");

  if (wrapper) wrapper.style.display = "none";

  if (circleGroup) circleGroup.style.display = "block";

  // فلتر المرحلية يظهر في تقرير الاختبارات فقط (كشف المرحليات بحث عادي بالحلقة)
  const marhaliyaGroup = document.getElementById("report-marhaliya-group");
  const marhaliyaSelect = document.getElementById("report-marhaliya-select");
  if (marhaliyaGroup) {
    const usesMarhaliya =
      reportType === "marhaliyat_report" || reportType === "exams_report";
    marhaliyaGroup.style.display = usesMarhaliya ? "block" : "none";
    if (usesMarhaliya && marhaliyaSelect) {
      // تغيير نوع التقرير يعيد الفلتر إلى "كل المرحليات" حتى لا يبقى فلتر قديم مخفياً
      marhaliyaSelect.innerHTML = buildMarhaliyaOptionsHtml("", {
        value: "all",
        label: "كل المرحليات",
      });
      marhaliyaSelect.value = "all";
    }
  }

  // تقرير إنجاز يوم الحلقة مخصص لكامل الحلقة في يوم محدد
  if (reportType === "circle_daily" || reportType === "student_achievement") {
    if (studentGroup) studentGroup.style.display = "none";
    if (weekRangeGroup) weekRangeGroup.classList.add("style-hidden");
    if (dateFromGroup) {
      dateFromGroup.style.display = "block";
      const lbl = dateFromGroup.querySelector("label");
      if (lbl) lbl.textContent = "تاريخ اليوم المحدد";
    }
    if (dateToGroup) dateToGroup.style.display = "none";
  } else if (reportType === "student_daily") {
    if (studentGroup) studentGroup.style.display = "block";
    if (weekRangeGroup) weekRangeGroup.classList.add("style-hidden");
    if (dateFromGroup) {
      dateFromGroup.style.display = "block";
      const lbl = dateFromGroup.querySelector("label");
      if (lbl) lbl.textContent = "من تاريخ";
    }
    if (dateToGroup) dateToGroup.style.display = "block";
  } else if (reportType === "tamayuz") {
    if (studentGroup) studentGroup.style.display = "block";
    if (weekRangeGroup) weekRangeGroup.classList.remove("style-hidden");
    if (dateFromGroup) dateFromGroup.style.display = "none";
    if (dateToGroup) dateToGroup.style.display = "none";
    populateReportWeekRangeDropdowns();
  } else if (reportType === "tasmeea_kashf") {
    // تقرير كشف المرحليات: كشف شامل لكل طلاب الحلقة، غير مرتبط بتاريخ محدد
    if (studentGroup) studentGroup.style.display = "none";
    if (weekRangeGroup) weekRangeGroup.classList.add("style-hidden");
    if (dateFromGroup) dateFromGroup.style.display = "none";
    if (dateToGroup) dateToGroup.style.display = "none";
  } else if (
    reportType === "marhaliyat_report" ||
    reportType === "exams_report"
  ) {
    // قائمة المرحليات المسجلة: لا تعتمد على طالب ولا تاريخ محدد
    if (studentGroup) studentGroup.style.display = "none";
    if (weekRangeGroup) weekRangeGroup.classList.add("style-hidden");
    if (dateFromGroup) dateFromGroup.style.display = "none";
    if (dateToGroup) dateToGroup.style.display = "none";
  } else if (reportType === "curriculum_start_end") {
    // تقرير بداية ونهاية المنهج: يُحسب دائماً من أول سجل فعلي لكل طالب على حدة
    // حتى اليوم الحالي - بغض النظر عن أي تاريخ، حتى لا يُحسب من بداية فترة
    // ثابتة لطالب انضم لاحقاً ولم يكن مسجلاً بعد في تلك الفترة
    if (studentGroup) studentGroup.style.display = "block";
    if (weekRangeGroup) weekRangeGroup.classList.add("style-hidden");
    if (dateFromGroup) dateFromGroup.style.display = "none";
    if (dateToGroup) dateToGroup.style.display = "none";
  } else {
    if (studentGroup) studentGroup.style.display = "block";
    if (weekRangeGroup) weekRangeGroup.classList.add("style-hidden");
    if (dateFromGroup) {
      dateFromGroup.style.display = "block";
      const lbl = dateFromGroup.querySelector("label");
      if (lbl) lbl.textContent = "من تاريخ";
    }
    if (dateToGroup) dateToGroup.style.display = "block";
  }
}

function formatArabicDayAndDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const days = [
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];
  const dayName = days[d.getDay()];
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${dayName} ${m}/${day}`;
}

// بناء ترويسة وتذييل التقارير الرسمية المطابقة للنماذج المعتمدة
function buildPdfTemplateChrome(titleText, circleName, centerSubHtml) {
  const header = `
    <div class="report-header-pdf" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.2rem; padding-bottom: 0.8rem; border-bottom: 2px solid #c59b27;">
      <!-- اليمين -->
      <div style="text-align: right; font-size: 0.95rem; font-weight: 800; line-height: 1.6; color: #2E657E;">
        <div style="font-family: 'Amiri', 'Cairo', serif; font-size: 1.05rem;">مجمع عبد الله بن مهدي القرآني</div>
        <div style="color: #6b4226;">جامع القمر</div>
        <div style="color: #2E657E; margin-top: 3px;">حلقة ${circleName || "أبو بكر الصديق"}</div>
      </div>

      <!-- الوسط -->
      <div style="text-align: center; flex: 1; padding: 0 1rem;">
        <div style="display: inline-block; border: 2px solid #2E657E; border-radius: 6px; padding: 0.4rem 1.8rem; background: #f2f7f9; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
          <h2 style="margin: 0; font-size: 1.3rem; font-weight: 900; color: #2E657E; font-family: 'Amiri', 'Cairo', serif;">${titleText}</h2>
        </div>
        ${centerSubHtml || ""}
      </div>

      <!-- اليسار -->
      <div style="text-align: left; font-size: 0.95rem; font-weight: 800; line-height: 1.6; color: #2E657E;">
        <div style="font-family: 'Amiri', 'Cairo', serif; font-size: 1.05rem;">مجمع عبد الله بن مهدي القرآني</div>
        <div style="color: #6b4226;">جامع الهدى</div>
        <div style="color: #9e7817; margin-top: 3px;">حلقات جامع الهدى</div>
      </div>
    </div>
  `;

  const footer = `
    <div class="report-footer-pdf" style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #ebd99f; padding-top: 1rem; margin-top: 1.2rem; font-size: 0.95rem; page-break-inside: avoid; break-inside: avoid; page-break-before: auto; break-before: auto;">
      <div style="text-align: right;">
        <strong style="color: #2E657E; font-size: 1rem;">المنصة الإلكترونية للمجمع القرآني</strong>
      </div>
      <div style="text-align: left;">
        <div style="font-weight: 800; color: #6b4226;">مدير المجمع القرآني</div>
        <div style="font-weight: 900; color: #2E657E; font-size: 1.05rem; margin-top: 2px;">أحمد بن عبدالله آل مهدي</div>
      </div>
    </div>
  `;

  return { header, footer };
}

// دالة استخراج وتوليد التقارير
function generateReport() {
  const reportType = document.getElementById("report-type-select")?.value;
  const selectedStudentId =
    document.getElementById("report-student-select")?.value || "all";
  const circleId =
    document.getElementById("report-circle-select")?.value || "all";
  const dateFrom = document.getElementById("report-date-from")?.value;
  const dateTo = document.getElementById("report-date-to")?.value;

  const wrapper = document.getElementById("report-results-wrapper");
  if (!wrapper) return;

  const allowsAllCircles =
    reportType === "marhaliyat_report" ||
    reportType === "exams_report" ||
    reportType === "tasmeea_kashf";
  if (circleId === "all" && !allowsAllCircles) {
    alert("⚠️ يرجى اختيار الحلقة أولاً قبل استخراج التقرير.");
    wrapper.style.display = "none";
    return;
  }

  const selectedCircle = (window.appStore?.circles || []).find(
    (c) => c.id === circleId,
  );
  const selectedCircleName = selectedCircle
    ? selectedCircle.name
    : "أبو بكر الصديق";

  let headHtml = "";
  let bodyHtml = "";
  let reportTitle = "";
  let centerSubHtml = "";
  let headerLeftText = "";
  let headerRightText = selectedCircleName;

  // 1. تقرير إنجاز يوم الحلقة
  if (reportType === "circle_daily" || reportType === "student_achievement") {
    reportTitle = "تقرير إنجاز طلاب الحلقة اليومي";
    const targetDate = dateFrom || dateTo || toLocalDateStr(new Date());
    const dayDateFormatted = formatArabicDayAndDate(targetDate);
    centerSubHtml = dayDateFormatted;

    headHtml = `
      <tr style="background: #2E657E; color: #ffffff;">
        <th style="width: 40px; text-align: center; border: 1px solid #2E657E;">م</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">اسم الطالب</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">حالة التحضير</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">منهج الدرس</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">التقدير</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">منهج المراجعة</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">التقدير</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">منهج التلاوة</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">التقدير</th>
      </tr>
    `;

    let students = (window.appStore.students || [])
      .filter(
        (s) =>
          studentInCircle(s, circleId) &&
          s.status !== "pending" &&
          s.status !== "archived",
      )
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

    if (students.length === 0) {
      bodyHtml =
        '<tr><td colspan="9" class="text-center text-muted p-4">لا يوجد طلاب مسجلون بهذه الحلقة</td></tr>';
    } else {
      students.forEach((s, idx) => {
        const att = (window.appStore.attendance || []).find(
          (a) => a.studentId === s.id && a.date === targetDate,
        );
        let attStatus = "غير مسجل";
        if (att) {
          if (att.status === "present") attStatus = "حاضر";
          else if (att.status === "absent") attStatus = "غائب";
          else if (att.status === "late") attStatus = "متأخر";
          else if (att.status === "excused") attStatus = "مستأذن";
        }

        const tasm =
          (window.appStore.tasmeea || []).find(
            (t) => t.studentId === s.id && t.date === targetDate,
          ) || {};

        bodyHtml += `
          <tr style="border-bottom: 1px solid #2E657E; text-align: center; font-size: 0.9rem;">
            <td style="padding: 8px; border: 1px solid #2E657E;">${idx + 1}</td>
            <td style="padding: 8px; font-weight: 800; text-align: right; border: 1px solid #2E657E; font-size: 14px; white-space: nowrap;">${escapeHtml(s.name)}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${attStatus}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(tasm.hifzSurah) || "لا يوجد"}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(tasm.hifzRating) || "—"}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(tasm.murajaaSurah) || "لا يوجد"}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(tasm.murajaaRating) || "—"}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(tasm.tilawaSurah) || "لا يوجد"}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(tasm.tilawaRating) || "—"}</td>
          </tr>
        `;
      });
    }
  }

  // 2. تقرير الإنجاز اليومي لطالب
  else if (reportType === "student_daily") {
    reportTitle = "تقرير إنجاز طالب محدد";
    if (selectedStudentId === "all") {
      alert(
        "⚠️ يرجى اختيار الطالب المستهدف لاستخراج تقرير الإنجاز اليومي الخاص به.",
      );
      wrapper.style.display = "none";
      return;
    }

    const studentObj = (window.appStore.students || []).find(
      (s) => s.id === selectedStudentId,
    );
    const studentName = studentObj ? studentObj.name : "";
    headerRightText = studentName || selectedCircleName;

    const studentDailyPeriodText =
      dateFrom && dateTo
        ? `من ${dateFrom} إلى ${dateTo}`
        : "كامل الفترة المسجلة";
    headerLeftText = `الفترة / ${studentDailyPeriodText}`;

    headHtml = `
      <tr style="background: #2E657E; color: #ffffff;">
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">اليوم والتاريخ</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">حالة التحضير</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">منهج الدرس</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">التقدير</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">منهج المراجعة</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">التقدير</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">منهج التلاوة</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">التقدير</th>
      </tr>
    `;

    // يُعرض فقط أيام الدوام الرسمية (الأحد-الأربعاء) التي يوجد لها فعلياً سجل
    // تحضير للطالب - بدون تعداد كل يوم تقويمي بين تاريخين ولا اختلاق صفوف
    // "غير مسجل" لأيام لا يوجد فيها دوام أو لم يُسجَّل لها شيء أصلاً
    let attRecords = (window.appStore.attendance || []).filter(
      (a) => a.studentId === selectedStudentId,
    );
    if (dateFrom) attRecords = attRecords.filter((a) => a.date >= dateFrom);
    if (dateTo) attRecords = attRecords.filter((a) => a.date <= dateTo);
    attRecords = attRecords.filter((a) =>
      typeof isOfficialWorkday === "function" ? isOfficialWorkday(a.date) : true,
    );
    attRecords.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    if (attRecords.length === 0) {
      bodyHtml =
        '<tr><td colspan="8" class="text-center text-muted p-4">لا توجد أيام تحضير مسجّلة لهذا الطالب ضمن الفترة المحددة</td></tr>';
    } else {
      attRecords.forEach((att) => {
        const dStr = att.date;
        const dayFormatted = formatArabicDayAndDate(dStr);
        let attStatus = "غير مسجل";
        if (att.status === "present") attStatus = "حاضر";
        else if (att.status === "absent") attStatus = "غائب";
        else if (att.status === "late") attStatus = "متأخر";
        else if (att.status === "excused") attStatus = "مستأذن";

        const tasm =
          (window.appStore.tasmeea || []).find(
            (t) => t.studentId === selectedStudentId && t.date === dStr,
          ) || {};

        bodyHtml += `
          <tr style="border-bottom: 1px solid #2E657E; text-align: center; font-size: 0.9rem;">
            <td style="padding: 8px; font-weight: 700; border: 1px solid #2E657E;">${dayFormatted}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${attStatus}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(tasm.hifzSurah) || "لا يوجد"}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(tasm.hifzRating) || "لا يوجد"}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(tasm.murajaaSurah) || "لا يوجد"}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(tasm.murajaaRating) || "لا يوجد"}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(tasm.tilawaSurah) || "لا يوجد"}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(tasm.tilawaRating) || "لا يوجد"}</td>
          </tr>
        `;
      });
    }
  }

  // 3. تقرير بداية ونهاية المنهج
  else if (reportType === "curriculum_start_end" || reportType === "tasmeea") {
    reportTitle = "تقرير بداية ونهاية المنهج";
    // يُحسب دائماً من أول سجل فعلي لكل طالب حتى اليوم - بغض النظر عن حقلي
    // التاريخ (مخفيان لهذا التقرير) حتى لا يُحسب لطالب انضم متأخراً كأن بدايته
    // من أول فترة ثابتة لم يكن مسجلاً فيها أصلاً
    headerLeftText = `الفترة / منذ تسجيل كل طالب حتى اليوم`;

    headHtml = `
      <tr style="background: #2E657E; color: #ffffff;">
        <th style="width: 40px; text-align: center; border: 1px solid #2E657E;">م</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">اسم الطالب</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">منهج درس</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">منهج مراجعة</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">منهج تلاوة</th>
      </tr>
    `;

    let students = (window.appStore.students || []).filter(
      (s) =>
        studentInCircle(s, circleId) &&
        s.status !== "pending" &&
        s.status !== "archived",
    );
    if (selectedStudentId !== "all") {
      students = students.filter((s) => s.id === selectedStudentId);
    }
    students.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

    if (students.length === 0) {
      bodyHtml =
        '<tr><td colspan="5" class="text-center text-muted p-4">لا توجد بيانات مطابقة للطلاب</td></tr>';
    } else {
      students.forEach((s, idx) => {
        const tasmList = (window.appStore.tasmeea || []).filter(
          (t) => t.studentId === s.id,
        );

        tasmList.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

        const hifzWithVal = tasmList.filter(
          (t) => t.hifzSurah && t.hifzSurah.trim() !== "",
        );
        const murajaaWithVal = tasmList.filter(
          (t) => t.murajaaSurah && t.murajaaSurah.trim() !== "",
        );
        const tilawaWithVal = tasmList.filter(
          (t) => t.tilawaSurah && t.tilawaSurah.trim() !== "",
        );

        const hifzStart = hifzWithVal[0]?.hifzSurah || "—";
        const hifzEnd = hifzWithVal[hifzWithVal.length - 1]?.hifzSurah || "—";

        const murajaaStart = murajaaWithVal[0]?.murajaaSurah || "—";
        const murajaaEnd =
          murajaaWithVal[murajaaWithVal.length - 1]?.murajaaSurah || "—";

        const tilawaStart = tilawaWithVal[0]?.tilawaSurah || "—";
        const tilawaEnd =
          tilawaWithVal[tilawaWithVal.length - 1]?.tilawaSurah || "—";

        bodyHtml += `
          <tr style="border-bottom: 1px solid #2E657E; text-align: center; font-size: 0.9rem;">
            <td style="padding: 8px; border: 1px solid #2E657E;">${idx + 1}</td>
            <td style="padding: 8px; font-weight: 800; text-align: right; border: 1px solid #2E657E; font-size: 14px; white-space: nowrap;">${escapeHtml(s.name)}</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #2E657E; line-height: 1.8;">
              <div><strong>البداية :</strong> ${escapeHtml(hifzStart)}</div>
              <div><strong>النهاية :</strong> ${escapeHtml(hifzEnd)}</div>
            </td>
            <td style="padding: 8px; text-align: right; border: 1px solid #2E657E; line-height: 1.8;">
              <div><strong>البداية :</strong> ${escapeHtml(murajaaStart)}</div>
              <div><strong>النهاية :</strong> ${escapeHtml(murajaaEnd)}</div>
            </td>
            <td style="padding: 8px; text-align: right; border: 1px solid #2E657E; line-height: 1.8;">
              <div><strong>البداية :</strong> ${escapeHtml(tilawaStart)}</div>
              <div><strong>النهاية :</strong> ${escapeHtml(tilawaEnd)}</div>
            </td>
          </tr>
        `;
      });
    }
  }

  // 4. تقرير شامل
  else if (reportType === "comprehensive" || reportType === "students") {
    reportTitle = "تقرير شامل";
    const periodText =
      dateFrom && dateTo
        ? `من ${dateFrom} إلى ${dateTo}`
        : "كامل الفترة المسجلة";
    headerLeftText = `الفترة / ${periodText}`;

    headHtml = `
      <tr style="background: #2E657E; color: #ffffff;">
        <th style="width: 35px; text-align: center; border: 1px solid #2E657E;">م</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">اسم الطالب</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">أيام الحضور</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">أيام التأخر</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">أيام الاستئذان</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">أيام الغياب</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">بطاقات التميز</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">مرحليات</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">ممتاز</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">جيد جداً</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">جيد</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">يعيد</th>
      </tr>
    `;

    let students = (window.appStore.students || []).filter(
      (s) =>
        studentInCircle(s, circleId) &&
        s.status !== "pending" &&
        s.status !== "archived",
    );
    if (selectedStudentId !== "all") {
      students = students.filter((s) => s.id === selectedStudentId);
    }
    students.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

    if (students.length === 0) {
      bodyHtml =
        '<tr><td colspan="12" class="text-center text-muted p-4">لا توجد بيانات مطابقة للطلاب</td></tr>';
    } else {
      students.forEach((s, idx) => {
        let attList = (window.appStore.attendance || []).filter(
          (a) => a.studentId === s.id,
        );
        if (dateFrom) attList = attList.filter((a) => a.date >= dateFrom);
        if (dateTo) attList = attList.filter((a) => a.date <= dateTo);

        const presentCount = attList.filter(
          (a) => a.status === "present",
        ).length;
        const lateCount = attList.filter((a) => a.status === "late").length;
        const excusedCount = attList.filter(
          (a) => a.status === "excused",
        ).length;

        // عدد الغياب يُحسب فقط من سجلات الحضور المُعتمدة صراحةً بحالة "غائب" -
        // وليس بافتراض الغياب لأي يوم عمل رسمي لا يوجد له سجل إطلاقاً، لأن غياب
        // السجل قد يعني ببساطة أن المعلم لم يحضّر ذلك اليوم (حلقة معطّلة، إجازة،
        // نسيان...) وليس أن الطالب فعلاً غاب - هذا الافتراض كان يُنتج غيابات
        // وهمية لطلاب لم يغيبوا فعلياً
        const absentCount = attList.filter(
          (a) => a.status === "absent",
        ).length;

        let tamayuzCount = 0;
        for (let w = 0; w < 16; w++) {
          if (
            typeof checkStudentCurrentWeekTamayuz === "function" &&
            checkStudentCurrentWeekTamayuz(s.id, w)
          ) {
            tamayuzCount++;
          }
        }

        const testsCount = (window.appStore.tests || []).filter(
          (t) => t.studentId === s.id,
        ).length;

        let tasmList = (window.appStore.tasmeea || []).filter(
          (t) => t.studentId === s.id,
        );
        if (dateFrom) tasmList = tasmList.filter((t) => t.date >= dateFrom);
        if (dateTo) tasmList = tasmList.filter((t) => t.date <= dateTo);

        const countRatingTotal = (type) => {
          let count = 0;
          tasmList.forEach((t) => {
            ["hifzRating", "murajaaRating", "tilawaRating"].forEach((f) => {
              const val = (t[f] || "").trim();
              if (type === "ممتاز" && val.includes("ممتاز")) count++;
              else if (type === "جيد جداً" && val.includes("جيد جداً")) count++;
              else if (type === "جيد" && val === "جيد") count++;
              else if (type === "يعيد" && (val === "يعيد" || val === "ضعيف"))
                count++;
            });
          });
          return count;
        };

        bodyHtml += `
          <tr style="border-bottom: 1px solid #2E657E; text-align: center; font-size: 0.9rem;">
            <td style="padding: 8px; border: 1px solid #2E657E;">${idx + 1}</td>
            <td style="padding: 8px; font-weight: 800; text-align: right; border: 1px solid #2E657E; font-size: 14px; white-space: nowrap;">${escapeHtml(s.name)}</td>
            <td style="padding: 8px; font-weight: 800; color: #2e7d32; border: 1px solid #2E657E;">${presentCount}</td>
            <td style="padding: 8px; font-weight: 800; color: #b78103; border: 1px solid #2E657E;">${lateCount}</td>
            <td style="padding: 8px; font-weight: 800; color: #1565c0; border: 1px solid #2E657E;">${excusedCount}</td>
            <td style="padding: 8px; font-weight: 800; color: #c62828; border: 1px solid #2E657E;">${absentCount}</td>
            <td style="padding: 8px; font-weight: 800; color: #2E657E; border: 1px solid #2E657E;">${tamayuzCount}</td>
            <td style="padding: 8px; font-weight: 800; border: 1px solid #2E657E;">${testsCount}</td>
            <td style="padding: 8px; font-weight: 800; color: #2e7d32; border: 1px solid #2E657E;">${countRatingTotal("ممتاز")}</td>
            <td style="padding: 8px; font-weight: 800; color: #2E657E; border: 1px solid #2E657E;">${countRatingTotal("جيد جداً")}</td>
            <td style="padding: 8px; font-weight: 800; color: #816105; border: 1px solid #2E657E;">${countRatingTotal("جيد")}</td>
            <td style="padding: 8px; font-weight: 800; color: #c62828; border: 1px solid #2E657E;">${countRatingTotal("يعيد")}</td>
          </tr>
        `;
      });
    }
  }

  // 5. تقرير التميز الأسبوعي
  else if (reportType === "tamayuz") {
    reportTitle = "تقرير التميز الأسبوعي";
    const weekFromVal = document.getElementById("report-week-from")?.value;
    const weekToVal = document.getElementById("report-week-to")?.value;
    const tamayuzPeriodText =
      weekFromVal && weekToVal
        ? `من الأسبوع ${weekFromVal} إلى الأسبوع ${weekToVal}`
        : "آخر 16 أسبوعاً";
    headerLeftText = `الفترة / ${tamayuzPeriodText}`;

    headHtml = `
      <tr style="background: #2E657E; color: #ffffff;">
        <th style="padding: 10px; text-align: right; border: 1px solid #2E657E;">اسم الطالب المتميز</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #2E657E;">مرات التميز الأسبوعية</th>
      </tr>
    `;

    let students = (window.appStore.students || []).filter(
      (s) => studentInCircle(s, circleId) && s.status === "active",
    );
    if (selectedStudentId !== "all") {
      students = students.filter((s) => s.id === selectedStudentId);
    }

    const studentBadgesCount = [];
    students.forEach((s) => {
      let badgesSum = 0;
      for (let w = 0; w < 16; w++) {
        if (
          typeof checkStudentCurrentWeekTamayuz === "function" &&
          checkStudentCurrentWeekTamayuz(s.id, w)
        ) {
          badgesSum++;
        }
      }
      if (badgesSum > 0)
        studentBadgesCount.push({ student: s, count: badgesSum });
    });

    if (studentBadgesCount.length === 0) {
      bodyHtml =
        '<tr><td colspan="2" class="text-center text-muted p-4">لا توجد بطاقات تميز مسجلة للطلاب</td></tr>';
    } else {
      studentBadgesCount.forEach((item) => {
        bodyHtml += `
          <tr style="border-bottom: 1px solid #2E657E; text-align: center; font-size: 0.9rem;">
            <td style="padding: 8px; font-weight: 800; text-align: right; border: 1px solid #2E657E; font-size: 14px; white-space: nowrap;">⭐ ${escapeHtml(item.student.name)}</td>
            <td style="padding: 8px; font-weight: 900; color: #2E657E; border: 1px solid #2E657E;">🎖️ ${item.count} بطاقات</td>
          </tr>
        `;
      });
    }
  }

  // 6. تقرير كشف المرحليات
  else if (reportType === "tasmeea_kashf") {
    reportTitle = "تقرير كشف المرحليات";
    const allCirclesKashf = circleId === "all";
    if (allCirclesKashf) headerRightText = "كل الحلقات";
    const kashfColCount = allCirclesKashf ? 6 : 5;

    headHtml = `
      <tr style="background: #2E657E; color: #ffffff;">
        <th style="width: 40px; text-align: center; border: 1px solid #2E657E;">م</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">اسم الطالب</th>
        ${allCirclesKashf ? '<th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">الحلقة</th>' : ""}
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">${KASHF_DETAIL_LABEL}</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">عدد الصفحات الباقي</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #2E657E;">ملاحظات</th>
      </tr>
    `;

    const kashfCircles = window.appStore.circles || [];
    const kashfCircleName = (stu) => {
      const c = kashfCircles.find((x) => x.id === stu.circleId);
      return c ? c.name : "—";
    };
    // كل الحلقات: كل طالب نشط مرة واحدة تحت حلقته الأساسية، مرتبين بالحلقة ثم الاسم
    const kashfStudents = (window.appStore.students || [])
      .filter(
        (s) =>
          s.status === "active" &&
          (allCirclesKashf || studentInCircle(s, circleId)),
      )
      .sort(
        (a, b) =>
          (allCirclesKashf
            ? kashfCircleName(a).localeCompare(kashfCircleName(b), "ar")
            : 0) || (a.name || "").localeCompare(b.name || "", "ar"),
      );

    if (kashfStudents.length === 0) {
      bodyHtml = `<tr><td colspan="${kashfColCount}" class="text-center text-muted p-4">لا يوجد طلاب مسجلون بهذه الحلقة</td></tr>`;
    } else {
      kashfStudents.forEach((s, idx) => {
        const entry =
          (window.appStore.tasmeeaKashf || []).find(
            (k) => k.studentId === s.id,
          ) || {};
        const remainingText =
          entry.remainingPages === undefined || entry.remainingPages === null
            ? "—"
            : entry.remainingPages;

        bodyHtml += `
          <tr style="border-bottom: 1px solid #2E657E; text-align: center; font-size: 0.9rem;">
            <td style="padding: 8px; border: 1px solid #2E657E;">${idx + 1}</td>
            <td style="padding: 8px; font-weight: 800; text-align: right; border: 1px solid #2E657E; font-size: 14px; white-space: nowrap;">${escapeHtml(s.name)}</td>
            ${allCirclesKashf ? `<td style="padding: 8px; border: 1px solid #2E657E;">${escapeHtml(kashfCircleName(s))}</td>` : ""}
            <td style="padding: 8px; text-align: right; border: 1px solid #2E657E;">${escapeHtml(entry.detail) || "—"}</td>
            <td style="padding: 8px; border: 1px solid #2E657E;">${remainingText}</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #2E657E;">${escapeHtml(entry.notes) || "—"}</td>
          </tr>
        `;
      });
    }
  }

  // 7. تقرير المرحليات / 8. تقرير الاختبارات (نفس القائمة المسجَّلة من شاشة
  // الاختبارات، ويزيد تقرير الاختبارات وحده عمود "التوقيع" الفارغ)
  else if (reportType === "marhaliyat_report" || reportType === "exams_report") {
    const withSignature = reportType === "exams_report";
    reportTitle = withSignature ? "تقرير الاختبارات" : "تقرير المرحليات";
    if (circleId === "all") headerRightText = "كل الحلقات";

    const cellStyle = "padding: 8px; border: 1px solid #2E657E; text-align: center;";
    const thStyle = "padding: 10px 8px; text-align: center; border: 1px solid #2E657E;";
    const colCount = withSignature ? 9 : 8;

    headHtml = `
      <tr style="background: #2E657E; color: #ffffff;">
        <th style="width: 40px; ${thStyle}">م</th>
        <th style="${thStyle}">اسم الطالب</th>
        <th style="${thStyle}">الحلقة</th>
        <th style="${thStyle}">المرحلية</th>
        <th style="${thStyle}">الدرجة</th>
        <th style="${thStyle}">التقدير</th>
        <th style="${thStyle}">الجائزة</th>
        <th style="${thStyle}">التاريخ</th>
        ${withSignature ? `<th style="${thStyle} width: 20%; white-space: normal;">التوقيع باستلام الجائزة</th>` : ""}
      </tr>
    `;

    const marhaliyaFilter =
      document.getElementById("report-marhaliya-select")?.value || "all";
    const allStudents = window.appStore.students || [];
    const allCircles = window.appStore.circles || [];
    const rows = (window.appStore.tests || [])
      .map((t) => {
        const stu = allStudents.find((s) => s.id === t.studentId);
        const circle = allCircles.find((c) => c.id === t.circleId);
        return {
          t,
          stu,
          studentName: stu ? stu.name : "طالب",
          circleName: circle ? circle.name : "—",
        };
      })
      .filter(({ t, stu }) =>
        circleId === "all"
          ? true
          : t.circleId === circleId || (stu && studentInCircle(stu, circleId)),
      )
      .filter(
        ({ t }) =>
          marhaliyaFilter === "all" || sameMarhaliya(t.type, marhaliyaFilter),
      )
      .sort(
        (a, b) =>
          marhaliyaOrder(a.t.type) - marhaliyaOrder(b.t.type) ||
          a.studentName.localeCompare(b.studentName, "ar") ||
          (a.t.date || "").localeCompare(b.t.date || ""),
      );

    if (rows.length === 0) {
      bodyHtml = `<tr><td colspan="${colCount}" class="text-center text-muted p-4">لا توجد مرحليات مسجلة</td></tr>`;
    } else {
      rows.forEach(({ t, studentName, circleName }, idx) => {
        bodyHtml += `
          <tr style="text-align: center; font-size: 0.9rem;">
            <td style="${cellStyle}">${idx + 1}</td>
            <td style="${cellStyle} font-weight: 800; text-align: right; white-space: nowrap;">${escapeHtml(studentName)}</td>
            <td style="${cellStyle}">${escapeHtml(circleName)}</td>
            <td style="${cellStyle}">${escapeHtml(t.type) || "—"}</td>
            <td style="${cellStyle} font-weight: 700;">${escapeHtml(t.score) || "0"} / 100</td>
            <td style="${cellStyle}">${escapeHtml(t.rating) || "—"}</td>
            <td style="${cellStyle}">${escapeHtml(t.prize) || "—"}</td>
            <td style="${cellStyle}">${escapeHtml(t.date) || "—"}</td>
            ${withSignature ? `<td style="${cellStyle} height: 34px;"></td>` : ""}
          </tr>
        `;
      });
    }
  }

  // بناء التقرير داخل الحاوية وإظهارها فوراً
  wrapper.style.display = "block";
  wrapper.dataset.reportTitle = reportTitle;
  wrapper.dataset.reportCircle = selectedCircleName;

  const chrome = window.buildOfficialPrintChrome(
    reportTitle,
    headerRightText,
    "",
    headerLeftText,
  );

  // تعديل موضع هوامش التذييل ليحافظ على اتصاله بالجدول في نفس الصفحة الأخيرة
  const adjustedFooter = chrome.footer
    ? chrome.footer.replace(
        /margin-top:\s*[^;"]+;/i,
        "margin-top: 12px; page-break-inside: avoid; break-inside: avoid; page-break-before: auto; break-before: auto;",
      )
    : "";

  wrapper._chromeHeader = chrome.header;
  wrapper._chromeFooter = adjustedFooter;

  wrapper.innerHTML = `
    <style>
      #report-results-table tbody tr:nth-child(even) { background-color: #DDECF3 !important; }
      #report-results-table thead th { background-color: #2E657E !important; border-bottom-color: #C9A227 !important; }
    </style>
    <div style="border: 2.5px double #2E657E; border-radius: 8px; padding: 1.5rem; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05); margin-top: 1rem; margin-right: 12px;">
      ${chrome.header}
      <div class="table-responsive" style="margin-bottom: 0.8rem;">
        <table class="data-table" id="report-results-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #2E657E;">
          <thead id="report-thead">${headHtml}</thead>
          <tbody id="report-tbody">${bodyHtml}</tbody>
        </table>
      </div>
      ${adjustedFooter}
    </div>
  `;
}

function exportReportExcel() {
  const table = document.getElementById("report-results-table");
  if (!table || table.rows.length <= 1) {
    alert("⚠️ لا توجد بيانات في التقرير لتصديرها! يرجى استخراج التقرير أولاً.");
    return;
  }
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "التقرير" });
  XLSX.writeFile(wb, `تقرير_${toLocalDateStr(new Date())}.xlsx`);
}

async function imageToDataUri(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

async function downloadReportWord() {
  const element = document.getElementById("report-results-wrapper");
  if (
    !element ||
    element.style.display === "none" ||
    !element.innerHTML.trim()
  ) {
    alert("⚠️ يرجى استخراج التقرير أولاً قبل التنزيل!");
    return;
  }

  const reportTitle = element.dataset.reportTitle || "تقرير_المَجْمَع";
  const circleName = element.dataset.reportCircle || "حلقة";
  const safeFilename = `${reportTitle}_${circleName}`
    .trim()
    .replace(/\s+/g, "_");

  const contentClone = element.cloneNode(true);
  const logoImgs = Array.from(contentClone.querySelectorAll("img"));
  await Promise.all(
    logoImgs.map(async (img) => {
      const dataUri = await imageToDataUri(img.getAttribute("src"));
      if (dataUri) img.setAttribute("src", dataUri);
    }),
  );

  const wordHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>${reportTitle}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Cairo', 'Tajawal', Arial, sans-serif; direction: rtl; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11pt; }
          th, td { border: 1px solid #2E657E; padding: 6px; text-align: center; }
          th { background-color: #2E657E; color: #ffffff; font-weight: bold; }
        </style>
      </head>
      <body dir="rtl">
        ${contentClone.innerHTML}
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", wordHtml], {
    type: "application/msword",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeFilename}_${toLocalDateStr(new Date())}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function getSelectedReportOrientation() {
  const portraitRadio = document.getElementById("report-orientation-portrait");
  return portraitRadio && portraitRadio.checked ? "portrait" : "landscape";
}

function downloadReportPDF() {
  const element = document.getElementById("report-results-wrapper");
  if (
    !element ||
    element.style.display === "none" ||
    !element.innerHTML.trim()
  ) {
    alert("⚠️ يرجى استخراج التقرير أولاً قبل التنزيل!");
    return;
  }

  const reportTitle = element.dataset.reportTitle || "تقرير_المَجْمَع";
  const circleName = element.dataset.reportCircle || "حلقة";
  const safeFilename = `${reportTitle}_${circleName}`
    .trim()
    .replace(/\s+/g, "_");
  const orientation = getSelectedReportOrientation();
  const table = document.getElementById("report-results-table");

  if (
    table &&
    element._chromeHeader &&
    typeof window.generateMultiPagePDF === "function"
  ) {
    window.generateMultiPagePDF(
      element._chromeHeader,
      element._chromeFooter || "",
      table,
      safeFilename,
      orientation,
    );
  } else if (typeof html2pdf !== "undefined") {
    const opt = {
      margin: [8, 8, 8, 8],
      filename: `${safeFilename}_${toLocalDateStr(new Date())}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: orientation },
    };
    html2pdf().set(opt).from(element).save();
  } else {
    printOfficialReport();
  }
}

function printOfficialReport() {
  const wrapper = document.getElementById("report-results-wrapper");
  if (
    !wrapper ||
    wrapper.style.display === "none" ||
    !wrapper.innerHTML.trim()
  ) {
    alert("⚠️ يرجى استخراج التقرير أولاً قبل الطباعة!");
    return;
  }

  const reportTitle = wrapper.dataset.reportTitle || "تقرير رسمي";
  const orientation = getSelectedReportOrientation();
  const table = document.getElementById("report-results-table");
  const chromeHeader = wrapper._chromeHeader || "";
  const chromeFooter = wrapper._chromeFooter || "";

  // تُدرَج الترويسة كصف إضافي داخل thead الجدول حتى تتكرر تلقائياً أعلى كل صفحة
  // مطبوعة (thead يتكرر أصلاً في كل المتصفحات عند الطباعة) بدل ظهورها أول صفحة فقط
  const printableHtml =
    table && typeof window.buildRepeatingHeaderTableHtml === "function"
      ? window.buildRepeatingHeaderTableHtml(table, chromeHeader)
      : chromeHeader + (table ? table.outerHTML : wrapper.innerHTML);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("⚠️ تعذّر فتح نافذة الطباعة، يرجى السماح بالنوافذ المنبثقة لهذا الموقع ثم المحاولة مرة أخرى.");
    return;
  }
  printWindow.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>${reportTitle}</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: 8mm 10mm;
          }
          body {
            font-family: 'Cairo', 'Tajawal', sans-serif;
            direction: rtl;
            padding: 10px 12px;
            background: #fff;
            color: #000;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table {
            width: 100%;
            table-layout: auto;
            border-collapse: collapse;
            margin-top: 5px;
            margin-bottom: 8px;
            font-size: 10.5px;
          }
          thead {
            display: table-header-group !important;
          }
          tbody tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            border: 1px solid #2E657E;
            padding: 6px 4px;
            text-align: center;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          /* جداول تخطيط الترويسة/التذييل: بلا حدود ولا حشو الجدول الأم */
          table[role="presentation"] td { border: none; padding: 0 4px; }
          th {
            background-color: #2E657E !important;
            color: #ffffff !important;
            font-weight: bold;
          }
          tbody tr:nth-child(even) {
            background-color: #DDECF3 !important;
          }
          /* تثبيت تذييل التقرير واسم المدير في الصفحة الأخيرة ومنع انفصاله */
          .report-footer-print,
          [style*="border-top: 1.5px solid #C9A227"],
          [style*="border-top: 2px solid #C9A227"],
          .report-footer-pdf {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: auto !important;
            break-before: auto !important;
            margin-top: 8px !important;
            padding-top: 6px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .no-print, button {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${printableHtml}
        <div class="report-footer-print">
          ${chromeFooter}
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();

  let printTriggered = false;
  const triggerPrint = () => {
    if (printTriggered) return;
    printTriggered = true;
    // إغلاق النافذة فور print() يلغي توليد ملف PDF في بعض المتصفحات (خصوصاً الجوال)،
    // لذا تُغلق بعد انتهاء الطباعة فعلياً، مع مهلة احتياطية طويلة
    printWindow.onafterprint = () => printWindow.close();
    printWindow.print();
    setTimeout(() => {
      try {
        printWindow.close();
      } catch (e) {}
    }, 60000);
  };

  const pendingImgs = Array.from(printWindow.document.images || []).filter(
    (img) => !img.complete,
  );
  if (pendingImgs.length === 0) {
    setTimeout(triggerPrint, 250);
  } else {
    let loadedCount = 0;
    const onImgSettled = () => {
      loadedCount++;
      if (loadedCount >= pendingImgs.length) setTimeout(triggerPrint, 150);
    };
    pendingImgs.forEach((img) => {
      img.addEventListener("load", onImgSettled);
      img.addEventListener("error", onImgSettled);
    });
    setTimeout(triggerPrint, 2500);
  }
}
