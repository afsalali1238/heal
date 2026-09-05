import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { NECK_MOTION_FRAME } from '../src/lib/motion/motion-framing.ts';

// Dynamic import for TS module
const poseModule = await import('../src/lib/anatomy/geometry/pose.ts');
const { buildFigure, limbPath, torsoPath, tweenPose } = poseModule;

const INK = '#334155';

function figureSvg(pose, view, colour) {
  const f = buildFigure(pose, view);
  const limbs = f.limbs
    .map(
      (l) =>
        `<path d="${limbPath(l.points)}" stroke="${colour}" stroke-width="${l.width}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    )
    .join('');
  // Neck motion is too small to read in a full-body frame. Crop to the head,
  // shoulders and upper torso without changing any joint or motion values.
  return `<svg viewBox="${NECK_MOTION_FRAME.viewBox}" width="${NECK_MOTION_FRAME.width}" height="${NECK_MOTION_FRAME.height}" aria-label="Prototype side-view movement figure">
    <g opacity="1">
      ${limbs}
      <path d="${torsoPath(f.torso)}" fill="${colour}"/>
      <circle cx="${f.headCentre[0].toFixed(1)}" cy="${f.headCentre[1].toFixed(1)}" r="${f.headRadius.toFixed(1)}" fill="${colour}"/>
    </g>
  </svg>`;
}

const item = {
  id: 'ex-neck-02',
  name: 'Chin Tuck',
  view: 'side',
  start: { chinSlide: 14, trunk: 2 },
  end: { chinSlide: -10, trunk: 2 },
};

async function main() {
  const dir = 'build-artifacts/motion/ex-neck-02/frames';
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 640, height: 640 });

  // 120 frames at 30 fps = 4 seconds
  for (let i = 0; i < 120; i++) {
    let t = 0;
    if (i > 15 && i <= 45) {
      t = (i - 15) / 30;
    } else if (i > 45 && i <= 90) {
      t = 1;
    } else if (i > 90) {
      t = 1 - (i - 90) / 30;
    }

    // Smooth step interpolation
    t = t * t * (3 - 2 * t);

    const pose = tweenPose(item.start, item.end, t);
    const svgStr = figureSvg(pose, item.view, INK);

    const html = `
      <style>body { margin: 0; display: flex; justify-content: center; align-items: center; background: white; height: 100vh; font-family: sans-serif; }</style>
      <div style="position: absolute; top: 20px; left: 20px; color: #64748b; font-weight: bold;">PROTOTYPE — NOT CLINICALLY REVIEWED</div>
      <div style="position: absolute; bottom: 20px; right: 20px; color: #94a3b8; font-size: 12px;">Frame ${String(i).padStart(3, '0')}</div>
      ${svgStr}
    `;

    await page.setContent(html);
    const framePath = `${dir}/frame_${String(i).padStart(3, '0')}.png`;
    await page.screenshot({ path: framePath });
  }
  await browser.close();

  const poster = 'public/exercise-media/prototypes/ex-neck-02/ex-neck-02-poster.png';
  copyFileSync(`${dir}/frame_000.png`, poster);

  console.log('Frames generated. Stitching with ffmpeg...');
  const outVideo = 'public/exercise-media/prototypes/ex-neck-02/ex-neck-02-motion.mp4';

  // Create video using ffmpeg
  try {
    execSync(
      `ffmpeg -y -framerate 30 -i "${dir}/frame_%03d.png" -c:v libx264 -pix_fmt yuv420p "${outVideo}"`,
      { stdio: 'inherit' }
    );
    console.log('Video generated at ' + outVideo);
  } catch (e) {
    console.error('ffmpeg failed:', e.message);
  }
}

main().catch(console.error);
