export interface MotionFrame {
  readonly viewBox: string;
  readonly width: number;
  readonly height: number;
}

/** Stable crop for small-range neck demonstrations; preserves head and torso context. */
export const NECK_MOTION_FRAME: MotionFrame = {
  viewBox: '18 0 164 310',
  width: 500,
  height: 500,
};

export function validateMotionFrame(frame: MotionFrame): string[] {
  const errors: string[] = [];
  const values = frame.viewBox.split(/\s+/).map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value)))
    errors.push('Motion frame viewBox must contain four finite numbers.');
  if (frame.width <= 0 || frame.height <= 0)
    errors.push('Motion frame dimensions must be positive.');
  if (frame.width / frame.height < 0.8 || frame.width / frame.height > 1.2)
    errors.push('Motion frame must remain near-square for the poster player.');
  return errors;
}
