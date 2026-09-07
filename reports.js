/**
 * ==========================================================================
 * reports.js - محرك التقارير الرسمية الملكية المطابقة لنموذج المتابعة والإنجاز
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  const reportTypeSelect = document.getElementById("report-type-select");
  if (reportTypeSelect) {
    handleReportTypeChange();
  }
  populateReportStudentsDropdown();
  populateReportWeekRangeDropdowns();
});

// نقطة انطلاق ترقيم أسابيع التميز (الأسبوع الأول): يوم الأحد الموافق 17 ربيع الأول 1448هـ
// (بحسب التقويم الهجري لأم القرى) = الأحد 30 أغسطس 2026م ميلادي
const TAMAYUZ_EPOCH_SUNDAY = new Date(2026, 7, 30);

// إرجاع نص هجري مختصر بصيغة "يوم/شهر" (تقويم أم القرى) لتاريخ معيّن
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

// رقم الأسبوع الحالي (الأسبوع الأول = 1) بالنسبة لنقطة الانطلاق أعلاه
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

// تاريخ يوم الأحد لأسبوع معيّن برقمه
function getSundayDateForWeekNumber(weekNumber) {
  const d = new Date(TAMAYUZ_EPOCH_SUNDAY);
  d.setDate(d.getDate() + (weekNumber - 1) * 7);
  return d;
}

// تعبئة قوائم نطاق أسابيع التميز (من - إلى) بترقيم متزايد يبدأ من الأسبوع الأول
// ويزداد تلقائياً مع مرور الأسابيع، وكل أسبوع يظهر بجانبه تاريخ يوم الأحد بالهجري
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
    students = students.filter((s) => s.circleId === circleId);
  }

  let optionsHtml = '<option value="all">كل الطلاب</option>';
  students.forEach((s) => {
    optionsHtml += `<option value="${s.id}">${s.name}</option>`;
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
  const thead = document.getElementById("report-thead");
  const tbody = document.getElementById("report-tbody");
  const wrapper = document.getElementById("report-results-wrapper");

  // إخفاء صندوق النتائج والشعارات لحين الضغط على زر الاستخراج
  if (wrapper) wrapper.style.display = "none";

  if (circleGroup) circleGroup.style.display = "block";
  if (studentGroup) studentGroup.style.display = "block";

  if (reportType === "tamayuz") {
    if (weekRangeGroup) weekRangeGroup.classList.remove("style-hidden");
    if (dateFromGroup) dateFromGroup.style.display = "none";
    if (dateToGroup) dateToGroup.style.display = "none";
    populateReportWeekRangeDropdowns();
  } else {
    if (weekRangeGroup) weekRangeGroup.classList.add("style-hidden");
    if (dateFromGroup) dateFromGroup.style.display = "block";
    if (dateToGroup) dateToGroup.style.display = "block";
  }

  if (tbody) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center text-muted p-4">حدد خيارات التقرير ثم اضغط على "استخراج التقرير"</td></tr>';
  }
  if (thead) thead.innerHTML = "";
}

function getSundayToWednesdayDatesByWeekOption(weekNumber) {
  const n = parseInt(weekNumber, 10);
  if (!n || n < 1) return [];

  const sunday = getSundayDateForWeekNumber(n);

  const days = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${day}`);
  }
  return days;
}

// دالة توليد التقرير الفخم المطابق تماماً لنموذج المتابعة والإنجاز
function generateReport() {
  const reportType = document.getElementById("report-type-select")?.value;
  const selectedStudentId =
    document.getElementById("report-student-select")?.value || "all";
  const circleId =
    document.getElementById("report-circle-select")?.value || "all";
  const dateFrom = document.getElementById("report-date-from")?.value;
  const dateTo = document.getElementById("report-date-to")?.value;
  const currentTamayuzWeek = getCurrentTamayuzWeekNumber();
  const weekFrom =
    document.getElementById("report-week-from")?.value ||
    String(Math.max(1, currentTamayuzWeek - 4));
  const weekTo =
    document.getElementById("report-week-to")?.value ||
    String(currentTamayuzWeek);

  const wrapper = document.getElementById("report-results-wrapper");
  const thead = document.getElementById("report-thead");
  const tbody = document.getElementById("report-tbody");
  const printTitle = document.getElementById("print-report-title");
  const printPeriod = document.getElementById("print-report-period");

  if (!thead || !tbody) return;

  // إلزام اختيار حلقة محددة قبل استخراج أي تقرير (لا يُسمح باختيار "كل الحلقات")
  if (circleId === "all") {
    alert("⚠️ يرجى اختيار الحلقة أولاً قبل استخراج التقرير.");
    if (wrapper) wrapper.style.display = "none";
    return;
  }
  const selectedCircleName =
    (window.appStore?.circles || []).find((c) => c.id === circleId)?.name ||
    "";

  let headHtml = "";
  let bodyHtml = "";
  let printTitleText = "";

  // 1. تقرير إنجاز الطالب اليومي
  if (reportType === "student_achievement") {
    const targetDateLabel =
      dateTo || dateFrom || new Date().toISOString().split("T")[0];

    printTitleText = "تقرير إنجاز الطالب اليومي";
    if (printTitle) printTitle.textContent = printTitleText;
    if (printPeriod) {
      printPeriod.textContent = "";
      printPeriod.style.display = "none";
    }

    headHtml = `
      <tr style="background: #0a5c71; color: #ffffff;">
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">الطالب</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">الحضور</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">مقرر الدرس</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">التقدير</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">مقرر المراجعة</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">التقدير</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">مقرر التلاوة</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">التقدير</th>
      </tr>
    `;

    let students = (window.appStore.students || []).filter(
      (s) => s.status !== "pending",
    );

    if (circleId !== "all") {
      students = students.filter((s) => s.circleId === circleId);
    }
    if (selectedStudentId !== "all") {
      students = students.filter((s) => s.id === selectedStudentId);
    }

    if (students.length === 0) {
      bodyHtml =
        '<tr><td colspan="8" class="text-center text-muted p-4">لا توجد بيانات مطابقة للطلاب</td></tr>';
    } else {
      students.forEach((s) => {
        const allAtt = (window.appStore.attendance || []).filter(
          (a) => a.studentId === s.id,
        );
        const todayAttRec = allAtt.find((a) => a.date === targetDateLabel);

        let attStatusText = '<span style="color:#777;">غير مسجل</span>';
        if (todayAttRec) {
          if (todayAttRec.status === "present")
            attStatusText =
              '<span style="color:#2e7d32; font-weight:800;">حاضر</span>';
          else if (todayAttRec.status === "absent")
            attStatusText =
              '<span style="color:#c62828; font-weight:800;">غائب</span>';
          else if (todayAttRec.status === "late")
            attStatusText =
              '<span style="color:#b78103; font-weight:800;">متأخر</span>';
          else if (todayAttRec.status === "excused")
            attStatusText =
              '<span style="color:#1565c0; font-weight:800;">مستأذن</span>';
        }

        const allTasm = (window.appStore.tasmeea || []).filter(
          (t) => t.studentId === s.id,
        );
        const todayTasm = allTasm.find((t) => t.date === targetDateLabel) || {};

        bodyHtml += `
          <tr style="border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 0.88rem;">
            <td style="padding: 8px; font-weight: 800; color: #1e293b; text-align: right;">${s.name}</td>
            <td style="padding: 8px;">${attStatusText}</td>
            <td style="padding: 8px; color: #334155;">${todayTasm.hifzSurah || "—"}</td>
            <td style="padding: 8px; color: #334155;">${todayTasm.hifzRating || "—"}</td>
            <td style="padding: 8px; color: #334155;">${todayTasm.murajaaSurah || "—"}</td>
            <td style="padding: 8px; color: #334155;">${todayTasm.murajaaRating || "—"}</td>
            <td style="padding: 8px; color: #334155;">${todayTasm.tilawaSurah || "—"}</td>
            <td style="padding: 8px; color: #334155;">${todayTasm.tilawaRating || "—"}</td>
          </tr>
        `;
      });
    }
  }

  // 1ب. تقرير آخر ما وصل إليه الطالب (أحدث سجل مسجَّل لكل قسم، بغض النظر عن التاريخ)
  else if (reportType === "tasmeea") {
    printTitleText = "تقرير آخر ما وصل إليه الطالب";
    if (printTitle) printTitle.textContent = printTitleText;
    if (printPeriod) {
      printPeriod.textContent = "";
      printPeriod.style.display = "none";
    }

    headHtml = `
      <tr style="background: #0a5c71; color: #ffffff;">
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">الطالب</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">آخر الدرس</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">التقدير</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">آخر المراجعة</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">التقدير</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">آخر التلاوة</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">التقدير</th>
      </tr>
    `;

    let students = (window.appStore.students || []).filter(
      (s) => s.status !== "pending",
    );

    if (circleId !== "all") {
      students = students.filter((s) => s.circleId === circleId);
    }
    if (selectedStudentId !== "all") {
      students = students.filter((s) => s.id === selectedStudentId);
    }

    if (students.length === 0) {
      bodyHtml =
        '<tr><td colspan="7" class="text-center text-muted p-4">لا توجد بيانات مطابقة للطلاب</td></tr>';
    } else {
      const findLatest = (records, field) => {
        return (
          records
            .filter((t) => t[field] && String(t[field]).trim() !== "")
            .sort(
              (a, b) =>
                (b.date || "").localeCompare(a.date || "") ||
                (b.updatedAt || 0) - (a.updatedAt || 0),
            )[0] || null
        );
      };

      students.forEach((s) => {
        const allTasm = (window.appStore.tasmeea || []).filter(
          (t) => t.studentId === s.id,
        );
        const latestHifz = findLatest(allTasm, "hifzSurah");
        const latestMurajaa = findLatest(allTasm, "murajaaSurah");
        const latestTilawa = findLatest(allTasm, "tilawaSurah");

        bodyHtml += `
          <tr style="border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 0.88rem;">
            <td style="padding: 8px; font-weight: 800; color: #1e293b; text-align: right;">${s.name}</td>
            <td style="padding: 8px; color: #334155;">${latestHifz ? latestHifz.hifzSurah : "—"}</td>
            <td style="padding: 8px; color: #334155;">${latestHifz ? latestHifz.hifzRating || "—" : "—"}</td>
            <td style="padding: 8px; color: #334155;">${latestMurajaa ? latestMurajaa.murajaaSurah : "—"}</td>
            <td style="padding: 8px; color: #334155;">${latestMurajaa ? latestMurajaa.murajaaRating || "—" : "—"}</td>
            <td style="padding: 8px; color: #334155;">${latestTilawa ? latestTilawa.tilawaSurah : "—"}</td>
            <td style="padding: 8px; color: #334155;">${latestTilawa ? latestTilawa.tilawaRating || "—" : "—"}</td>
          </tr>
        `;
      });
    }
  }

  // 2. التقرير الإحصائي الشامل للطلاب
  else if (reportType === "students") {
    printTitleText = "التقرير الإحصائي الشامل للطلاب (أعداد الإنجاز والحضور)";
    if (printTitle) printTitle.textContent = printTitleText;
    if (printPeriod) {
      printPeriod.textContent =
        dateFrom && dateTo
          ? `الفترة: من تاريخ ${dateFrom} إلى تاريخ ${dateTo}`
          : "كامل الفترة المسجلة";
      printPeriod.style.display = "block";
    }

    headHtml = `
      <tr style="background: #0a5c71; color: #ffffff;">
        <th rowspan="2" style="vertical-align: middle; text-align: center; border: 1px solid #cbd5e1;">م</th>
        <th rowspan="2" style="vertical-align: middle; border: 1px solid #cbd5e1;">اسم الطالب</th>
        <th rowspan="2" style="vertical-align: middle; text-align: center; border: 1px solid #cbd5e1;">أيام<br>الحضور</th>
        <th rowspan="2" style="vertical-align: middle; text-align: center; border: 1px solid #cbd5e1;">أيام<br>الغياب</th>
        <th rowspan="2" style="vertical-align: middle; text-align: center; border: 1px solid #cbd5e1;">مرات<br>التميز</th>
        <th colspan="4" style="text-align: center; border: 1px solid #cbd5e1;">الدرس الجديد</th>
        <th colspan="4" style="text-align: center; border: 1px solid #cbd5e1;">المراجعة</th>
        <th colspan="4" style="text-align: center; border: 1px solid #cbd5e1;">التلاوة</th>
      </tr>
      <tr style="background: #c59b27; color: #ffffff; font-size: 0.8rem;">
        <th style="border: 1px solid #cbd5e1;">ممتاز</th>
        <th style="border: 1px solid #cbd5e1;">ج.جداً</th>
        <th style="border: 1px solid #cbd5e1;">جيد</th>
        <th style="border: 1px solid #cbd5e1;">يعيد</th>
        <th style="border: 1px solid #cbd5e1;">ممتاز</th>
        <th style="border: 1px solid #cbd5e1;">ج.جداً</th>
        <th style="border: 1px solid #cbd5e1;">جيد</th>
        <th style="border: 1px solid #cbd5e1;">يعيد</th>
        <th style="border: 1px solid #cbd5e1;">ممتاز</th>
        <th style="border: 1px solid #cbd5e1;">ج.جداً</th>
        <th style="border: 1px solid #cbd5e1;">جيد</th>
        <th style="border: 1px solid #cbd5e1;">يعيد</th>
      </tr>
    `;

    let students = (window.appStore.students || []).filter(
      (s) => s.status !== "pending",
    );
    if (circleId !== "all")
      students = students.filter((s) => s.circleId === circleId);
    if (selectedStudentId !== "all")
      students = students.filter((s) => s.id === selectedStudentId);

    if (students.length === 0) {
      bodyHtml =
        '<tr><td colspan="17" class="text-center text-muted p-4">لا توجد بيانات مطابقة</td></tr>';
    } else {
      students.forEach((s, idx) => {
        let stuAtt = (window.appStore.attendance || []).filter(
          (a) => a.studentId === s.id,
        );
        if (dateFrom) stuAtt = stuAtt.filter((a) => a.date >= dateFrom);
        if (dateTo) stuAtt = stuAtt.filter((a) => a.date <= dateTo);

        const presentCount = stuAtt.filter(
          (a) => a.status === "present" || a.status === "late",
        ).length;
        const absentCount = stuAtt.filter((a) => a.status === "absent").length;

        let stuTasmeea = (window.appStore.tasmeea || []).filter(
          (t) => t.studentId === s.id,
        );
        if (dateFrom) stuTasmeea = stuTasmeea.filter((t) => t.date >= dateFrom);
        if (dateTo) stuTasmeea = stuTasmeea.filter((t) => t.date <= dateTo);

        const countRating = (records, field, type) => {
          return records.filter((r) => {
            const val = (r[field] || "").trim();
            if (type === "ممتاز") return val.includes("ممتاز");
            if (type === "جيد جداً") return val.includes("جيد جداً");
            if (type === "جيد") return val === "جيد" || val === "جيد مرتفع";
            if (type === "يعيد")
              return val === "يعيد" || val === "إعادة" || val === "ضعيف";
            return false;
          }).length;
        };

        let tamayuzCount = 0;
        for (let w = 0; w < 16; w++) {
          if (
            typeof checkStudentCurrentWeekTamayuz === "function" &&
            checkStudentCurrentWeekTamayuz(s.id, w)
          ) {
            tamayuzCount++;
          }
        }

        bodyHtml += `
          <tr style="border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 0.85rem;">
            <td style="padding: 6px;">${idx + 1}</td>
            <td style="padding: 6px; font-weight:700; text-align: right;">${s.name}</td>
            <td style="padding: 6px; font-weight:700; color: #2e7d32;">${presentCount}</td>
            <td style="padding: 6px; font-weight:700; color: #c62828;">${absentCount}</td>
            <td style="padding: 6px; font-weight:800; color: var(--primary-brown);">${tamayuzCount}</td>
            <td>${countRating(stuTasmeea, "hifzRating", "ممتاز")}</td>
            <td>${countRating(stuTasmeea, "hifzRating", "جيد جداً")}</td>
            <td>${countRating(stuTasmeea, "hifzRating", "جيد")}</td>
            <td>${countRating(stuTasmeea, "hifzRating", "يعيد")}</td>
            <td>${countRating(stuTasmeea, "murajaaRating", "ممتاز")}</td>
            <td>${countRating(stuTasmeea, "murajaaRating", "جيد جداً")}</td>
            <td>${countRating(stuTasmeea, "murajaaRating", "جيد")}</td>
            <td>${countRating(stuTasmeea, "murajaaRating", "يعيد")}</td>
            <td>${countRating(stuTasmeea, "tilawaRating", "ممتاز")}</td>
            <td>${countRating(stuTasmeea, "tilawaRating", "جيد جداً")}</td>
            <td>${countRating(stuTasmeea, "tilawaRating", "جيد")}</td>
            <td>${countRating(stuTasmeea, "tilawaRating", "يعيد")}</td>
          </tr>
        `;
      });
    }
  }

  // 3. تقرير التميز الأسبوعي
  else if (reportType === "tamayuz") {
    printTitleText = "تقرير التميز الأسبوعي (عدد بطاقات التميز المعتمدة)";
    if (printTitle) printTitle.textContent = printTitleText;
    if (printPeriod) {
      printPeriod.textContent =
        weekFrom === weekTo
          ? `الأسبوع ${weekFrom}`
          : `من الأسبوع ${weekFrom} إلى الأسبوع ${weekTo}`;
      printPeriod.style.display = "block";
    }

    headHtml = `
      <tr style="background: #0a5c71; color: #ffffff;">
        <th style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">اسم الطالب المتميز</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #cbd5e1;">مرات التميز الأسبوعية</th>
      </tr>
    `;

    let students = (window.appStore.students || []).filter(
      (s) => s.status === "active",
    );
    if (circleId !== "all")
      students = students.filter((s) => s.circleId === circleId);
    if (selectedStudentId !== "all")
      students = students.filter((s) => s.id === selectedStudentId);

    const weekFromNum = parseInt(weekFrom, 10) || getCurrentTamayuzWeekNumber();
    const weekToNum = parseInt(weekTo, 10) || getCurrentTamayuzWeekNumber();
    const selectedWeeks = [];
    for (
      let n = Math.min(weekFromNum, weekToNum);
      n <= Math.max(weekFromNum, weekToNum);
      n++
    ) {
      selectedWeeks.push(n);
    }

    const isCleanMumtazOrEmpty = (r) => {
      if (!r) return true;
      const clean = String(r).trim();
      return (
        clean === "" ||
        clean === "—" ||
        clean === "-" ||
        clean === "لا يوجد" ||
        clean.includes("ممتاز")
      );
    };

    const studentBadgesCount = [];
    students.forEach((s) => {
      let badgesSum = 0;
      selectedWeeks.forEach((wk) => {
        const weekDays = getSundayToWednesdayDatesByWeekOption(wk);
        if (!weekDays || weekDays.length !== 4) return;
        let isQualified = true;
        for (const day of weekDays) {
          const att = (window.appStore?.attendance || []).find(
            (a) => a.studentId === s.id && a.date === day,
          );
          if (!att || (att.status !== "present" && att.status !== "late")) {
            isQualified = false;
            break;
          }
          const tasm = (window.appStore?.tasmeea || []).find(
            (t) => t.studentId === s.id && t.date === day,
          );
          if (tasm) {
            if (
              !isCleanMumtazOrEmpty(tasm.hifzRating) ||
              !isCleanMumtazOrEmpty(tasm.murajaaRating) ||
              !isCleanMumtazOrEmpty(tasm.tilawaRating) ||
              !isCleanMumtazOrEmpty(tasm.rating)
            ) {
              isQualified = false;
              break;
            }
          }
        }
        if (isQualified) badgesSum++;
      });
      if (badgesSum > 0)
        studentBadgesCount.push({ student: s, count: badgesSum });
    });

    if (studentBadgesCount.length === 0) {
      bodyHtml =
        '<tr><td colspan="2" class="text-center text-muted p-4">لا توجد بطاقات تميز مسجلة للطلاب في هذا النطاق</td></tr>';
    } else {
      studentBadgesCount.forEach((item) => {
        bodyHtml += `
          <tr style="border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 0.9rem;">
            <td style="padding: 8px; font-weight: 800; text-align: right;">⭐ ${item.student.name}</td>
            <td style="padding: 8px; font-weight: 900; color: #0a5c71;">🎖️ ${item.count} بطاقات</td>
          </tr>
        `;
      });
    }
  }

  // إظهار الصندوق وتطبيق الهيكل الرسمي الموحّد (نفس الترويسة/التذييل بكل التقارير)
  if (wrapper) {
    wrapper.style.display = "block";
    // يُحفظ عنوان التقرير هنا لأن wrapper.innerHTML سيُستبدل بالكامل بعد قليل،
    // فلا يعود بالإمكان قراءته لاحقاً عبر عنصر #print-report-title القديم
    wrapper.dataset.reportTitle = printTitleText;

    const chrome =
      typeof buildOfficialPrintChrome === "function"
        ? buildOfficialPrintChrome(printTitleText, selectedCircleName)
        : { header: "", footer: "" };

    wrapper.innerHTML = `
      <div style="border: 2.5px double #0a5c71; border-radius: 8px; padding: 1.5rem; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05); margin-top: 1rem;">

        ${chrome.header}

        <!-- جدول البيانات المؤطر الفخم -->
        <div class="table-responsive" style="margin-bottom: 1.5rem;">
          <table class="data-table" id="report-results-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #0a5c71;">
            <thead id="report-thead">${headHtml}</thead>
            <tbody id="report-tbody">${bodyHtml}</tbody>
          </table>
        </div>

        ${chrome.footer}

      </div>
    `;
  }
}

// تنزيل Excel مباشر وفوري على الجهاز
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
  XLSX.writeFile(
    wb,
    `تقرير_المجمع_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}

// تنزيل PDF مباشر وفوري على الجهاز دون فتح نوافذ
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

  if (typeof html2pdf !== "undefined") {
    const opt = {
      margin: [6, 6, 6, 6],
      filename: `${reportTitle.trim().replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };
    html2pdf().set(opt).from(element).save();
  } else {
    printOfficialReport();
  }
}

// الطباعة التفاعلية تتيح تحديد الألوان، عدد النسخ، والاتجاه بحرية
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

  const reportTitle = wrapper.dataset.reportTitle || "تقرير المَجْمَع القرآني";

  const printCircleId = document.getElementById("report-circle-select")?.value;
  const printCircleName =
    (window.appStore?.circles || []).find((c) => c.id === printCircleId)
      ?.name || "";
  const chrome =
    typeof buildOfficialPrintChrome === "function"
      ? buildOfficialPrintChrome(reportTitle, printCircleName)
      : { header: "", footer: "" };
  const reportTable = wrapper.querySelector("#report-results-table");
  const reportTableHtml =
    reportTable && typeof buildRepeatingHeaderTableHtml === "function"
      ? buildRepeatingHeaderTableHtml(reportTable, chrome.header)
      : chrome.header + (reportTable ? reportTable.outerHTML : "");

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <title>${reportTitle}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: 'Cairo', 'Tajawal', sans-serif;
            direction: rtl;
            padding: 15px;
            background: #fff;
            color: #000;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 11px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px 4px;
            text-align: center;
          }
          th {
            background-color: #0a5c71 !important;
            color: #ffffff !important;
            font-weight: bold;
          }
          .no-print, button {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${reportTableHtml}
        ${chrome.footer}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350);
}
