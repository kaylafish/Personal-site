// ============================================================================
// CANARD ROLL REVERSAL — copy and numbers for /projects/canard-roll-reversal
// ----------------------------------------------------------------------------
// The scroll story at the top of the page reads from here. The write-up below
// it is in components/researchpage.jsx.
//
// Rules from the research write-up (keep them when editing):
//   - Everything is simulation only.
//   - Only the 5° peak and 7° zero (team CFD, 130 m/s) are data. The curve
//     shape is a placeholder and the chart caption says so.
//   - The per-canard extremum seeker is in design, not built. No result is
//     attributed to it; the 95% figure is an oracle upper bound.
// ============================================================================

// Hero image. Leave src empty to show an empty frame. drawing: true shows it
// whole on the grid background (for line drawings) instead of filling the card.
export const HERO_PHOTO = {
  src: '/assets/research/voyager-profile.webp',
  alt: 'Side profile of the rocket from OpenRocket: nose cone, canards, recovery bays and tail fins',
  drawing: true,
};

export const HEADLINE = ['More canard.', 'Less roll.'];

export const STATEMENT =
  'Canards steer a rocket from the nose. On this one, their wake hits the tail fins. Past about 5° the roll they make shrinks. Past 7°, it reverses.';

// Net roll vs. one canard's effective incidence, 0–12° in 0.1° steps.
// Shape is a placeholder (see roll_curve_nominal.csv in the research repo).
export const CURVE = [0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1,1.1,1.202,1.303,1.405,1.507,1.608,1.708,1.807,1.904,2,2.096,2.192,2.288,2.384,2.478,2.571,2.659,2.745,2.825,2.9,2.972,3.043,3.113,3.181,3.246,3.307,3.364,3.416,3.461,3.5,3.536,3.571,3.606,3.639,3.669,3.696,3.718,3.735,3.746,3.75,3.725,3.656,3.549,3.41,3.247,3.067,2.875,2.679,2.485,2.3,2.109,1.894,1.661,1.415,1.164,.911,.662,.424,.201,0,-.188,-.374,-.556,-.733,-.903,-1.064,-1.217,-1.358,-1.486,-1.6,-1.704,-1.803,-1.896,-1.984,-2.067,-2.144,-2.216,-2.283,-2.344,-2.4,-2.453,-2.504,-2.554,-2.601,-2.645,-2.686,-2.722,-2.754,-2.78,-2.8,-2.817,-2.833,-2.849,-2.865,-2.88,-2.894,-2.907,-2.92,-2.932,-2.943,-2.953,-2.963,-2.971,-2.978,-2.985,-2.99,-2.994,-2.998,-2.999,-3];

export const CURVE_STAGES = [
  ['Small angle, more roll.', 'For small deflections the canards behave. More angle gives more roll, and that straight line is exactly what a standard controller assumes.'],
  ['Then it peaks near 5°.', 'The canard’s tip vortex starts reaching the much larger tail fins and twisting them the other way. Asking for more now gets you less.'],
  ['At 7° it pushes the wrong way.', 'Past the zero, a controller that pushes harder when it falls behind is feeding itself. That is positive feedback, and it ends in a spin.'],
  ['So stay well below it.', 'A fixed 3° cap, the peak minus a typical flow angle, held roll in 396 of 400 held-out conditions. Adaptive caps, even tuned, did not beat it.'],
];

export const STATS = [
  { label: 'Simulated flights, about 1,660 of them in RocketPy 6-DOF.', to: 40000, format: (v, done) => Math.round(v).toLocaleString('en-US') + (done ? '+' : '') },
  { label: 'Held-out conditions where a fixed 3° cap with roll priority held roll.', to: 396, format: (v) => Math.round(v), unit: '/400' },
  { label: 'Median final roll error with the INDI loop, down from 3.25°.', from: 3.25, to: 0.05, format: (v) => v.toFixed(2) + '°' },
  { label: 'Change in aerodynamic force between rail exit and top speed.', from: 1, to: 19, format: (v) => Math.round(v) + '×' },
];

// Before / after dot grid: one dot per simulated condition.
export const COMPARE = {
  n: 300, before: 201, after: 263,
  beforeLabel: 'Fixed 3° cap + roll priority',
  afterLabel: '+ INDI roll loop',
  note: '300 conditions with fin misalignment up to ±0.1°. Paired McNemar: 64–2, p = 6×10⁻¹⁷.',
};

export const ARCH_STEPS = [
  ['An LQR holds attitude.', '10 states: three attitude errors, three body rates and the four actual servo angles, so the gains account for servo lag. Re-solved for every airspeed.'],
  ['INDI cancels what the model misses.', 'It measures roll acceleration and cancels steady moments, like a 0.1° fin misalignment, without needing a model of them.'],
  ['Roll gets the authority first.', 'Four canards share three axes. The allocator fits roll first, then pitch and yaw, inside each canard’s limit.'],
  ['Four servos. ±10°. About 30 ms.', 'The simulations sample servo lag between 15 and 60 ms.'],
  ['The plant: a peaked curve per canard.', 'Wind and angle of attack put opposite canards at different points on the curve, and airspeed rescales everything.'],
  ['Measure, feed back, repeat.', 'Rates, attitude and servo angles close the loop. Idealized in simulation, with 0.5°/s gyro noise in the INDI test.'],
  ['Next: find each peak, live.', 'A per-canard extremum seeker adds an 8 Hz dither, measures each canard’s slope and holds it at peak minus a margin. In design, not built yet.'],
];
export const ARCH_PILLS = ['LQR', 'INDI roll loop', 'Allocator', '4 servos', 'Rocket', 'Sensors', 'Peak finder'];
