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

// تعبئة قوائم نطاق أسابيع التميز (من - إلى)
function populateReportWeekRangeDropdowns() {
  const weekFromSelect = document.getElementById("report-week-from");
  const weekToSelect = document.getElementById("report-week-to");
  if (!weekFromSelect || !weekToSelect) return;

  const weekOptions = [
    { id: "current", label: "الأسبوع الحالي" },
    { id: "w_1", label: "الأسبوع السابق (1)" },
    { id: "w_2", label: "الأسبوع السابق (2)" },
    { id: "w_3", label: "الأسبوع السابق (3)" },
    { id: "w_4", label: "الأسبوع السابق (4)" },
  ];

  let optionsHtml = "";
  weekOptions.forEach((w) => {
    optionsHtml += `<option value="${w.id}">${w.label}</option>`;
  });

  weekFromSelect.innerHTML = optionsHtml;
  weekToSelect.innerHTML = optionsHtml;
  weekToSelect.value = "current";
  weekFromSelect.value = "w_4";
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

function getSundayToWednesdayDatesByWeekOption(weekOption) {
  const now = new Date();
  const dayOfWeek = now.getDay();

  let offsetWeeks = 0;
  if (weekOption === "w_1") offsetWeeks = 1;
  else if (weekOption === "w_2") offsetWeeks = 2;
  else if (weekOption === "w_3") offsetWeeks = 3;
  else if (weekOption === "w_4") offsetWeeks = 4;

  const sunday = new Date(now);
  sunday.setDate(now.getDate() - dayOfWeek - offsetWeeks * 7);

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
  const weekFrom = document.getElementById("report-week-from")?.value || "w_4";
  const weekTo = document.getElementById("report-week-to")?.value || "current";

  const wrapper = document.getElementById("report-results-wrapper");
  const thead = document.getElementById("report-thead");
  const tbody = document.getElementById("report-tbody");
  const printTitle = document.getElementById("print-report-title");
  const printPeriod = document.getElementById("print-report-period");

  if (!thead || !tbody) return;

  const now = new Date();
  const currentDateFormatted = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
  const currentTimeFormatted = now.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let headHtml = "";
  let bodyHtml = "";
  let studentDailyHeaderInfo = null;

  // 1. تقرير إنجاز الطالب اليومي
  if (reportType === "student_achievement" || reportType === "tasmeea") {
    const targetDateLabel =
      dateTo || dateFrom || new Date().toISOString().split("T")[0];
    const targetDateObj = new Date(targetDateLabel + "T00:00:00");
    const targetDayName = targetDateObj.toLocaleDateString("ar-SA", {
      weekday: "long",
    });
    const targetDateDisplay = targetDateObj.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    studentDailyHeaderInfo = { targetDayName, targetDateDisplay };

    if (printTitle) printTitle.textContent = "إنجاز الطالب اليومي";
    if (printPeriod) {
      printPeriod.textContent = "";
      printPeriod.style.display = "none";
    }

    headHtml = `
      <tr style="background: #1a365d; color: #ffffff;">
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">الطالب</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">الحلقة</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">الحضور</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">مقرر الدرس</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">مقرر المراجعة</th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 0.92rem;">مقرر التلاوة</th>
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
        '<tr><td colspan="6" class="text-center text-muted p-4">لا توجد بيانات مطابقة للطلاب</td></tr>';
    } else {
      students.forEach((s) => {
        const circle = (window.appStore.circles || []).find(
          (c) => c.id === s.circleId,
        );
        const circleName = circle ? circle.name : "حلقة عامة";

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
        const todayTasm = allTasm.find((t) => t.date === targetDateLabel);

        const hifzDisplay =
          todayTasm && todayTasm.hifzSurah
            ? `${todayTasm.hifzSurah} (${todayTasm.hifzRating || "—"})`
            : "—";
        const murajaaDisplay =
          todayTasm && todayTasm.murajaaSurah
            ? `${todayTasm.murajaaSurah} (${todayTasm.murajaaRating || "—"})`
            : "—";
        const tilawaDisplay =
          todayTasm && todayTasm.tilawaSurah
            ? `${todayTasm.tilawaSurah} (${todayTasm.tilawaRating || "—"})`
            : "—";

        bodyHtml += `
          <tr style="border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 0.88rem;">
            <td style="padding: 8px; font-weight: 800; color: #1e293b; text-align: right;">${s.name}</td>
            <td style="padding: 8px; color: #334155;">${circleName}</td>
            <td style="padding: 8px;">${attStatusText}</td>
            <td style="padding: 8px; color: #334155;">${hifzDisplay}</td>
            <td style="padding: 8px; color: #334155;">${murajaaDisplay}</td>
            <td style="padding: 8px; color: #334155;">${tilawaDisplay}</td>
          </tr>
        `;
      });
    }
  }

  // 2. التقرير الإحصائي الشامل للطلاب
  else if (reportType === "students") {
    if (printTitle)
      printTitle.textContent =
        "التقرير الإحصائي الشامل للطلاب (أعداد الإنجاز والحضور)";
    if (printPeriod) {
      printPeriod.textContent =
        dateFrom && dateTo
          ? `الفترة: من تاريخ ${dateFrom} إلى تاريخ ${dateTo}`
          : "كامل الفترة المسجلة";
      printPeriod.style.display = "block";
    }

    headHtml = `
      <tr style="background: #1a365d; color: #ffffff;">
        <th rowspan="2" style="vertical-align: middle; text-align: center; border: 1px solid #cbd5e1;">م</th>
        <th rowspan="2" style="vertical-align: middle; border: 1px solid #cbd5e1;">اسم الطالب</th>
        <th rowspan="2" style="vertical-align: middle; text-align: center; border: 1px solid #cbd5e1;">أيام الحضور</th>
        <th rowspan="2" style="vertical-align: middle; text-align: center; border: 1px solid #cbd5e1;">أيام الغياب</th>
        <th rowspan="2" style="vertical-align: middle; text-align: center; border: 1px solid #cbd5e1;">مرات التميز</th>
        <th colspan="4" style="text-align: center; border: 1px solid #cbd5e1;">الدرس الجديد</th>
        <th colspan="4" style="text-align: center; border: 1px solid #cbd5e1;">المراجعة</th>
        <th colspan="4" style="text-align: center; border: 1px solid #cbd5e1;">التلاوة</th>
      </tr>
      <tr style="background: #2b4c7e; color: #ffffff; font-size: 0.8rem;">
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
    if (printTitle)
      printTitle.textContent =
        "تقرير التميز الأسبوعي (عدد بطاقات التميز المعتمدة)";
    if (printPeriod) {
      printPeriod.textContent = `نطاق الأسابيع (من ${weekFrom} إلى ${weekTo})`;
      printPeriod.style.display = "block";
    }

    headHtml = `
      <tr style="background: #1a365d; color: #ffffff;">
        <th style="padding: 10px; width: 60px; text-align: center; border: 1px solid #cbd5e1;">م</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">اسم الطالب المتميز</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #cbd5e1;">الحلقة</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #cbd5e1;">عدد بطاقات التميز</th>
      </tr>
    `;

    let students = (window.appStore.students || []).filter(
      (s) => s.status === "active",
    );
    if (circleId !== "all")
      students = students.filter((s) => s.circleId === circleId);
    if (selectedStudentId !== "all")
      students = students.filter((s) => s.id === selectedStudentId);

    const allWeekKeys = ["w_4", "w_3", "w_2", "w_1", "current"];
    const startIdx = allWeekKeys.indexOf(weekFrom);
    const endIdx = allWeekKeys.indexOf(weekTo);
    const selectedWeeks =
      startIdx > -1 && endIdx >= startIdx
        ? allWeekKeys.slice(startIdx, endIdx + 1)
        : ["current"];

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
        '<tr><td colspan="4" class="text-center text-muted p-4">لا توجد بطاقات تميز مسجلة للطلاب في هذا النطاق</td></tr>';
    } else {
      studentBadgesCount.forEach((item, idx) => {
        const circle = (window.appStore?.circles || []).find(
          (c) => c.id === item.student.circleId,
        );
        bodyHtml += `
          <tr style="border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 0.9rem;">
            <td style="padding: 8px;">${idx + 1}</td>
            <td style="padding: 8px; font-weight: 800; text-align: right;">⭐ ${item.student.name}</td>
            <td style="padding: 8px;">${circle ? circle.name : "جامع الهدى"}</td>
            <td style="padding: 8px; font-weight: 900; color: #1a365d;">🎖️ ${item.count} بطاقات</td>
          </tr>
        `;
      });
    }
  }

  // إظهار الصندوق وتطبيق الهيكل الملكي الفاخر كاملاً
  if (wrapper) {
    wrapper.style.display = "block";

    let headerSectionHtml = "";
    let footerSectionHtml = "";

    if (studentDailyHeaderInfo) {
      // ترويسة وتذييل خاصان بتقرير (إنجاز الطالب اليومي) فقط - دون التأثير على باقي التقارير
      headerSectionHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a365d; padding-bottom: 0.8rem; margin-bottom: 1rem;">
          <div style="width: 100px; text-align: right;">
            <img src="report_logo_right.png" alt="شعار المَجْمَع" style="height: 65px; width: auto; object-fit: contain;" />
          </div>
          <div style="text-align: center; flex: 1;">
            <h2 style="margin: 3px 0; font-size: 1.35rem; font-weight: 900; color: #1a365d;">مَجْمَع عبدالله بن مهدي القرآني</h2>
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #334155;">جامع الهدى</h4>
          </div>
          <div style="width: 100px; text-align: left;">
            <img src="report_logo_left.png" alt="شعار المَجْمَع" style="height: 60px; width: auto; object-fit: contain;" />
          </div>
        </div>

        <!-- صندوق العنوان: اليوم يمين، العنوان بالمنتصف، التاريخ يسار -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <div style="width: 100px; text-align: right; font-weight: 800; color: #1a365d; font-size: 0.95rem;">
            ${studentDailyHeaderInfo.targetDayName}
          </div>
          <div style="display: inline-block; border: 2px solid #1a365d; border-radius: 6px; padding: 0.4rem 1.8rem; background: #f8fafc;">
            <h3 id="print-report-title" style="margin: 0; font-size: 1.15rem; font-weight: 900; color: #1a365d;">
              ${printTitle ? printTitle.textContent : "إنجاز الطالب اليومي"}
            </h3>
          </div>
          <div style="width: 100px; text-align: left; font-weight: 800; color: #1a365d; font-size: 0.95rem;">
            ${studentDailyHeaderInfo.targetDateDisplay}
          </div>
        </div>
      `;

      footerSectionHtml = `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1.5px solid #cbd5e1; padding-top: 1rem; margin-top: 1.5rem; font-size: 0.9rem;">
          <div style="text-align: right;">
            <strong style="color: #1a365d;">المنصّة الإلكترونيّة للمَجْمَع القرآنيّ</strong>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: 800; color: #1a365d;">مدير المَجْمَع القرآنيّ</div>
            <div style="font-weight: 900; color: #334155;">أحمد بن عبدالله ال مهدي</div>
          </div>
        </div>
      `;
    } else {
      // الترويسة والتذييل الأصليان (بدون أي تغيير) لباقي أنواع التقارير
      headerSectionHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a365d; padding-bottom: 0.8rem; margin-bottom: 1rem;">
          <div style="width: 100px; text-align: right;">
            <img src="logo12.jpeg" alt="شعار المَجْمَع" style="height: 65px; width: auto; object-fit: contain;" />
          </div>
          <div style="text-align: center; flex: 1;">
            <h4 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: #475569;">المملكة العربية السعودية</h4>
            <h2 style="margin: 3px 0; font-size: 1.35rem; font-weight: 900; color: #1a365d;">مَجْمَع عبدالله بن مهدي القرآني</h2>
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #334155;">جامع الهدى</h4>
            <div style="margin-top: 4px; font-size: 0.78rem; color: #64748b; font-weight: 600;">
              تاريخ التقرير: ${currentDateFormatted} | الوقت: ${currentTimeFormatted}
            </div>
          </div>
          <div style="width: 100px; text-align: left;">
            <img src="logo_transparent_1.png" alt="شعار المَجْمَع" style="height: 60px; width: auto; object-fit: contain;" />
          </div>
        </div>

        <!-- صندوق العنوان المؤطر في المنتصف -->
        <div style="text-align: center; margin-bottom: 1.25rem;">
          <div style="display: inline-block; border: 2px solid #1a365d; border-radius: 6px; padding: 0.4rem 1.8rem; background: #f8fafc;">
            <h3 id="print-report-title" style="margin: 0; font-size: 1.15rem; font-weight: 900; color: #1a365d;">
              ${printTitle ? printTitle.textContent : "تقرير رسمي"}
            </h3>
            <p id="print-report-period" style="margin: 3px 0 0 0; font-size: 0.82rem; font-weight: 700; color: #475569;">
              ${printPeriod ? printPeriod.textContent : ""}
            </p>
          </div>
        </div>
      `;

      footerSectionHtml = `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1.5px solid #cbd5e1; padding-top: 1rem; margin-top: 1.5rem; font-size: 0.9rem;">
          <div style="text-align: right;">
            <strong style="color: #1a365d;">نظام إدارة الحلقات القرآني</strong>
          </div>
          <div style="text-align: center; color: #64748b; font-size: 0.82rem;">
            صفحة 1 / 1
          </div>
          <div style="text-align: left;">
            <div style="font-weight: 900; color: #334155;">احمد بن عبدالله ال مهدي</div>
          </div>
        </div>
      `;
    }

    wrapper.innerHTML = `
      <div style="border: 2.5px double #1a365d; border-radius: 8px; padding: 1.5rem; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05); margin-top: 1rem;">

        ${headerSectionHtml}

        <!-- جدول البيانات المؤطر الفخم -->
        <div class="table-responsive" style="margin-bottom: 1.5rem;">
          <table class="data-table" id="report-results-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #1a365d;">
            <thead id="report-thead">${headHtml}</thead>
            <tbody id="report-tbody">${bodyHtml}</tbody>
          </table>
        </div>

        ${footerSectionHtml}

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
  const wb = XLSX.utils.table_to_book(table, { sheet: "التقرير الرسمي" });
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

  const reportTitle =
    document.getElementById("print-report-title")?.textContent ||
    "تقرير_المجمع_الرسمي";

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

  const reportTitle =
    document.getElementById("print-report-title")?.textContent ||
    "تقرير المَجْمَع الرسمي";

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
            background-color: #1a365d !important;
            color: #ffffff !important;
            font-weight: bold;
          }
          .no-print, button {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${wrapper.innerHTML}
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
