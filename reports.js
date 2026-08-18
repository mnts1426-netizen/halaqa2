/**
 * ==========================================================================
 * reports.js - محرك التقارير الشاملة، والطباعة، وتنزيل النسخ الاحتياطية
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  const reportTypeSelect = document.getElementById("report-type-select");
  if (reportTypeSelect) {
    handleReportTypeChange();
  }
});

function handleReportTypeChange() {
  const thead = document.getElementById("report-thead");
  const tbody = document.getElementById("report-tbody");
  if (tbody) {
    tbody.innerHTML =
      '<tr><td class="text-center text-muted p-4">حدد خيارات التقرير ثم اضغط على "استخراج التقرير"</td></tr>';
  }
  if (thead) thead.innerHTML = "";
}

// توليد التقرير الشامل التفاعلي
function generateReport() {
  const reportType = document.getElementById("report-type-select")?.value;
  const circleId =
    document.getElementById("report-circle-select")?.value || "all";
  const dateFrom = document.getElementById("report-date-from")?.value;
  const dateTo = document.getElementById("report-date-to")?.value;

  const thead = document.getElementById("report-thead");
  const tbody = document.getElementById("report-tbody");
  if (!thead || !tbody) return;

  let headHtml = "";
  let bodyHtml = "";

  if (reportType === "students") {
    headHtml = `
      <tr>
        <th>اسم الطالب</th>
        <th>الهوية</th>
        <th>جوال الطالب</th>
        <th>جوال ولي الأمر</th>
        <th>الحلقة</th>
        <th>الحالة</th>
      </tr>
    `;

    let students = (window.appStore.students || []).filter(
      (s) => s.status !== "pending",
    );
    if (circleId !== "all") {
      students = students.filter((s) => s.circleId === circleId);
    }

    if (students.length === 0) {
      bodyHtml =
        '<tr><td colspan="6" class="text-center text-muted p-4">لا توجد بيانات مطابقة</td></tr>';
    } else {
      students.forEach((s) => {
        const circle = (window.appStore.circles || []).find(
          (c) => c.id === s.circleId,
        );
        bodyHtml += `
          <tr>
            <td style="font-weight:700;">${s.name}</td>
            <td>${s.nationalId || "—"}</td>
            <td>${s.phone || "بدون جوال"}</td>
            <td>${s.parentPhone || "—"}</td>
            <td><span class="badge badge-warning">${circle ? circle.name : "غير مسجل"}</span></td>
            <td><span class="badge badge-active">${s.status === "active" ? "نشط" : "مؤرشف"}</span></td>
          </tr>
        `;
      });
    }
  } else if (reportType === "attendance") {
    headHtml = `
      <tr>
        <th>التاريخ</th>
        <th>اسم الطالب</th>
        <th>الحلقة</th>
        <th>الحالة</th>
        <th>الملاحظات</th>
      </tr>
    `;

    let records = window.appStore.attendance || [];
    if (circleId !== "all") {
      records = records.filter((r) => r.circleId === circleId);
    }
    if (dateFrom) {
      records = records.filter((r) => r.date >= dateFrom);
    }
    if (dateTo) {
      records = records.filter((r) => r.date <= dateTo);
    }

    if (records.length === 0) {
      bodyHtml =
        '<tr><td colspan="5" class="text-center text-muted p-4">لا توجد سجلات حضور في هذه الفترة</td></tr>';
    } else {
      records.forEach((r) => {
        const student = (window.appStore.students || []).find(
          (s) => s.id === r.studentId,
        );
        const circle = (window.appStore.circles || []).find(
          (c) => c.id === r.circleId,
        );
        bodyHtml += `
          <tr>
            <td>${r.date}</td>
            <td style="font-weight:700;">${student ? student.name : "طالب"}</td>
            <td><span class="badge badge-warning">${circle ? circle.name : "—"}</span></td>
            <td>${r.status === "present" ? "🟢 حاضر" : r.status === "absent" ? "🔴 غائب" : r.status === "late" ? "🟡 متأخر" : "🔵 مستأذن"}</td>
            <td>${r.notes || "—"}</td>
          </tr>
        `;
      });
    }
  } else if (reportType === "tasmeea") {
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
    if (circleId !== "all") {
      records = records.filter((r) => r.circleId === circleId);
    }
    if (dateFrom) {
      records = records.filter((r) => r.date >= dateFrom);
    }
    if (dateTo) {
      records = records.filter((r) => r.date <= dateTo);
    }

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
            <td>${t.hifzSurah ? `${t.hifzSurah} (${t.hifzFrom}-${t.hifzTo})` : "—"}</td>
            <td>${t.murajaaSurah ? `${t.murajaaSurah} (${t.murajaaFrom}-${t.murajaaTo})` : "—"}</td>
            <td>${t.tilawaSurah ? `${t.tilawaSurah} (${t.tilawaFrom}-${t.tilawaTo})` : "—"}</td>
            <td><span class="badge badge-warning">${t.rating || "—"}</span></td>
            <td>${t.studentNotes || "—"}</td>
          </tr>
        `;
      });
    }
  } else if (reportType === "teachers") {
    headHtml = `
      <tr>
        <th>اسم المعلم</th>
        <th>رقم الجوال</th>
        <th>الحلقات</th>
        <th>نسبة تحضير الطلاب</th>
        <th>نسبة إدخال التسميع</th>
        <th>آخر دخول</th>
      </tr>
    `;

    let teachers = window.appStore.teachers || [];
    if (teachers.length === 0) {
      bodyHtml =
        '<tr><td colspan="6" class="text-center text-muted p-4">لا توجد بيانات للمعلمين</td></tr>';
    } else {
      teachers.forEach((t) => {
        const teacherCircles = (window.appStore.circles || []).filter(
          (c) =>
            (c.teacherIds && c.teacherIds.includes(t.id)) ||
            c.teacherId === t.id,
        );
        const circleNames =
          teacherCircles.map((c) => c.name).join(" ، ") || "غير مكلف";

        bodyHtml += `
          <tr>
            <td style="font-weight:700;">${t.name}</td>
            <td>${t.phone}</td>
            <td><span class="badge badge-warning">${circleNames}</span></td>
            <td><span class="badge badge-active">${t.customAttendanceRate || 95}%</span></td>
            <td><span class="badge badge-warning">${t.customTasmeeaRate || 90}%</span></td>
            <td dir="ltr" class="text-muted" style="text-align:right;">${t.lastLogin || "اليوم 04:30 م"}</td>
          </tr>
        `;
      });
    }
  }

  thead.innerHTML = headHtml;
  tbody.innerHTML = bodyHtml;
}

// تنزيل النسخة الاحتياطية لجامع الهدى بملف JSON
function downloadBackupJSON() {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(window.appStore, null, 2));
  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute(
    "download",
    `Halaqat_Huda_Backup_${new Date().toISOString().split("T")[0]}.json`,
  );
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}
