import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Utility to export tabular JSON data to a formatted Excel (.xlsx) spreadsheet
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  fileName: string,
  sheetName = 'Laporan',
  customColumns?: ExcelColumn[]
) {
  let formattedData = data;
  if (customColumns && customColumns.length > 0) {
    formattedData = data.map((item) => {
      const row: Record<string, any> = {};
      customColumns.forEach((col) => {
        row[col.header] =
          item[col.key] !== undefined && item[col.key] !== null ? item[col.key] : '';
      });
      return row as T;
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Configure column widths if custom columns provided
  if (customColumns && customColumns.length > 0) {
    worksheet['!cols'] = customColumns.map((col) => ({
      wch: col.width || Math.max(col.header.length + 4, 14),
    }));
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
