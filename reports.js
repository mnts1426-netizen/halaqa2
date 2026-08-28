/**
 * ==========================================================================
 * reports.js - محرك التقارير الشاملة الرقمية، إنجاز طالب، والتميز الأسبوعي
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

  const currentVal = studentSelect.value || "all";
  let students = (window.appStore.students || []).filter(
    (s) => s.status === "active",
  );

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
      '<tr><td class="text-center text-muted p-4">حدد خيارات التقرير ثم اضغط على "استخراج التقرير"</td></tr>';
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

  const thead = document.getElementById("report-thead");
  const tbody = document.getElementById("report-tbody");
  const printTitle = document.getElementById("print-report-title");
  const printPeriod = document.getElementById("print-report-period");

  if (!thead || !tbody) return;

  let headHtml = "";
  let bodyHtml = "";

  // 1. تقرير إنجاز طالب (تم استبدال مسمى الحفظ بـ الدرس الجديد)
  if (reportType === "student_achievement") {
    if (printTitle) printTitle.textContent = "تقرير إنجاز طالب";

    if (printPeriod) {
      if (dateFrom && dateTo) {
        printPeriod.textContent = `الفترة: من تاريخ ${dateFrom} إلى تاريخ ${dateTo}`;
      } else if (dateFrom) {
        printPeriod.textContent = `من تاريخ: ${dateFrom}`;
      } else if (dateTo) {
        printPeriod.textContent = `إلى تاريخ: ${dateTo}`;
      } else {
        printPeriod.textContent = "كامل الفترة المسجلة";
      }
      printPeriod.style.display = "block";
    }

    headHtml = `
      <tr>
        <th style="width: 50px; text-align: center;">م</th>
        <th>اسم الطالب</th>
        <th>الحلقة</th>
        <th>الدرس الجديد</th>
        <th>المراجعة</th>
        <th>التلاوة</th>
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
      students.forEach((s, idx) => {
        const circle = (window.appStore.circles || []).find(
          (c) => c.id === s.circleId,
        );
        const circleName = circle ? circle.name : "غير مسجل";

        let records = (window.appStore.tasmeea || []).filter(
          (t) => t.studentId === s.id,
        );
        if (dateFrom) records = records.filter((t) => t.date >= dateFrom);
        if (dateTo) records = records.filter((t) => t.date <= dateTo);
        records.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

        const formatBranchSpan = (fieldSurah) => {
          const validRecords = records.filter((r) => r[fieldSurah]);
          if (validRecords.length === 0)
            return '<span class="text-muted">—</span>';

          const first = validRecords[0];
          const last = validRecords[validRecords.length - 1];

          if (
            validRecords.length === 1 ||
            first[fieldSurah] === last[fieldSurah]
          ) {
            return `<strong>${first[fieldSurah]}</strong>`;
          }

          return `من: <strong>${first[fieldSurah]}</strong><br>إلى: <strong>${last[fieldSurah]}</strong>`;
        };

        const hifzSpan = formatBranchSpan("hifzSurah");
        const murajaaSpan = formatBranchSpan("murajaaSurah");
        const tilawaSpan = formatBranchSpan("tilawaSurah");

        bodyHtml += `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-weight: 800;">${s.name}</td>
            <td><span style="font-weight: 600; color: var(--text-dark);">${circleName}</span></td>
            <td style="line-height: 1.5;">${hifzSpan}</td>
            <td style="line-height: 1.5;">${murajaaSpan}</td>
            <td style="line-height: 1.5;">${tilawaSpan}</td>
          </tr>
        `;
      });
    }
  }

  // 2. التقرير الإحصائي الشامل للطلاب (تم استبدال مسمى الحفظ بـ الدرس الجديد)
  else if (reportType === "students") {
    if (printTitle)
      printTitle.textContent =
        "التقرير الإحصائي الشامل للطلاب (أعداد الإنجاز والحضور)";

    if (printPeriod) {
      if (dateFrom && dateTo) {
        printPeriod.textContent = `الفترة: من تاريخ ${dateFrom} إلى تاريخ ${dateTo}`;
      } else if (dateFrom) {
        printPeriod.textContent = `من تاريخ: ${dateFrom}`;
      } else if (dateTo) {
        printPeriod.textContent = `إلى تاريخ: ${dateTo}`;
      } else {
        printPeriod.textContent = "كامل الفترة المسجلة";
      }
      printPeriod.style.display = "block";
    }

    headHtml = `
      <tr>
        <th rowspan="2" style="vertical-align: middle; text-align: center;">م</th>
        <th rowspan="2" style="vertical-align: middle;">اسم الطالب</th>
        <th rowspan="2" style="vertical-align: middle; text-align: center; line-height: 1.2;">أيام<br>الحضور</th>
        <th rowspan="2" style="vertical-align: middle; text-align: center; line-height: 1.2;">أيام<br>الغياب</th>
        <th rowspan="2" style="vertical-align: middle; text-align: center; line-height: 1.2;">مرات<br>التميز</th>
        <th colspan="4" class="text-center">الدرس الجديد</th>
        <th colspan="4" class="text-center">المراجعة</th>
        <th colspan="4" class="text-center">التلاوة</th>
      </tr>
      <tr>
        <th>ممتاز</th>
        <th>جيد جداً</th>
        <th>جيد</th>
        <th>يعيد</th>
        <th>ممتاز</th>
        <th>جيد جداً</th>
        <th>جيد</th>
        <th>يعيد</th>
        <th>ممتاز</th>
        <th>جيد جداً</th>
        <th>جيد</th>
        <th>يعيد</th>
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
        '<tr><td colspan="17" class="text-center text-muted p-4">لا توجد بيانات مطابقة</td></tr>';
    } else {
      students.forEach((s, idx) => {
        let stuAtt = (window.appStore.attendance || []).filter(
          (a) => a.studentId === s.id,
        );
        if (dateFrom) stuAtt = stuAtt.filter((a) => a.date >= dateFrom);
        if (dateTo) stuAtt = stuAtt.filter((a) => a.date <= dateTo);

        const presentCount = stuAtt.filter(
          (a) => a.status === "present",
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

        const hifzMumtaz = countRating(stuTasmeea, "hifzRating", "ممتاز");
        const hifzJayyidJiddan = countRating(
          stuTasmeea,
          "hifzRating",
          "جيد جداً",
        );
        const hifzJayyid = countRating(stuTasmeea, "hifzRating", "جيد");
        const hifzRe = countRating(stuTasmeea, "hifzRating", "يعيد");

        const murajaaMumtaz = countRating(stuTasmeea, "murajaaRating", "ممتاز");
        const murajaaJayyidJiddan = countRating(
          stuTasmeea,
          "murajaaRating",
          "جيد جداً",
        );
        const murajaaJayyid = countRating(stuTasmeea, "murajaaRating", "جيد");
        const murajaaRe = countRating(stuTasmeea, "murajaaRating", "يعيد");

        const tilawaMumtaz = countRating(stuTasmeea, "tilawaRating", "ممتاز");
        const tilawaJayyidJiddan = countRating(
          stuTasmeea,
          "tilawaRating",
          "جيد جداً",
        );
        const tilawaJayyid = countRating(stuTasmeea, "tilawaRating", "جيد");
        const tilawaRe = countRating(stuTasmeea, "tilawaRating", "يعيد");

        const tamayuzCount = stuTasmeea.filter(
          (t) =>
            (t.rating || "").includes("ممتاز") ||
            (t.hifzRating || "").includes("ممتاز"),
        ).length;

        bodyHtml += `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-weight:700;">${s.name}</td>
            <td style="font-weight:700; color: #2e7d32; text-align: center;">${presentCount}</td>
            <td style="font-weight:700; color: #c62828; text-align: center;">${absentCount}</td>
            <td style="font-weight:700; color: var(--primary-brown); text-align: center;">${tamayuzCount}</td>
            
            <td>${hifzMumtaz}</td>
            <td>${hifzJayyidJiddan}</td>
            <td>${hifzJayyid}</td>
            <td>${hifzRe}</td>

            <td>${murajaaMumtaz}</td>
            <td>${murajaaJayyidJiddan}</td>
            <td>${murajaaJayyid}</td>
            <td>${murajaaRe}</td>

            <td>${tilawaMumtaz}</td>
            <td>${tilawaJayyidJiddan}</td>
            <td>${tilawaJayyid}</td>
            <td>${tilawaRe}</td>
          </tr>
        `;
      });
    }
  }

  // 3. تقرير سجل التسميع اليومي (تم استبدال مسمى الحفظ بـ الدرس الجديد)
  else if (reportType === "tasmeea") {
    if (printTitle)
      printTitle.textContent = "تقرير إنجاز وسجل التسميع والدرس الجديد";

    if (printPeriod) {
      if (dateFrom && dateTo) {
        printPeriod.textContent = `الفترة: من تاريخ ${dateFrom} إلى تاريخ ${dateTo}`;
      } else if (dateFrom) {
        printPeriod.textContent = `من تاريخ: ${dateFrom}`;
      } else if (dateTo) {
        printPeriod.textContent = `إلى تاريخ: ${dateTo}`;
      } else {
        printPeriod.textContent = "كامل الفترة المسجلة";
      }
      printPeriod.style.display = "block";
    }

    headHtml = `
      <tr>
        <th style="width: 50px; text-align: center;">م</th>
        <th>اسم الطالب</th>
        <th>الدرس الجديد</th>
        <th>المراجعة</th>
        <th>التلاوة</th>
        <th>التقدير</th>
        <th>ملاحظة المعلم</th>
      </tr>
    `;

    let records = window.appStore.tasmeea || [];
    if (circleId !== "all")
      records = records.filter((r) => r.circleId === circleId);
    if (selectedStudentId !== "all")
      records = records.filter((r) => r.studentId === selectedStudentId);
    if (dateFrom) records = records.filter((r) => r.date >= dateFrom);
    if (dateTo) records = records.filter((r) => r.date <= dateTo);

    if (records.length === 0) {
      bodyHtml =
        '<tr><td colspan="7" class="text-center text-muted p-4">لا توجد سجلات تسميع في هذه الفترة</td></tr>';
    } else {
      records.forEach((t, idx) => {
        const student = (window.appStore.students || []).find(
          (s) => s.id === t.studentId,
        );
        bodyHtml += `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-weight:700;">${student ? student.name : "طالب"}</td>
            <td>${t.hifzSurah || "—"}</td>
            <td>${t.murajaaSurah || "—"}</td>
            <td>${t.tilawaSurah || "—"}</td>
            <td>${t.rating || t.hifzRating || "—"}</td>
            <td>${t.studentNotes || "—"}</td>
          </tr>
        `;
      });
    }
  }

  // 4. تقرير التميز الأسبوعي
  else if (reportType === "tamayuz") {
    if (printTitle)
      printTitle.textContent = "تقرير التميز الأسبوعي (عدد بطاقات التميز)";

    if (printPeriod) {
      printPeriod.textContent = `نطاق الأسابيع (من الأسبوع ${weekFrom} إلى الأسبوع ${weekTo})`;
      printPeriod.style.display = "block";
    }

    headHtml = `
      <tr>
        <th style="width: 60px; text-align: center;">م</th>
        <th>اسم الطالب</th>
        <th>الحلقة</th>
        <th style="text-align: center;">عدد بطاقات التميز</th>
      </tr>
    `;

    let students = (window.appStore.students || []).filter(
      (s) => s.status === "active",
    );

    if (circleId !== "all") {
      students = students.filter((s) => s.circleId === circleId);
    }
    if (selectedStudentId !== "all") {
      students = students.filter((s) => s.id === selectedStudentId);
    }

    const allWeekKeys = ["w_4", "w_3", "w_2", "w_1", "current"];
    const startIdx = allWeekKeys.indexOf(weekFrom);
    const endIdx = allWeekKeys.indexOf(weekTo);
    const selectedWeeks =
      startIdx > -1 && endIdx >= startIdx
        ? allWeekKeys.slice(startIdx, endIdx + 1)
        : ["current"];

    const isDisqualifying = (r) => {
      if (!r) return false;
      const clean = r.trim();
      if (clean === "" || clean === "—" || clean === "لا يوجد") return false;
      return !clean.includes("ممتاز");
    };

    const studentBadgesCount = [];

    students.forEach((s) => {
      let badgesSum = 0;

      selectedWeeks.forEach((wk) => {
        const weekDays = getSundayToWednesdayDatesByWeekOption(wk);
        let attendedCount = 0;
        let hasDisqualifyingRating = false;

        for (const day of weekDays) {
          const att = (window.appStore?.attendance || []).find(
            (a) => a.studentId === s.id && a.date === day,
          );
          if (att && (att.status === "present" || att.status === "late")) {
            attendedCount++;
          } else if (att && att.status === "absent") {
            hasDisqualifyingRating = true;
          }

          const tasm = (window.appStore?.tasmeea || []).find(
            (t) => t.studentId === s.id && t.date === day,
          );
          if (tasm) {
            if (
              isDisqualifying(tasm.hifzRating) ||
              isDisqualifying(tasm.murajaaRating) ||
              isDisqualifying(tasm.tilawaRating) ||
              isDisqualifying(tasm.rating)
            ) {
              hasDisqualifyingRating = true;
            }
          }
        }

        if (attendedCount === 4 && !hasDisqualifyingRating) {
          badgesSum++;
        }
      });

      if (badgesSum > 0) {
        studentBadgesCount.push({ student: s, count: badgesSum });
      }
    });

    if (studentBadgesCount.length === 0) {
      bodyHtml =
        '<tr><td colspan="4" class="text-center text-muted p-4">لا توجد بطاقات تميز مسجلة للطلاب في نطاق الأسابيع المحدد</td></tr>';
    } else {
      studentBadgesCount.forEach((item, idx) => {
        const circle = (window.appStore?.circles || []).find(
          (c) => c.id === item.student.circleId,
        );
        const circleName = circle ? circle.name : "حلقات جامع الهدى";

        bodyHtml += `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-weight: 800;">⭐ ${item.student.name}</td>
            <td><span style="font-weight: 600; color: var(--text-dark);">${circleName}</span></td>
            <td style="text-align: center; font-weight: 900; color: var(--primary-brown); font-size: 1.05rem;">
              🎖️ ${item.count} بطاقات
            </td>
          </tr>
        `;
      });
    }
  }

  thead.innerHTML = headHtml;
  tbody.innerHTML = bodyHtml;
}

function exportReportExcel() {
  const table = document.getElementById("report-results-table");
  if (!table || table.rows.length <= 1) {
    alert("⚠️ لا توجد بيانات في التقرير لتصديرها!");
    return;
  }
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "التقرير الرسمي" });
  XLSX.writeFile(
    wb,
    `تقرير_التميز_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}

function printOfficialReport() {
  window.print();
}

function downloadReportPDF() {
  printOfficialReport();
}
