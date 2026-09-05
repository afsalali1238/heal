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
    id: 'lower-back-general',
    regionId: 'lower-back',
    title: 'Understanding the lower back area',
    summary:
      'The lower back is the mobile, load-bearing part of the spine between the ribs and the pelvis. It bends, arches and turns, and it works together with the hips and trunk muscles.',
    structures: [
      'Bones and joints of the lowest part of the spine',
      'Discs and ligaments between the vertebrae',
      'Muscles of the back, abdomen and hips that move and support the area',
    ],
    commonDescriptions: [
      'Some people describe a stiff, achy or tight feeling that is worse after sitting or first thing in the morning.',
      'Sensations may stay in one spot or spread into the buttock or thigh.',
    ],
    whatToNotice: [
      'Whether position changes it — sitting, standing, bending or walking',
      'Whether it is easing, holding steady, or becoming more noticeable',
      'Whether it travels into the leg or stays in the back',
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
      'The hip is the ball-and-socket area where the thigh bone meets the pelvis. It carries body weight and moves the leg forwards, sideways and open.',
    structures: [
      'The ball at the top of the thigh bone and the socket in the pelvis',
      'Large muscles of the buttock and side of the hip',
      'Muscles at the front of the hip that pull the trunk and leg together',
    ],
    commonDescriptions: [
      'Some people describe a catch, a grind, or aching at the side or front of the hip.',
      'Pain at the side of the hip is often tender to lie on at night.',
    ],
    whatToNotice: [
      'Whether walking, stairs or getting in and out of a car changes it',
      'Whether the feeling is in the groin, the side, or the buttock',
      'Whether lying on that side is harder than usual',
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
      'The knee is the hinge between the thigh and the lower leg, with the kneecap gliding in front of it. It takes load in every step, so a change here shows up quickly.',
    structures: [
      'The ends of the thigh and shin bones',
      'The kneecap and the tendon in front of it',
      'Ligaments and cushioning tissues inside and around the joint',
    ],
    commonDescriptions: [
      'Some people describe stiffness after sitting, a catching feeling, or soreness on the stairs.',
      'The knee can feel unstable, swollen, or warm after activity.',
    ],
    whatToNotice: [
      'Which movements bring it on — bending, stairs, squatting or running',
      'Whether swelling appears afterwards',
      'Whether it is easing over days or becoming more frequent',
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
      'The ankle joins the foot to the lower leg and balances the whole body on a small base. It lifts the foot, points it, and turns it in and out.',
    structures: [
      'The ends of the two lower leg bones and the talus below them',
      'Ligaments on the inner and outer sides',
      'Tendons and muscles of the lower leg and foot',
    ],
    commonDescriptions: [
      'Some people describe stiffness on the first steps, soreness on uneven ground, or a feeling of unsteadiness.',
      'Swelling around the outer ankle is common after a twist.',
    ],
    whatToNotice: [
      'Whether mornings or rest make it stiffer',
      'Whether balance on one leg has changed',
      'Whether it gives way, or is only sore',
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
      'The elbow is the hinge between the upper arm and the forearm. Muscles that move the wrist and fingers cross it, which is why the source of a feeling at the elbow is often in the forearm.',
    structures: [
      'The ends of the upper arm and forearm bones',
      'Bony points on the inner and outer elbow',
      'Tendons where the forearm muscles attach',
    ],
    commonDescriptions: [
      'Some people describe soreness on the bony point at the outer or inner elbow.',
      'Gripping, lifting a cup or turning a door handle can make it more noticeable.',
    ],
    whatToNotice: [
      'Which grips and lifts change it',
      'Whether it is on the inner or outer side',
      'Whether the forearm muscles tire earlier than usual',
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
      'The wrist spans the space between the forearm and the hand. Bones, tendons and nerves all pass through it, so wrist sensations often travel into the hand or up the forearm.',
    structures: [
      'The small bones on the lower forearm and the base of the hand',
      'Ligaments that hold those bones together',
      'Tunnels and grooves that tendons and nerves pass through',
    ],
    commonDescriptions: [
      'Some people describe stiffness, aching, or a catching feeling when bending the wrist.',
      'Tingling in the fingers can come with it, particularly at night.',
    ],
    whatToNotice: [
      'Which positions bring it on — weight on an open hand, gripping, or bending',
      'Whether the fingers tingle, and which ones',
      'Whether it is easing or becoming more frequent',
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
  return EDUCATION_ENTRIES.find(
    (entry) => entry.regionId === regionId && entry.status === 'published'
  );
}
