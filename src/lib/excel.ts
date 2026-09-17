import * as XLSX from "xlsx";

export type PayrollExcelRow = {
  employeeName: string;
  idNumber: string;
  employmentStartDate: string;
  month: string;
  workDays: number;
  workHours: number;
  hourlyWage: number;
  basePay: number;
  travel: number;
  bonus: number;
  managerBonus: number;
  grossTotal: number;
};

export function downloadPayrollExcel(month: string, rows: PayrollExcelRow[]) {
  const headers = [
    "שם עובד",
    "תז",
    "תחילת עבודה",
    "חודש",
    "ימי עבודה בפועל",
    "שעות עבודה",
    "שכר שעתי",
    "בסיס",
    "נסיעות",
    "בונוס",
    "בונוס מנהל",
    "סה״כ ברוטו",
  ];
  const data = rows.map((row) => [
    row.employeeName,
    row.idNumber,
    row.employmentStartDate,
    row.month,
    row.workDays,
    row.workHours,
    row.hourlyWage,
    row.basePay,
    row.travel,
    row.bonus,
    row.managerBonus,
    row.grossTotal,
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  sheet["!views"] = [{ rightToLeft: true }];
  sheet["!cols"] = [
    { wch: 22 },
    { wch: 13 },
    { wch: 15 },
    { wch: 10 },
    { wch: 17 },
    { wch: 14 },
    { wch: 13 },
    { wch: 13 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 15 },
  ];
  for (let rowIndex = 1; rowIndex <= rows.length; rowIndex += 1) {
    for (let columnIndex = 4; columnIndex <= 11; columnIndex += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
      if (cell) cell.z = columnIndex === 5 ? "0.00" : "#,##0.00;[Red](#,##0.00);-";
    }
  }
  sheet["!autofilter"] = { ref: `A1:L${Math.max(rows.length + 1, 1)}` };
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(workbook, sheet, "שכר");
  XLSX.writeFile(workbook, `payroll-${month}.xlsx`, { compression: true });
}