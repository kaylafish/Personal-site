// ============================================================================
// FRC REBUILT PAGE — COPY AND NUMBERS
// ----------------------------------------------------------------------------
// Everything written on /projects/frc-rebuilt that isn't a paragraph lives
// here. The layout is components/rebuiltpage.jsx; the 3D model is
// /public/models/rebuilt.glb.
//
// todo: true marks a value still to be filled in. It renders grey.
// ============================================================================

// The robot, one subsystem per tour stop, in tour order. `node` is the
// subsystem's assembly in the GLB (the top assembly's children). `explode`
// is how far it moves when the robot comes apart: a direction and a distance
// in robot sizes ('out' = horizontally away from the middle).
export const SUBSYSTEMS = [
  {
    node: 'Assembly 1 <2>', explode: ['down', 0.55],
    title: 'Drivetrain',
    body: 'Four SDS MK5n swerve modules on a tube frame, with the battery and bumpers packed in low.',
    specs: [
      { label: 'Modules', value: '4× SDS MK5n' },
      { label: 'Drive', value: 'Swerve' },
      { label: 'Top speed', value: 'to add', todo: true },
    ],
  },
  {
    node: 'Assembly 1 <1>', explode: ['up', 0.58],
    title: 'Superstructure',
    body: 'The frame everything else hangs from: aluminum tube and pocketed plate, cut on the team\'s CNC router.',
    specs: [
      { label: 'Material', value: 'Tube + plate' },
      { label: 'Made on', value: 'CNC router' },
      { label: 'Weight', value: 'to add', todo: true },
    ],
  },
  {
    node: 'Assembly 2 <1>', explode: ['out', 0.42],
    title: 'Intake',
    body: 'A rack-and-pinion linear intake on a 3:1 pulley reduction, with a passive kicker bar. Fully extended, it doubles as storage, and the code deploys it automatically in certain zones so it doesn\'t hit field elements.',
    specs: [
      { label: 'Extension', value: '3:1 pulley' },
      { label: 'Kicker', value: 'Passive bar' },
      { label: 'Extended', value: 'Storage' },
    ],
  },
  {
    node: 'Assembly 1 <4>', explode: ['up', 0.28],
    title: 'Dye rotor',
    body: 'A spinning indexer that lines game pieces up for the shooter. A slip ring carries power to the serializer motor so the rotor can turn without winding its cables.',
    specs: [
      { label: 'Feed rate', value: '15 balls/s' },
      { label: 'Power', value: 'Slip ring' },
      { label: 'Motor', value: 'Kraken X44' },
    ],
  },
  {
    node: 'Assembly 1 <3>', explode: ['up', 0.92],
    title: 'Shooter',
    body: 'A belt-driven turret on a 9 in bearing, an adjustable hood and a 4 in stainless flywheel on a Kraken X60. The turret has 380° of travel.',
    specs: [
      { label: 'Turret', value: 'Belt-driven' },
      { label: 'Travel', value: '380°' },
      { label: 'Flywheel', value: '4 in steel' },
    ],
  },
];

// Count-up numbers under the tour.
export const STATS = [
  { value: 15, unit: 'balls/s', label: 'Dye rotor feed rate into the shooter.' },
  { value: 380, unit: '°', label: 'Turret travel, from −370° to +10°.', attached: true },
  { value: 20, unit: 'ms', label: 'Supervisor loop: one mode chosen, every mechanism set.' },
  { value: 4, unit: 'shots', label: 'Measured on the field to build the shot table.' },
];

// The Supervisor's priority ladder, top to bottom. `does` is what each mode
// sets the intake, spindexer, hood and flywheel to.
export const MECHANISMS = ['Intake', 'Spindexer', 'Hood', 'Flywheel'];
export const MODES = [
  { name: 'UNJAMMING', color: '#2a78d6', when: 'Y held',
    does: ['roller off', 'reverse', 'stow', 'stop'],
    note: 'Unjam overrides everything, including shooting.' },
  { name: 'EJECTING', color: '#eb6834', when: 'X held',
    does: ['extend, roller out', 'reverse', 'stow', 'stop'],
    note: 'Eject runs the intake and spindexer backwards.' },
  { name: 'STOWED', color: '#1baf7a', when: 'B toggled on',
    does: ['retract', 'park at index', 'stow', 'stop'],
    note: 'Stow is a rising-edge toggle, so holding B doesn\'t re-trigger it.' },
  { name: 'SHOOTING', color: '#eda100', when: 'Right bumper held',
    does: ['extend, then agitate', 'feed when at speed', 'from shot table', 'from shot table'],
    note: 'Feeds only once the flywheel is within 200 RPM. If the hub blocks both shuttle targets, nothing fires.' },
  { name: 'POST_SHOOT', color: '#e87ba4', when: 'Right bumper released',
    does: ['extend', 'park at index', 're-zero, then stow', 'coast down'],
    note: 'Ends itself once the hood re-zeroes against its hard stop.' },
  { name: 'INTAKING', color: '#2fbf4f', when: 'Left bumper held',
    does: ['extend, roller in', 'stop', 'stow', 'stop'],
    note: 'Inside the trench the roller turns off but the intake stays out.' },
  { name: 'IDLE', color: '#8f7cf0', when: 'Nothing pressed',
    does: ['extend, roller off', 'stop', 'stow', 'stop'],
    note: 'Nothing pressed: intake out, everything else at rest.' },
];
// The mode phones show first, before anyone taps a row.
export const DEFAULT_MODE = 3;

// Driver controls. The two sticks are tinted blue.
export const CONTROLS = [
  { key: 'L', title: 'Left stick', detail: 'Drive (swerve)', stick: true },
  { key: 'R', title: 'Right stick', detail: 'Turn', stick: true },
  { key: 'LB', title: 'Intake', detail: 'Hold to intake' },
  { key: 'RB', title: 'Shoot', detail: 'Hub or shuttle, decided by position' },
  { key: 'B', title: 'Stow', detail: 'Toggle: tuck everything in' },
  { key: 'A', title: 'Target', detail: 'Cycles auto → hub → shuttle' },
];

// Shop photos at the end of the page.
export const SHOP_PHOTOS = [
  { src: '/assets/rebuilt/cnc.webp', alt: 'CNC router cutting an aluminum plate' },
  { src: '/assets/rebuilt/plate.webp', alt: 'Finished pocketed shooter plate' },
  { src: '/assets/rebuilt/me-plate.webp', alt: 'Mikayla holding a finished plate in the shop', position: '50% 40%' },
  { src: '/assets/rebuilt/robot.webp', alt: 'The robot on the bench mid-build' },
];
