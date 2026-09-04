import { assertValidEducationEntries } from '../../lib/anatomy/education-validation';

export type EducationStatus = 'draft' | 'published' | 'retired';

export type EducationEntry = {
  id: string;
  regionId: string;
  title: string;
  summary: string;
  structures: string[];
  commonDescriptions: string[];
  whatToNotice: string[];
  whenToSeekHelp: string[];
  notADiagnosis: string;
  status: EducationStatus;
  reviewedBy: string;
  reviewedDate: string;
  sourceOrRationale: string;
  version: string;
};

const DRAFT_REVIEW = {
  status: 'draft' as const,
  reviewedBy: '',
  reviewedDate: '',
  sourceOrRationale:
    'Draft orientation content based on the Anatomy Explorer product schema and clinical governance rules. Physiotherapist review is required before publication.',
  version: '0.1-draft',
};

export const EDUCATION_ENTRIES: EducationEntry[] = [
  {
    id: 'neck-general',
    regionId: 'neck',
    title: 'Understanding the neck area',
    summary:
      'The neck connects the head with the upper trunk and supports movement in several directions. This overview uses broad, everyday anatomy language.',
    structures: [
      'Bones and joints of the cervical spine',
      'Muscles and connective tissues around the neck and upper shoulders',
      'Nerves and other soft tissues that pass through the area',
    ],
    commonDescriptions: [
      'Some people describe aching, stiffness, tightness, or discomfort with movement.',
      'Sensations can be felt at the front, side, or back of the neck.',
    ],
    whatToNotice: [
      'Whether the sensation changes with position or gentle movement',
      'Whether it stays in one area or is also felt elsewhere',
      'Whether it is stable, improving, or becoming more noticeable',
    ],
    whenToSeekHelp: [
      'Consider speaking with a clinician if discomfort is persistent, worsening, or affecting usual activities.',
      'Use urgent medical care if a configured safety-check symptom applies.',
    ],
    notADiagnosis:
      'This information describes the body area only. It does not identify the cause of discomfort or replace an assessment by a qualified clinician.',
    ...DRAFT_REVIEW,
  },
  {
    id: 'shoulder-general',
    regionId: 'shoulder',
    title: 'Understanding the shoulder area',
    summary:
      'The shoulder is a mobile area where the upper arm meets the trunk. Movement here is shared across several joints and surrounding tissues.',
    structures: [
      'The upper arm bone, shoulder blade, and collarbone',
      'Joints that coordinate arm and shoulder-blade movement',
      'Muscles, tendons, and other soft tissues around the shoulder',
    ],
    commonDescriptions: [
      'Some people describe aching, stiffness, catching, or discomfort when reaching.',
      'Sensations can be felt at the front, top, back, or outer upper arm.',
    ],
    whatToNotice: [
      'Which arm positions make the sensation more or less noticeable',
      'Whether it stays near the shoulder or is also felt elsewhere',
      'Whether usual reaching, lifting, or resting positions have changed',
    ],
    whenToSeekHelp: [
      'Consider speaking with a clinician if discomfort is persistent, worsening, or affecting usual activities.',
      'Use urgent medical care if a configured safety-check symptom applies.',
    ],
    notADiagnosis:
      'This information describes the body area only. It does not identify the cause of discomfort or replace an assessment by a qualified clinician.',
    ...DRAFT_REVIEW,
  },
  {
    id: 'elbow-general',
    regionId: 'elbow',
    title: 'Understanding the elbow area',
    summary:
      'The elbow is the hinge between the upper arm and the forearm. It bends and straightens the arm and helps turn the palm.',
    structures: [
      'The upper arm bone and the two forearm bones meeting at the joint',
      'Muscles and tendons above and below the elbow that move the wrist and hand',
      'Soft tissues around the inner, outer, and point of the elbow',
    ],
    commonDescriptions: [
      'Some people describe aching, stiffness, or discomfort when bending, straightening, or gripping.',
      'Sensations can be felt at the outer elbow, inner elbow, or point of the elbow.',
    ],
    whatToNotice: [
      'Which movements — bending, straightening, lifting, or gripping — make the sensation more noticeable',
      'Whether it stays at the elbow or is also felt in the forearm or hand',
      'Whether it is stable, improving, or becoming more noticeable',
    ],
    whenToSeekHelp: [
      'Consider speaking with a clinician if discomfort is persistent, worsening, or affecting usual activities.',
      'Use urgent medical care if a configured safety-check symptom applies.',
    ],
    notADiagnosis:
      'This information describes the body area only. It does not identify the cause of discomfort or replace an assessment by a qualified clinician.',
    ...DRAFT_REVIEW,
  },
  {
    id: 'wrist-general',
    regionId: 'wrist',
    title: 'Understanding the wrist area',
    summary:
      'The wrist is a set of small joints between the forearm and the hand. It positions the hand for everyday gripping, lifting, and carrying.',
    structures: [
      'The two forearm bones and the small bones of the wrist',
      'Tendons passing through the wrist that move the fingers and thumb',
      'Soft tissues around the back, palm side, and thumb side of the wrist',
    ],
    commonDescriptions: [
      'Some people describe aching, stiffness, or discomfort when bending the wrist, gripping, or bearing weight through the hand.',
      'Sensations can be felt at the back, palm side, or thumb side of the wrist.',
    ],
    whatToNotice: [
      'Which hand positions — bent, straight, gripping, or weight-bearing — make the sensation more noticeable',
      'Whether it stays at the wrist or is also felt in the hand or forearm',
      'Whether usual gripping or lifting has changed',
    ],
    whenToSeekHelp: [
      'Consider speaking with a clinician if discomfort is persistent, worsening, or affecting usual activities.',
      'Use urgent medical care if a configured safety-check symptom applies.',
    ],
    notADiagnosis:
      'This information describes the body area only. It does not identify the cause of discomfort or replace an assessment by a qualified clinician.',
    ...DRAFT_REVIEW,
  },
  {
    id: 'lower-back-general',
    regionId: 'lower-back',
    title: 'Understanding the lower back area',
    summary:
      'The lower back connects the trunk with the pelvis and supports upright posture, bending, and twisting in everyday movement.',
    structures: [
      'Bones and joints of the lower spine',
      'Muscles and connective tissues across the centre and sides of the lower back',
      'Soft tissues linking the lower back with the pelvis and hips',
    ],
    commonDescriptions: [
      'Some people describe aching, stiffness, tightness, or discomfort with bending, standing, or sitting.',
      'Sensations can be felt at the centre, one side, or low down towards the buttock.',
    ],
    whatToNotice: [
      'Which positions — sitting, standing, bending, or lying — make the sensation more or less noticeable',
      'Whether it stays in the lower back or is also felt elsewhere',
      'Whether it is stable, improving, or becoming more noticeable',
    ],
    whenToSeekHelp: [
      'Consider speaking with a clinician if discomfort is persistent, worsening, or affecting usual activities.',
      'Use urgent medical care if a configured safety-check symptom applies.',
    ],
    notADiagnosis:
      'This information describes the body area only. It does not identify the cause of discomfort or replace an assessment by a qualified clinician.',
    ...DRAFT_REVIEW,
  },
  {
    id: 'hip-general',
    regionId: 'hip',
    title: 'Understanding the hip area',
    summary:
      'The hip joins the leg with the pelvis. It carries body weight in standing and walking and allows the leg to move in several directions.',
    structures: [
      'The thigh bone and its joint with the pelvis',
      'Muscles around the front, side, and back of the hip and buttock',
      'Soft tissues linking the hip with the lower back and thigh',
    ],
    commonDescriptions: [
      'Some people describe aching, stiffness, tightness, or discomfort when walking, standing, or changing position.',
      'Sensations can be felt at the front of the hip and groin, the side of the hip, or the back of the hip and buttock.',
    ],
    whatToNotice: [
      'Which activities — walking, standing, sitting, or changing position — make the sensation more noticeable',
      'Whether it stays near the hip or is also felt elsewhere',
      'Whether usual walking or stair use has changed',
    ],
    whenToSeekHelp: [
      'Consider speaking with a clinician if discomfort is persistent, worsening, or affecting usual activities.',
      'Use urgent medical care if a configured safety-check symptom applies.',
    ],
    notADiagnosis:
      'This information describes the body area only. It does not identify the cause of discomfort or replace an assessment by a qualified clinician.',
    ...DRAFT_REVIEW,
  },
  {
    id: 'knee-general',
    regionId: 'knee',
    title: 'Understanding the knee area',
    summary:
      'The knee joins the thigh with the lower leg. It bends and straightens with every step and steadies the leg under load.',
    structures: [
      'The thigh bone, shin bone, and kneecap meeting at the joint',
      'Muscles at the front and back of the thigh that move and steady the knee',
      'Soft tissues around the front, inner side, outer side, and back of the knee',
    ],
    commonDescriptions: [
      'Some people describe aching, stiffness, catching, or discomfort with bending, straightening, or stairs.',
      'Sensations can be felt at the front and kneecap, the inner or outer side, or the back of the knee.',
    ],
    whatToNotice: [
      'Which movements — bending, straightening, stairs, or kneeling — make the sensation more noticeable',
      'Whether it stays at the knee or is also felt above or below it',
      'Whether usual walking or stair use has changed',
    ],
    whenToSeekHelp: [
      'Consider speaking with a clinician if discomfort is persistent, worsening, or affecting usual activities.',
      'Use urgent medical care if a configured safety-check symptom applies.',
    ],
    notADiagnosis:
      'This information describes the body area only. It does not identify the cause of discomfort or replace an assessment by a qualified clinician.',
    ...DRAFT_REVIEW,
  },
  {
    id: 'ankle-general',
    regionId: 'ankle',
    title: 'Understanding the ankle area',
    summary:
      'The ankle joins the lower leg with the foot. It adapts the foot to the ground and helps push the body forward when walking.',
    structures: [
      'The shin bones and the foot bones meeting at the joint',
      'Muscles of the calf and shin whose tendons cross the ankle',
      'Soft tissues around the outer ankle, inner ankle, and front and back of the ankle',
    ],
    commonDescriptions: [
      'Some people describe aching, stiffness, or discomfort when walking, standing, or moving the foot up and down.',
      'Sensations can be felt at the outer ankle, inner ankle, front of the ankle, or back of the ankle and heel cord.',
    ],
    whatToNotice: [
      'Which activities — walking, standing, stairs, or uneven ground — make the sensation more noticeable',
      'Whether it stays at the ankle or is also felt in the foot or lower leg',
      'Whether usual walking or balance has changed',
    ],
    whenToSeekHelp: [
      'Consider speaking with a clinician if discomfort is persistent, worsening, or affecting usual activities.',
      'Use urgent medical care if a configured safety-check symptom applies.',
    ],
    notADiagnosis:
      'This information describes the body area only. It does not identify the cause of discomfort or replace an assessment by a qualified clinician.',
    ...DRAFT_REVIEW,
  },
];

assertValidEducationEntries(EDUCATION_ENTRIES);

export function findEducationEntry(regionId: string | undefined): EducationEntry | undefined {
  return EDUCATION_ENTRIES.find((entry) => entry.regionId === regionId && entry.status === 'published');
}
