/**
 * Live sheet reader for the clinician's `/preview` route.
 *
 * Runs server-side only — `src/pages/preview/**` sets `prerender = false`, so
 * the fetch below happens in a serverless function and never in a patient's
 * browser. `scripts/check-compliance.ts` pins `docs.google.com` to this exact
 * file for that reason; importing this module from a prerendered page will fail
 * the build.
 */
import Papa from 'papaparse';
import { areaSchema, itemSchema } from './schemas';

export interface PreviewProblem {
  readonly tab: 'areas' | 'items';
  readonly row: number;
  readonly id: string;
  readonly messages: readonly string[];
}

export async function fetchCsv(sheetId: string, sheetName: string) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${sheetName}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${sheetName}: ${response.statusText}`);
  }
  return await response.text();
}

export function parseAndClean(csv: string) {
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  return parsed.data.map((row: any) => {
    const cleanRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === undefined || value === null) {
        cleanRow[key] = undefined;
        continue;
      }
      let val = String(value).trim();
      if (val === '') {
        cleanRow[key] = undefined;
      } else if (val.toUpperCase() === 'TRUE') {
        cleanRow[key] = true;
      } else if (val.toUpperCase() === 'FALSE') {
        cleanRow[key] = false;
      } else if (!isNaN(Number(val))) {
        cleanRow[key] = Number(val);
      } else {
        cleanRow[key] = val;
      }
    }
    return cleanRow;
  });
}

export async function getPreviewData(sheetId: string) {
  const [areasCsv, itemsCsv] = await Promise.all([
    fetchCsv(sheetId, 'areas'),
    fetchCsv(sheetId, 'items'),
  ]);

  const problems: PreviewProblem[] = [];

  /**
   * **Fixed on port.** The previous version did
   * `.filter(res => res.success)` and threw the failures away, so a row the
   * clinician had just broken simply vanished from the preview — the one place
   * she goes to find out whether her row is correct. A review tool that hides
   * invalid rows tells her the opposite of the truth. Failures are now
   * collected and returned so the page can show them.
   */
  const collect = <T>(
    rows: unknown[],
    schema: {
      safeParse: (v: unknown) => {
        success: boolean;
        data?: T;
        error?: { issues: { path: PropertyKey[]; message: string }[] };
      };
    },
    tab: 'areas' | 'items'
  ): T[] => {
    const ok: T[] = [];
    rows.forEach((row, i) => {
      const result = schema.safeParse(row);
      if (result.success && result.data) {
        ok.push(result.data);
        return;
      }
      problems.push({
        tab,
        // +2: one for the header row, one for 1-based spreadsheet numbering.
        row: i + 2,
        id: String((row as Record<string, unknown>)?.id ?? '(no id)'),
        messages: (result.error?.issues ?? []).map(
          (issue) => `${issue.path.join('.') || '(row)'}: ${issue.message}`
        ),
      });
    });
    return ok;
  };

  const areasRows = parseAndClean(areasCsv).map((area) => ({
    ...area,
    id: area.section && area.area_id ? `${area.section}-${area.area_id}` : undefined,
  }));

  const areas = collect<any>(areasRows, areaSchema as any, 'areas').filter(
    (a) => a.status === 'published' || a.status === 'draft'
  );
  const items = collect<any>(parseAndClean(itemsCsv), itemSchema as any, 'items').filter(
    (i) => i.status === 'published' || i.status === 'draft'
  );

  return { areas, items, problems };
}
