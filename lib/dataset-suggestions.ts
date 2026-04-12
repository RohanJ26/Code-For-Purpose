export type DatasetInfoLike = {
  rows?: number;
  columns?: number;
  filename?: string;
  column_info?: Array<{ name?: string }>;
};

export function buildDatasetSuggestions(info: DatasetInfoLike | undefined | null): string[] {
  if (!info) return [];
  const cols = (info.column_info || []).map((c) => String(c.name || '').trim()).filter(Boolean);
  const meta = [
    info.rows != null ? `${info.rows} rows` : null,
    info.columns != null ? `${info.columns} columns` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const fileHint = info.filename ? ` (${info.filename})` : '';

  const out: string[] = [
    `Give a concise overview of this dataset${fileHint}${meta ? ` — ${meta}` : ''}.`,
    'Which columns have missing or suspicious values, and what should I watch out for?',
    'What are the top three insights an executive should take from this data?',
  ];

  if (cols[0]) {
    out.push(`Analyze the column "${cols[0]}" — typical values, spread, and anything notable.`);
  }
  if (cols.length >= 2) {
    out.push(`How might "${cols[0]}" and "${cols[1]}" relate or interact in this dataset?`);
  }

  return out.slice(0, 6);
}
