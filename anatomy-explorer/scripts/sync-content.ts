import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import * as dotenv from 'dotenv';
import { areaSchema, itemSchema } from '../src/lib/schemas';
import { COMPLIANCE_RULES, scanText, formatViolation } from '../src/lib/compliance';
import { execSync } from 'child_process';

dotenv.config();

const SHEET_ID = process.env.SHEET_ID;
if (!SHEET_ID) {
  console.error('SHEET_ID is missing from .env');
  process.exit(1);
}

const getSheetUrl = (sheetName: string) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${sheetName}`;

async function fetchCsv(sheetName: string) {
  const url = getSheetUrl(sheetName);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${sheetName}: ${response.statusText}`);
  }
  const csv = await response.text();
  return csv;
}

function parseAndClean(csv: string) {
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

async function main() {
  console.log('Fetching data from Google Sheets...');
  let areasCsv = '';
  let itemsCsv = '';

  try {
    areasCsv = await fetchCsv('areas');
    itemsCsv = await fetchCsv('items');
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }

  if (!areasCsv.trim() && !itemsCsv.trim()) {
    console.error('ERROR: The sheet appears to be completely empty.');
    console.error(
      "Please populate the 'areas' and 'items' tabs with the correct headers before running sync."
    );
    process.exit(1);
  }

  const areasData = parseAndClean(areasCsv);
  const itemsData = parseAndClean(itemsCsv);

  // synthetic ID for areas required by Astro file loader
  const preparedAreas = areasData.map((area) => ({
    ...area,
    id: area.section && area.area_id ? `${area.section}-${area.area_id}` : undefined,
  }));

  let hasErrors = false;

  // Validate Areas
  const validatedAreas = [];
  for (let i = 0; i < preparedAreas.length; i++) {
    const row = preparedAreas[i];
    const result = areaSchema.safeParse(row);
    if (!result.success) {
      hasErrors = true;
      console.error(`ERROR in 'areas' row ${i + 2}:`);
      result.error.issues.forEach((issue) => {
        console.error(`  Column '${issue.path.join('.')}' - ${issue.message}`);
      });
    } else {
      let foundBanned = false;
      for (const [key, val] of Object.entries(result.data)) {
        if (typeof val === 'string') {
          const violations = scanText(val, key, COMPLIANCE_RULES);
          if (violations.length > 0) {
            hasErrors = true;
            foundBanned = true;
            for (const v of violations) {
              console.error(
                `ERROR in 'areas' row ${i + 2}: ${formatViolation(`Column '${key}'`, v)}`
              );
            }
          }
        }
      }
      if (!foundBanned) validatedAreas.push(result.data);
    }
  }

  // Validate Items
  const validatedItems = [];
  for (let i = 0; i < itemsData.length; i++) {
    const row = itemsData[i];
    const result = itemSchema.safeParse(row);
    if (!result.success) {
      hasErrors = true;
      console.error(`ERROR in 'items' row ${i + 2} (ID: ${row.id || 'unknown'}):`);
      result.error.issues.forEach((issue) => {
        console.error(`  Column '${issue.path.join('.')}' - ${issue.message}`);
      });
    } else {
      let foundBanned = false;
      for (const [key, val] of Object.entries(result.data)) {
        if (typeof val === 'string') {
          const violations = scanText(val, key, COMPLIANCE_RULES);
          if (violations.length > 0) {
            hasErrors = true;
            foundBanned = true;
            for (const v of violations) {
              console.error(
                `ERROR in 'items' row ${i + 2} (ID: ${row.id || 'unknown'}): ${formatViolation(`Column '${key}'`, v)}`
              );
            }
          }
        }
      }
      if (!foundBanned) validatedItems.push(result.data);
    }
  }

  // Cross-reference checks
  if (!hasErrors) {
    const areaKeys = new Set(validatedAreas.map((a) => `${a.section}-${a.area_id}`));
    for (const item of validatedItems) {
      const key = `${item.section}-${item.area_id}`;
      if (!areaKeys.has(key)) {
        hasErrors = true;
        console.error(
          `ERROR in 'items': Item ${item.id} references area_id '${item.area_id}' in section '${item.section}' which does not exist in 'areas' tab.`
        );
      }
    }
  }

  if (hasErrors) {
    console.error('\nSync failed due to validation errors. No files were written.');
    process.exit(1);
  }

  // Stable sorting
  validatedAreas.sort((a, b) => a.id.localeCompare(b.id));
  validatedItems.sort((a, b) => a.id.localeCompare(b.id));

  // Write files
  const areasPath = path.join(process.cwd(), 'src', 'data', 'areas.json');
  const itemsPath = path.join(process.cwd(), 'src', 'data', 'items.json');

  fs.writeFileSync(areasPath, JSON.stringify(validatedAreas, null, 2));
  fs.writeFileSync(itemsPath, JSON.stringify(validatedItems, null, 2));

  console.log(
    `Successfully synced ${validatedAreas.length} areas and ${validatedItems.length} items.`
  );

  try {
    execSync('npm run check:images', { stdio: 'inherit' });
  } catch (e) {
    // script handles its own output
  }
}

main();
