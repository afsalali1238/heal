import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

async function generateQRCodes() {
  const BASE_URL = 'https://physioapp-nine.vercel.app';
  const outDir = path.join(process.cwd(), 'build-artifacts', 'qr');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const areasPath = path.join(process.cwd(), 'src', 'data', 'areas.json');
  const itemsPath = path.join(process.cwd(), 'src', 'data', 'items.json');
  if (!fs.existsSync(areasPath) || !fs.existsSync(itemsPath)) {
    console.error('areas.json or items.json not found. Run sync first.');
    process.exit(1);
  }

  const areas = JSON.parse(fs.readFileSync(areasPath, 'utf8'));
  const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
  const publishedItemKeys = new Set(
    items.filter((i: any) => i.status === 'published').map((i: any) => `${i.section}/${i.area_id}`)
  );
  const publishedAreas = areas.filter(
    (a: any) => a.status === 'published' && publishedItemKeys.has(`${a.section}/${a.area_id}`)
  );

  const sheetItems: string[] = [];

  for (const area of publishedAreas) {
    const secPath = area.section === 'exercise' ? 'exercise' : 'stretching';
    const url = `${BASE_URL}/${secPath}/${area.area_id}`;
    const filename = `${secPath}-${area.area_id}.png`;
    const dest = path.join(outDir, filename);

    await QRCode.toFile(dest, url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#12433A', // Brand color
        light: '#FFFFFF',
      },
    });
    console.log(`Generated QR for ${area.name_en} -> ${filename}`);

    // Convert image to base64 for embedding in the HTML sheet
    const b64 = fs.readFileSync(dest).toString('base64');

    sheetItems.push(`
      <div class="qr-item">
        <h2>${area.name_en}</h2>
        <p class="section-label">${area.section === 'stretching' ? 'Stretching' : 'Exercises'}</p>
        <img src="data:image/png;base64,${b64}" width="150" height="150" alt="QR Code for ${area.name_en}" />
        <p class="url">${url}</p>
      </div>
    `);
  }

  const htmlSheet = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Physiotherapy Area QR Codes</title>
      <style>
        body { font-family: "Helvetica Neue", Arial, sans-serif; padding: 20px; color: #17211D; }
        .header { text-align: center; margin-bottom: 40px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 30px; }
        .qr-item { text-align: center; border: 1px solid #ccc; padding: 15px; border-radius: 8px; page-break-inside: avoid; }
        .qr-item h2 { margin: 0 0 5px 0; font-size: 18px; }
        .section-label { margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #7C8C86; }
        .url { margin: 10px 0 0 0; font-size: 10px; color: #333; word-break: break-all; }
        @media print {
          body { padding: 0; }
          .grid { gap: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Patient Library QR Codes</h1>
        <p>Scan any code to open the specific exercise program on your phone.</p>
      </div>
      <div class="grid">
        ${sheetItems.join('\n')}
      </div>
    </body>
    </html>
  `;

  fs.writeFileSync(path.join(outDir, 'contact-sheet.html'), htmlSheet);
  console.log(`\nGenerated contact sheet at build-artifacts/qr/contact-sheet.html`);
}

generateQRCodes().catch(console.error);
