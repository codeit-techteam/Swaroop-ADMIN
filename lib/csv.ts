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
