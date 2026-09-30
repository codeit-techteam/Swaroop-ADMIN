export function downloadCsv(filename: string, rows: Record<string, string | number | boolean | null | undefined>[]) {
  if (rows.length === 0) {
    const blob = new Blob(["No data"], { type: "text/csv;charset=utf-8;" });
    triggerDownload(filename, blob);
    return;
  }

  const headers = Object.keys(rows[0] ?? {});
  const escape = (value: string | number | boolean | null | undefined) => {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");

  triggerDownload(filename, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
}

export function downloadExcel(filename: string, rows: Record<string, string | number | boolean | null | undefined>[]) {
  const headers = rows[0] ? Object.keys(rows[0]) : ["value"];
  const escapeXml = (value: string | number | boolean | null | undefined) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const headerRow = `<Row>${headers.map((header) => `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`).join("")}</Row>`;
  const body = rows
    .map(
      (row) =>
        `<Row>${headers
          .map((header) => {
            const value = row[header];
            const isNumber = typeof value === "number";
            return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeXml(value)}</Data></Cell>`;
          })
          .join("")}</Row>`,
    )
    .join("");

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Grades"><Table>${headerRow}${body}</Table></Worksheet>
</Workbook>`;

  triggerDownload(filename, new Blob([xml], { type: "application/vnd.ms-excel" }));
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsvText(filename: string, csv: string) {
  triggerDownload(filename, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
}
