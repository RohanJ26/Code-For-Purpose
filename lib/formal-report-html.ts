export type ReportColumnRow = {
  name: string;
  dtype: string;
  null_count: number;
  unique_count: number;
  sample_values: unknown[];
};

export type ReportDatasetInfo = {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
  column_info: ReportColumnRow[];
};

export type ChartPayload = Record<
  string,
  | { title?: string; data?: { x?: number; y?: number; name?: string; value?: number }[] }
  | undefined
>;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function barSvg(
  data: { name?: string; value?: number }[],
  title: string,
  w = 520,
  h = 200
): string {
  if (!data.length) return '';
  const pad = { t: 24, r: 16, b: 48, l: 48 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const maxV = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  const bw = iw / data.length - 4;
  const rects = data
    .map((d, i) => {
      const v = Number(d.value) || 0;
      const bh = (v / maxV) * ih;
      const x = pad.l + i * (iw / data.length) + 2;
      const y = pad.t + ih - bh;
      return `<rect x="${x}" y="${y}" width="${Math.max(bw, 2)}" height="${bh}" fill="#4f46e5" rx="3"/>`;
    })
    .join('');
  const labels = data
    .map((d, i) => {
      const label = escapeHtml(String(d.name ?? '').slice(0, 14));
      const x = pad.l + i * (iw / data.length) + iw / data.length / 2;
      return `<text x="${x}" y="${h - 12}" text-anchor="middle" font-size="9" fill="#444">${label}</text>`;
    })
    .join('');
  return `<div class="figure"><p class="fig-title">${escapeHtml(title)}</p><svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${rects}${labels}</svg></div>`;
}

function lineSvg(
  data: { x?: number; y?: number }[],
  title: string,
  w = 520,
  h = 200
): string {
  if (!data.length) return '';
  const pad = { t: 28, r: 20, b: 28, l: 48 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const xs = data.map((d) => Number(d.x) ?? 0);
  const ys = data.map((d) => Number(d.y) ?? 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs, minX + 1);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys, minY + 1e-9);
  const pts = data
    .map((d) => {
      const px = pad.l + ((Number(d.x) - minX) / (maxX - minX)) * iw;
      const py = pad.t + ih - ((Number(d.y) - minY) / (maxY - minY)) * ih;
      return `${px},${py}`;
    })
    .join(' ');
  return `<div class="figure"><p class="fig-title">${escapeHtml(title)}</p><svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><polyline fill="none" stroke="#059669" stroke-width="2" points="${pts}"/></svg></div>`;
}

function scatterSvg(
  data: { x?: number; y?: number }[],
  title: string,
  w = 520,
  h = 200
): string {
  if (!data.length) return '';
  const pad = { t: 28, r: 20, b: 28, l: 48 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const xs = data.map((d) => Number(d.x) ?? 0);
  const ys = data.map((d) => Number(d.y) ?? 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs, minX + 1e-9);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys, minY + 1e-9);
  const dots = data
    .map((d) => {
      const px = pad.l + ((Number(d.x) - minX) / (maxX - minX)) * iw;
      const py = pad.t + ih - ((Number(d.y) - minY) / (maxY - minY)) * ih;
      return `<circle cx="${px}" cy="${py}" r="3" fill="#d97706"/>`;
    })
    .join('');
  return `<div class="figure"><p class="fig-title">${escapeHtml(title)}</p><svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${dots}</svg></div>`;
}

function chartsSection(charts: ChartPayload | null): string {
  if (!charts) return '';
  const parts: string[] = ['<h2>4. Visual summaries</h2>'];
  if (charts.line?.data?.length && charts.line.title) {
    parts.push(lineSvg(charts.line.data, charts.line.title));
  }
  if (charts.area?.data?.length && charts.area.title) {
    parts.push(lineSvg(charts.area.data, charts.area.title));
  }
  if (charts.bar?.data?.length && charts.bar.title) {
    parts.push(barSvg(charts.bar.data, charts.bar.title));
  }
  if (charts.grouped_bar?.data?.length && charts.grouped_bar.title) {
    parts.push(barSvg(charts.grouped_bar.data, charts.grouped_bar.title));
  }
  if (charts.scatter?.data?.length && charts.scatter.title) {
    parts.push(scatterSvg(charts.scatter.data, charts.scatter.title));
  }
  return parts.length > 1 ? parts.join('\n') : '';
}

export function buildFormalReportHtml(params: {
  info: ReportDatasetInfo;
  charts: ChartPayload | null;
  analysis: Record<string, unknown> | null;
  numericSummary?: string;
  organizationName?: string;
}): string {
  const { info, charts, analysis, numericSummary, organizationName = 'DataMind Analytics' } = params;
  const generated = new Date().toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const insights = typeof analysis?.insights === 'string' ? analysis.insights : '';
  const trends = Array.isArray(analysis?.trends) ? (analysis.trends as string[]).filter(Boolean) : [];
  const anomalies = Array.isArray(analysis?.anomalies) ? (analysis.anomalies as string[]).filter(Boolean) : [];
  const recommendations = Array.isArray(analysis?.recommendations)
    ? (analysis.recommendations as string[]).filter(Boolean)
    : [];

  const nullTotal = info.column_info.reduce((s, c) => s + (c.null_count ?? 0), 0);
  const cells = Math.max(info.rows * info.columns, 1);
  const completeness = Math.round((1 - nullTotal / cells) * 1000) / 10;

  const columnRows = info.column_info
    .map(
      (c) =>
        `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.dtype)}</td><td>${c.null_count}</td><td>${c.unique_count}</td><td>${escapeHtml(JSON.stringify(c.sample_values ?? []).slice(0, 120))}</td></tr>`
    )
    .join('');

  const chartBlock = chartsSection(charts);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Dataset Report — ${escapeHtml(info.filename)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.45; max-width: 800px; margin: 0 auto; padding: 48px 32px 64px; }
    .letterhead { border-bottom: 2px solid #1e3a5f; padding-bottom: 16px; margin-bottom: 28px; }
    .letterhead h1 { font-size: 22px; margin: 0; color: #1e3a5f; letter-spacing: 0.02em; }
    .meta { font-size: 12px; color: #444; margin-top: 8px; }
    h2 { font-size: 15px; color: #1e3a5f; margin-top: 28px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    p { margin: 8px 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 12px 0; }
    th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f0f4f8; font-weight: 600; }
    ul { margin: 8px 0; padding-left: 20px; font-size: 13px; }
    .figure { margin: 20px 0; page-break-inside: avoid; }
    .fig-title { font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #333; }
    .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 16px; margin: 12px 0; font-size: 13px; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <header class="letterhead">
    <h1>${escapeHtml(organizationName)}</h1>
    <div class="meta">Confidential · Data intelligence report<br/>Generated ${escapeHtml(generated)}</div>
  </header>

  <h2>1. Executive summary</h2>
  <div class="summary-box">
    <p><strong>File:</strong> ${escapeHtml(info.filename)}</p>
    <p><strong>Dataset identifier:</strong> ${escapeHtml(info.dataset_id)}</p>
    <p><strong>Shape:</strong> ${info.rows.toLocaleString()} rows × ${info.columns} columns</p>
    <p><strong>Estimated completeness:</strong> ${completeness}% of cells non-null</p>
  </div>
  ${insights ? `<p>${escapeHtml(insights)}</p>` : '<p><em>No AI narrative available (check API configuration).</em></p>'}

  <h2>2. Data dictionary</h2>
  <p>The following table lists each column, storage type, null counts, approximate cardinality, and sample values.</p>
  <table>
    <thead><tr><th>Column</th><th>Type</th><th>Nulls</th><th>Unique</th><th>Sample values</th></tr></thead>
    <tbody>${columnRows}</tbody>
  </table>

  ${
    numericSummary
      ? `<h2>2a. Statistical profile (numeric columns)</h2>
  <p>Descriptive statistics computed across numeric fields (count, mean, std, min, quartiles, max).</p>
  <pre style="font-size:10px;line-height:1.35;overflow:auto;max-height:420px;background:#f9fafb;padding:14px;border:1px solid #ddd;white-space:pre-wrap;">${escapeHtml(numericSummary)}</pre>`
      : ''
  }

  <h2>3. AI-derived findings</h2>
  ${
    trends.length
      ? `<p><strong>Trends &amp; signals</strong></p><ul>${trends.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
      : ''
  }
  ${
    anomalies.length
      ? `<p><strong>Anomalies &amp; caveats</strong></p><ul>${anomalies.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
      : ''
  }
  ${
    recommendations.length
      ? `<p><strong>Recommendations</strong></p><ul>${recommendations.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
      : ''
  }

  ${chartBlock || '<h2>4. Visual summaries</h2><p><em>No chart aggregates were available for this dataset.</em></p>'}

  <h2>5. Closing</h2>
  <p>This report was produced automatically from the uploaded dataset and model-assisted analysis. Validate figures against source systems before operational decisions.</p>
  <p style="margin-top:32px;font-size:11px;color:#666;">— End of report —</p>
</body>
</html>`;
}

export function downloadHtmlFile(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
