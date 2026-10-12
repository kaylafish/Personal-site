// ============================================================================
// MAGNUS EFFECT — copy and numbers for /projects/magnus-effect
// (components/magnuspage.jsx). Every number comes from the IB Physics
// Extended Essay (May 2026); don't round them differently.
// ============================================================================

// Flight-model constants (the essay's fitted values).
export const BALL = { m: 0.227, D: 0.150, rho: 1.204, g: 9.81, CD: 0.4441, wall: 3.0 };
// C_L(S) = 0.92|S| + 0.003
export const CL_FIT = { slope: 0.92, intercept: 0.003 };

// Right-edge dots: [section id, label].
export const CHAPTERS = [
  ['ch-top', 'Overview'], ['ch-setup', 'Setup'], ['ch-method', 'Method'],
  ['ch-results', 'Results'], ['ch-limits', 'Limitations'], ['ch-writeup', 'Write-up'],
];

// The pinned 3D launcher: one card per scroll step, and what the model does.
//   explode 0–1, focus '' or 'wheels', top / bottom wheel speeds (rad/s)
export const TOUR = [
  { k: 'Setup', t: 'The experiment.', b: 'A two-wheel launcher built for the essay. The ball leaves horizontally, 2 m above the floor, and hits a wall 3 m away.',
    view: { explode: 0, focus: '', top: 0, bottom: 0 } },
  { k: 'Launcher', t: 'Two wheel pairs.', b: 'Two pairs of 4 in Colson wheels sit above and below the ball. Each pair has its own Kraken X60, driven through an HTD belt.',
    view: { explode: 0, focus: 'wheels', top: 0, bottom: 0 } },
  { k: 'Spin', t: 'The difference sets the spin.', b: 'Equal wheel speeds give a no-spin shot. Running the top wheels faster gives backspin, and the reverse gives topspin. Speeds were tuned by trial and error, then held fixed for each condition’s ten trials.',
    view: { explode: 0, focus: 'wheels', top: 16, bottom: 9 } },
  { k: 'Measurement', t: 'Filmed at 240 fps.', b: 'One camera at the launcher measures launch speed and spin. A second at the wall reads the height where the ball first hits.',
    view: { explode: 0, focus: '', top: 12, bottom: 12 } },
];

export const FACTS = [
  { k: 'Ball', v: '150 mm', d: 'Smooth foam sphere, 227 g' },
  { k: 'Launch', v: '8–12 m/s', d: 'Horizontal, 2 m up, 3 m to the wall' },
  { k: 'Cameras', v: '240 fps', d: 'One at the launcher, one at the wall' },
  { k: 'Trials', v: '50', d: 'Five spin conditions, ten each' },
];

export const STEPS = [
  { n: '01', t: 'Measure', b: 'Launch speed from the frames the ball takes to cross 0.9 m of a meterstick. Spin from the frames a Sharpie mark takes to make one turn. Height at the wall from a second camera.' },
  { n: '02', t: 'Model', b: 'Gravity, quadratic drag and Magnus lift, integrated step by step with RK4 from each trial’s measured launch speed and spin.' },
  { n: '03', t: 'Fit', b: 'Fit the drag coefficient on the no-spin trials, then fit the lift coefficient for each spin condition by minimising χ² between predicted and measured wall heights.' },
];

// Table 2: condition, S, C_L, ±σ, χ²_red, +1 backspin / −1 topspin.
export const RESULTS = [
  { name: 'Low backspin', S: 0.1144, CL: 0.1076, sigma: 0.0217, chi: 0.857, sign: 1 },
  { name: 'High backspin', S: 0.3090, CL: 0.3061, sigma: 0.0219, chi: 2.811, sign: 1 },
  { name: 'Low topspin', S: 0.1119, CL: 0.0919, sigma: 0.0215, chi: 0.665, sign: -1 },
  { name: 'High topspin', S: 0.2997, CL: 0.2544, sigma: 0.0212, chi: 1.106, sign: -1 },
];
