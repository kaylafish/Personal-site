// Copy and constants for the Quetzy page (components/quetzypage.jsx), from
// Claude Design's "Quetzy Page" handoff. Numbers come from the robot's code
// (frc4255/2023_Quetzy, main, last commit 28 Oct 2023).

// The pinned 3D tour: one stop per subsystem. `focus` is the group the
// viewer keeps solid (quetzyview.jsx).
export const TOUR = [
  {
    focus: 'drive', kicker: 'Drivetrain', title: 'Swerve drive',
    body: 'SDS MK4i L2 modules, so the robot drives and turns independently relative to the field. A NavX gyro gives heading and CANCoders give absolute steering angles.',
    facts: [['Motors', '8 Falcon 500'], ['Gyro', 'NavX'], ['Base', 'Team 364 template']],
  },
  {
    focus: 'arm', kicker: 'Arm and wrist', title: 'Two-joint arm',
    body: 'Two Falcons drive the arm and one drives the wrist. REV Through Bore absolute encoders on both joints mean the arm knows where it is the moment the robot turns on.',
    facts: [['Motors', '2 arm · 1 wrist'], ['Encoders', 'REV Through Bore'], ['Control', 'profile + FF + P']],
  },
  {
    focus: 'intake', kicker: 'Intake', title: 'Roller intake',
    body: 'A single roller spins one way for cubes and the other for cones. There are no pneumatics anywhere on the robot.',
    facts: [['Motor', '1 Falcon 500'], ['Sensors', 'none: stator current'], ['Pneumatics', 'none']],
  },
];

export const RESULTS = [
  { k: 'Silicon Valley Regional', v: '3rd', d: 'qualification rank' },
  { k: 'Monterey Bay Regional', v: '7th', d: 'qualification rank' },
  { k: 'EPA, 2023', v: '21st', d: 'worldwide' },
];

export const STATS = [
  { k: 'Java', v: '~2,750', d: 'lines in 41 files' },
  { k: 'Commits', v: '82', d: 'Jan to Oct 2023' },
  { k: 'Falcon 500s', v: '12', d: '8 swerve · 2 arm · 1 wrist · 1 intake' },
  { k: 'Controller', v: '1', d: 'Xbox, drives and scores' },
];

// Arm and wrist presets in radians, [arm, wrist], per mode. Arm 0 is
// horizontal; the wrist angle is absolute.
export const TABLE = {
  cone: { stow: [-1.38, 1.29], low: [-1.38, 0.10], mid: [-0.70, 1.00], high: [0.32, 0.52], shelf: [0.42, 0.30], single: [-0.87, 1.24] },
  cube: { stow: [-1.38, 1.29], low: [-1.38, 0.03], mid: [-0.65, 0.88], high: [0.15, 0.87], shelf: [0.16, 0.34], single: [-0.67, 1.24] },
};
export const PRESETS = [['stow', 'Stow'], ['low', 'Low'], ['mid', 'Mid'], ['high', 'High'], ['shelf', 'Shelf'], ['single', 'Single sub']];
// [max velocity rad/s, max acceleration rad/s²]
export const LIMITS = { arm: [3.5, 4.25], wrist: [3, 3.75] };
// The staggered joint waits this long (s).
export const STAGGER = 0.4;

export const CONE = '#f0b429';
export const CUBE = '#8b6cf0';

export const INTAKE_FACTS = [
  { k: 'Threshold', v: '50 A', d: 'stator current: piece is in, controller rumbles', c: '' },
  { k: 'Cone hold', v: '−7%', d: 'after release', c: CONE },
  { k: 'Cube hold', v: '+7%', d: 'after release', c: CUBE },
];

// RobotState. `led` is the strip's CSS background, `anim` its animation
// (quetzy.css), `next` the transitions out as [why, to].
export const STATES = [
  {
    id: 'IDLE', when: 'the robot boots', code: '−0.99', pat: 'rainbow',
    led: 'linear-gradient(90deg,#e5484d,#f0b429,#3fb950,#4f8ff7,#8b6cf0,#e5484d,#f0b429,#3fb950,#4f8ff7,#8b6cf0,#e5484d)',
    glow: 'rgba(143,184,247,.35)', anim: 'flow',
    does: 'The arm and wrist read the cone table by default.',
    next: [['teleop starts (from any state)', 'CONE'], ['an autonomous routine switches to cubes', 'CUBE']],
  },
  {
    id: 'CONE', when: 'teleop starts, or Y', code: '+0.69', pat: 'solid yellow',
    led: CONE, glow: 'rgba(240,180,41,.6)', anim: '',
    does: 'Presets read the cone table. When the intake stops it holds the cone at −7%.',
    next: [['X button', 'CUBE'], ['arm or wrist encoder unplugged', 'ENCODER_DISCONNECTED']],
  },
  {
    id: 'CUBE', when: 'X, or auto switches to cubes', code: '+0.91', pat: 'solid violet',
    led: CUBE, glow: 'rgba(139,108,240,.6)', anim: '',
    does: 'Presets read the cube table. When the intake stops it holds the cube at +7%.',
    next: [['Y button', 'CONE'], ['auto-balance command starts', 'NOT_BALANCED'], ['arm or wrist encoder unplugged', 'ENCODER_DISCONNECTED']],
  },
  {
    id: 'NOT_BALANCED', when: 'auto-balance starts', code: '−0.91', pat: 'rainbow, forest palette',
    led: 'linear-gradient(90deg,#0f6b2e,#3fb950,#1a9e6a,#0f6b2e,#3fb950,#1a9e6a,#0f6b2e)',
    glow: 'rgba(63,185,80,.45)', anim: 'flow',
    does: 'Two PD loops drive the robot uphill on pitch and roll.',
    next: [['pitch and roll both within 2.5°', 'BALANCED']],
  },
  {
    id: 'BALANCED', when: 'pitch and roll within 2.5°', code: '+0.93', pat: 'solid white',
    led: '#ffffff', glow: 'rgba(255,255,255,.55)', anim: '',
    does: 'Level on the charge station.',
    next: [['teleop starts', 'CONE']],
  },
  {
    id: 'ENCODER_DISCONNECTED', when: 'arm or wrist encoder stops reporting', code: '−0.11', pat: 'strobe, red',
    led: '#e5484d', glow: 'rgba(229,72,77,.6)', anim: 'strobe',
    does: 'Position control switches off, the motors stop and new moves are refused.',
    next: [],
  },
];

export const LAYERS = [
  { t: 'How subsystems read it', b: 'Arm and wrist each keep a cone table and a cube table, and look up the state when a preset is commanded: cube table in CUBE, cone table otherwise. The intake checks the state when it stops.' },
  { t: 'Presets', b: 'Each preset sets a goal and runs until the joint is within tolerance (0.06 rad arm, 0.08 rad wrist). The subsystem keeps holding the position on its own afterwards.' },
  { t: 'Command scheduler', b: 'Every action is a command that claims its subsystems. Pressing stow mid-move interrupts the old command cleanly, and autonomous routines are the same commands composed in sequence and in parallel.' },
];

export const AUTO_FIG = {
  src: '/assets/quetzy/auto-paths-dark.webp', w: 2400, h: 1264,
  alt: 'Three top-down field maps showing the robot’s path for the one-piece, two-piece and three-piece autonomous routines',
};

export const PHOTOS = [
  { src: '/assets/quetzy/charge-station.webp', w: 1600, h: 1200, cap: 'Quetzy (4255) next to teams 8521 and 199 at the charge station.', alt: 'Three robots at the charge station during a match, Quetzy in blue bumpers on the right' },
  { src: '/assets/quetzy/practice.webp', w: 1600, h: 2133, cap: 'Heading to the venue on the cart.', alt: 'A team member pushes Quetzy on a green cart across a campus lawn' },
  { src: '/assets/quetzy/field-repair.webp', w: 1600, h: 1200, cap: 'Working on the robot on the field between matches.', alt: 'Three team members working on Quetzy, in red bumpers, on the competition field' },
  { src: '/assets/quetzy/cart.webp', w: 1600, h: 1067, cap: 'Practice outside, with the arm out to a wooden scoring station.', alt: 'Quetzy outdoors with its arm extended toward a wooden practice structure' },
  { src: '/assets/quetzy/intake.webp', w: 1600, h: 1067, cap: 'The intake: two rows of compliant wheels on one roller drive.', alt: 'Close-up of the intake rollers and side plate' },
];
