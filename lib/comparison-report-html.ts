import type { ChartPayload, ReportDatasetInfo } from '@/lib/formal-report-html';

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

function lineSvg(data: { x?: number; y?: number }[], title: string, w = 520, h = 200): string {
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

function scatterSvg(data: { x?: number; y?: number }[], title: string, w = 520, h = 200): string {
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

function chartsBlock(charts: ChartPayload | null, datasetLabel: string): string {
  if (!charts) {
    return `<p><em>No chart aggregates for ${escapeHtml(datasetLabel)}.</em></p>`;
  }
  const parts: string[] = [];
  if (charts.line?.data?.length && charts.line.title) {
    parts.push(lineSvg(charts.line.data, `${datasetLabel} — ${charts.line.title}`));
  }
  if (charts.area?.data?.length && charts.area.title) {
    parts.push(lineSvg(charts.area.data, `${datasetLabel} — ${charts.area.title}`));
  }
  if (charts.bar?.data?.length && charts.bar.title) {
    parts.push(barSvg(charts.bar.data, `${datasetLabel} — ${charts.bar.title}`));
  }
  if (charts.grouped_bar?.data?.length && charts.grouped_bar.title) {
    parts.push(barSvg(charts.grouped_bar.data, `${datasetLabel} — ${charts.grouped_bar.title}`));
  }
  if (charts.scatter?.data?.length && charts.scatter.title) {
    parts.push(scatterSvg(charts.scatter.data, `${datasetLabel} — ${charts.scatter.title}`));
  }
  return parts.length ? parts.join('\n') : `<p><em>No chartable series for ${escapeHtml(datasetLabel)}.</em></p>`;
}

function dataDictionaryTable(info: ReportDatasetInfo | null): string {
  if (!info?.column_info?.length) return '<p><em>No column metadata captured.</em></p>';
  const rows = info.column_info
    .map(
      (c) =>
        `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.dtype)}</td><td>${c.null_count}</td><td>${c.unique_count}</td></tr>`
    )
    .join('');
  return `<table><thead><tr><th>Column</th><th>Type</th><th>Nulls</th><th>Unique</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export type ComparisonSnapshotForReport = {
  dataset_1?: {
    id?: string;
    filename?: string;
    rows?: number;
    columns?: number;
    completeness_pct?: number;
  };
  dataset_2?: {
    id?: string;
    filename?: string;
    rows?: number;
    columns?: number;
    completeness_pct?: number;
  };
  schema?: {
    shared_columns?: string[];
    only_in_dataset_1?: string[];
    only_in_dataset_2?: string[];
    shared_numeric_columns?: string[];
  };
  numeric_comparison?: Array<{
    column?: string;
    dataset_1_mean?: number | null;
    dataset_2_mean?: number | null;
    dataset_1_sum?: number | null;
    dataset_2_sum?: number | null;
  }>;
};

export function buildComparisonReportHtml(params: {
  snapshot: ComparisonSnapshotForReport;
  chartsA: ChartPayload | null;
  chartsB: ChartPayload | null;
  infoA: ReportDatasetInfo | null;
  infoB: ReportDatasetInfo | null;
  differences: string[];
  similarities: string[];
  performance: string;
  insights: string;
  labelA?: string;
  labelB?: string;
  organizationName?: string;
}): string {
  const {
    snapshot,
    chartsA,
    chartsB,
    infoA,
    infoB,
    differences,
    similarities,
    performance,
    insights,
    labelA = 'Dataset A',
    labelB = 'Dataset B',
    organizationName = 'DataMind Analytics',
  } = params;

  const d1 = snapshot.dataset_1;
  const d2 = snapshot.dataset_2;
  const schema = snapshot.schema;
  const numRows = snapshot.numeric_comparison ?? [];

  const generated = new Date().toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const numericHtml =
    numRows.length > 0
      ? `<table>
    <thead><tr><th>Column</th><th>Mean (${escapeHtml(labelA)})</th><th>Mean (${escapeHtml(labelB)})</th><th>Sum (A)</th><th>Sum (B)</th></tr></thead>
    <tbody>${numRows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(String(r.column ?? ''))}</td><td>${r.dataset_1_mean ?? '—'}</td><td>${r.dataset_2_mean ?? '—'}</td><td>${r.dataset_1_sum ?? '—'}</td><td>${r.dataset_2_sum ?? '—'}</td></tr>`
      )
      .join('')}
    </tbody></table>`
      : '<p><em>No overlapping numeric columns for side-by-side statistics.</em></p>';

  const diffList =
    differences.length > 0
      ? `<ul>${differences.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`
      : '<p><em>None listed.</em></p>';
  const simList =
    similarities.length > 0
      ? `<ul>${similarities.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`
      : '<p><em>None listed.</em></p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Dataset Comparison Report</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.45; max-width: 880px; margin: 0 auto; padding: 48px 32px 64px; }
    .letterhead { border-bottom: 2px solid #1e3a5f; padding-bottom: 16px; margin-bottom: 28px; }
    .letterhead h1 { font-size: 22px; margin: 0; color: #1e3a5f; }
    .meta { font-size: 12px; color: #444; margin-top: 8px; }
    h2 { font-size: 15px; color: #1e3a5f; margin-top: 28px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    h3 { font-size: 13px; color: #334155; margin-top: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 12px 0; }
    th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; }
    th { background: #f0f4f8; font-weight: 600; }
    .figure { margin: 16px 0; page-break-inside: avoid; }
    .fig-title { font-size: 12px; font-weight: 600; margin-bottom: 6px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media print { body { padding: 24px; } .grid2 { display: block; } }
  </style>
</head>
<body>
  <header class="letterhead">
    <h1>${escapeHtml(organizationName)}</h1>
    <div class="meta">Confidential · Dataset comparison report<br/>Generated ${escapeHtml(generated)}</div>
  </header>

  <h2>1. At-a-glance</h2>
  <table>
    <thead><tr><th>Metric</th><th>${escapeHtml(labelA)}</th><th>${escapeHtml(labelB)}</th></tr></thead>
    <tbody>
      <tr><td>File</td><td>${escapeHtml(String(d1?.filename ?? '—'))}</td><td>${escapeHtml(String(d2?.filename ?? '—'))}</td></tr>
      <tr><td>ID</td><td>${escapeHtml(String(d1?.id ?? '—'))}</td><td>${escapeHtml(String(d2?.id ?? '—'))}</td></tr>
      <tr><td>Rows</td><td>${d1?.rows ?? '—'}</td><td>${d2?.rows ?? '—'}</td></tr>
      <tr><td>Columns</td><td>${d1?.columns ?? '—'}</td><td>${d2?.columns ?? '—'}</td></tr>
      <tr><td>Completeness %</td><td>${d1?.completeness_pct ?? '—'}</td><td>${d2?.completeness_pct ?? '—'}</td></tr>
    </tbody>
  </table>

  <h2>2. Schema</h2>
  <p><strong>Shared columns (${schema?.shared_columns?.length ?? 0}):</strong> ${escapeHtml((schema?.shared_columns ?? []).slice(0, 80).join(', ') || '—')}</p>
  <p><strong>Only in ${escapeHtml(labelA)}:</strong> ${escapeHtml((schema?.only_in_dataset_1 ?? []).slice(0, 40).join(', ') || '—')}</p>
  <p><strong>Only in ${escapeHtml(labelB)}:</strong> ${escapeHtml((schema?.only_in_dataset_2 ?? []).slice(0, 40).join(', ') || '—')}</p>

  <h2>3. Shared numeric columns</h2>
  ${numericHtml}

  <h2>4. Data dictionaries</h2>
  <h3>${escapeHtml(labelA)}</h3>
  ${dataDictionaryTable(infoA)}
  <h3>${escapeHtml(labelB)}</h3>
  ${dataDictionaryTable(infoB)}

  <h2>5. Visual profiles</h2>
  <h3>${escapeHtml(labelA)}</h3>
  ${chartsBlock(chartsA, labelA)}
  <h3>${escapeHtml(labelB)}</h3>
  ${chartsBlock(chartsB, labelB)}

  <h2>6. AI comparison narrative</h2>
  ${performance ? `<p><strong>Performance / relative assessment</strong></p><p>${escapeHtml(performance)}</p>` : ''}
  <p><strong>Key differences</strong></p>${diffList}
  <p><strong>Similarities</strong></p>${simList}
  ${insights ? `<p><strong>Strategic insights</strong></p><p>${escapeHtml(insights)}</p>` : ''}

  <p style="margin-top:32px;font-size:11px;color:#666;">— End of comparison report —</p>
</body>
</html>`;
}
