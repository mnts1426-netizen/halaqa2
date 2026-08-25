/**
 * ==========================================================================
 * reports.js - محرك التقارير الشاملة الرقمية، إنجاز طالب، ولوحة المتميزين الأسبوعية
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  const reportTypeSelect = document.getElementById("report-type-select");
  if (reportTypeSelect) {
    handleReportTypeChange();
  }
  populateReportStudentsDropdown();
});

// تعبئة وتغذية قائمة الطلاب في خانة واحدة موحدة
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
  const weekGroup = document.getElementById("report-week-group");
  const dateFromGroup = document.getElementById("report-date-from-group");
  const dateToGroup = document.getElementById("report-date-to-group");
  const thead = document.getElementById("report-thead");
  const tbody = document.getElementById("report-tbody");
  const footer = document.getElementById("report-print-footer");

  if (circleGroup) circleGroup.style.display = "block";
  if (studentGroup) studentGroup.style.display = "block";

  if (reportType === "tamayuz") {
    if (weekGroup) weekGroup.classList.remove("style-hidden");
    if (dateFromGroup) dateFromGroup.style.display = "none";
    if (dateToGroup) dateToGroup.style.display = "none";
  } else {
    if (weekGroup) weekGroup.classList.add("style-hidden");
    if (dateFromGroup) dateFromGroup.style.display = "block";
    if (dateToGroup) dateToGroup.style.display = "block";
  }

  if (tbody) {
    tbody.innerHTML =
      '<tr><td class="text-center text-muted p-4">حدد خيارات التقرير ثم اضغط على "استخراج التقرير"</td></tr>';
  }
  if (thead) thead.innerHTML = "";
  if (footer) footer.style.display = "none";
}

// دالة حساب أيام التسميع الأربعة للأسبوع (الأحد، الإثنين، الثلاثاء، الأربعاء)
function getSundayToWednesdayDatesByWeekOption(weekOption) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = الأحد

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

// توليد التقرير الشامل التفاعلي
function generateReport() {
  const reportType = document.getElementById("report-type-select")?.value;
  const selectedStudentId =
    document.getElementById("report-student-select")?.value || "all";
  const circleId =
    document.getElementById("report-circle-select")?.value || "all";
  const dateFrom = document.getElementById("report-date-from")?.value;
  const dateTo = document.getElementById("report-date-to")?.value;
  const weekOption =
    document.getElementById("report-week-select")?.value || "current";

  const thead = document.getElementById("report-thead");
  const tbody = document.getElementById("report-tbody");
  const printTitle = document.getElementById("print-report-title");
  const printPeriod = document.getElementById("print-report-period");
  const footer = document.getElementById("report-print-footer");
  const footerDate = document.getElementById("print-footer-date");
  const printDirectorName = document.getElementById("print-director-name");

  if (!thead || !tbody) return;

  // تحديث بيانات الترويسة والتوقيع
  const settings = window.appStore.settings || DEFAULT_SETTINGS;
  const directorName = settings.directorName || "أحمد بن عبدالله بن مهدي";
  if (printDirectorName) printDirectorName.textContent = directorName;

  const now = new Date();
  if (footerDate) footerDate.textContent = now.toLocaleDateString("ar-SA");

  let headHtml = "";
  let bodyHtml = "";

  // 1. تقرير إنجاز طالب
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
        <th style="width: 50px;">م</th>
        <th>اسم الطالب</th>
        <th>الحلقة</th>
        <th>الحفظ</th>
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
            <td>${idx + 1}</td>
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

  // 2. التقرير الإحصائي الشامل للطلاب
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
        <th rowspan="2" style="vertical-align: middle;">م</th>
        <th rowspan="2" style="vertical-align: middle;">اسم الطالب</th>
        <th rowspan="2" style="vertical-align: middle;">أيام الحضور</th>
        <th rowspan="2" style="vertical-align: middle;">أيام الغياب</th>
        <th rowspan="2" style="vertical-align: middle;">مرات التميز</th>
        <th colspan="4" class="text-center">الدرس (الحفظ)</th>
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
            <td>${idx + 1}</td>
            <td style="font-weight:700;">${s.name}</td>
            <td style="font-weight:700; color: #2e7d32;">${presentCount}</td>
            <td style="font-weight:700; color: #c62828;">${absentCount}</td>
            <td style="font-weight:700; color: var(--primary-brown);">${tamayuzCount}</td>
            
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

  // 3. تقرير سجل التسميع اليومي
  else if (reportType === "tasmeea") {
    if (printTitle) printTitle.textContent = "تقرير إنجاز وسجل التسميع والحفظ";

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
        <th>التاريخ</th>
        <th>اسم الطالب</th>
        <th>الحفظ</th>
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
      records.forEach((t) => {
        const student = (window.appStore.students || []).find(
          (s) => s.id === t.studentId,
        );
        bodyHtml += `
          <tr>
            <td>${t.date}</td>
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

  // 4. تقرير لوحة الطلاب المتميزين
  else if (reportType === "tamayuz") {
    if (printTitle)
      printTitle.textContent = "تقرير لوحة الطلاب المتميزين (التميز الأسبوعي)";

    const weekDays = getSundayToWednesdayDatesByWeekOption(weekOption);

    if (printPeriod) {
      printPeriod.textContent = `أسبوع التميز (من الأحد ${weekDays[0]} إلى الأربعاء ${weekDays[3]})`;
      printPeriod.style.display = "block";
    }

    headHtml = `
      <tr>
        <th style="width: 50px;">م</th>
        <th>اسم الطالب المتميز</th>
        <th>الحلقة</th>
        <th>أيام الحضور (الأحد - الأربعاء)</th>
        <th>حالة التسميع الأسبوعي</th>
        <th>التقدير الأسبوعي</th>
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

    const qualifyingStudents = [];

    students.forEach((s) => {
      let attendedCount = 0;
      let hasDisqualifyingRating = false;

      for (const day of weekDays) {
        const att = (window.appStore.attendance || []).find(
          (a) => a.studentId === s.id && a.date === day,
        );
        if (att && (att.status === "present" || att.status === "late")) {
          attendedCount++;
        }

        const tasm = (window.appStore.tasmeea || []).find(
          (t) => t.studentId === s.id && t.date === day,
        );
        if (tasm) {
          const isValidRating = (r) => {
            if (!r || r.trim() === "" || r === "—" || r === "لا يوجد")
              return true;
            return r.includes("ممتاز");
          };

          if (
            !isValidRating(tasm.hifzRating) ||
            !isValidRating(tasm.murajaaRating) ||
            !isValidRating(tasm.tilawaRating)
          ) {
            hasDisqualifyingRating = true;
          }
        }
      }

      if (attendedCount === 4 && !hasDisqualifyingRating) {
        qualifyingStudents.push(s);
      }
    });

    if (qualifyingStudents.length === 0) {
      bodyHtml =
        '<tr><td colspan="6" class="text-center text-muted p-4">لا يوجد طلاب مطابقون لمعايير التميز لهذا الأسبوع</td></tr>';
    } else {
      qualifyingStudents.forEach((s, idx) => {
        const circle = (window.appStore.circles || []).find(
          (c) => c.id === s.circleId,
        );
        const circleName = circle ? circle.name : "المجمع";

        bodyHtml += `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight: 800;">⭐ ${s.name}</td>
            <td><span style="font-weight: 600; color: var(--text-dark);">${circleName}</span></td>
            <td><span class="badge badge-active">حضور كامل (4 / 4 أيام)</span></td>
            <td><span class="badge badge-active">متقن ومكتمل</span></td>
            <td><span class="badge badge-active">🌟 ممتاز</span></td>
          </tr>
        `;
      });
    }
  }

  thead.innerHTML = headHtml;
  tbody.innerHTML = bodyHtml;

  // إظهار توقيع المدير في نهاية التقرير
  if (footer) footer.style.display = "flex";
}

// دالة الطباعة المباشرة
function printOfficialReport() {
  const dateEl = document.getElementById("print-header-date");
  const timeEl = document.getElementById("print-header-time");
  const footerDate = document.getElementById("print-footer-date");

  const now = new Date();
  if (dateEl)
    dateEl.textContent = "التاريخ: " + now.toISOString().split("T")[0];
  if (timeEl) timeEl.textContent = "الوقت: " + now.toLocaleTimeString("ar-SA");
  if (footerDate) footerDate.textContent = now.toLocaleDateString("ar-SA");

  window.print();
}

// دالة تنزيل التقرير بصيغة PDF
function downloadReportPDF() {
  printOfficialReport();
}
