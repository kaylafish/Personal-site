// ============================================================================
// HYDRO GENERATOR (IB Physics HL IA) — copy for components/hydropage.jsx.
// Every number is from the IA (May 2026). Only the three measured dots and
// the raw-data table are data; the slider readouts are the model and the fit.
// ============================================================================

// Scroll steps over the 3D rig (step 0 is the hero).
export const RIG_STEPS = [
  null,
  { kicker: 'The wheel', title: 'Printed buckets, 104.8 mm out.',
    body: 'The 3D-printed wheel rides a 7.5 in hex shaft between two flanged bearings. Two CNC-machined 48 × 12 in polycarbonate plates hold everything.' },
  { kicker: 'The drive', title: 'A motor, run backwards.',
    body: 'A 36T → 24T HTD belt spins the CIM 1.5× faster than the wheel. Driven by water instead of a battery, the motor becomes a generator: V = Kₑω.' },
  { kicker: 'The drop', title: 'Three heights, three trials.',
    body: 'A milk jug filled to the half-gallon mark is held above the wheel centre, then uncapped all at once. A voltmeter on the CIM terminals reads the peak.' },
];

// The drop step cycles through these: [height (m), label, mean peak].
export const DROPS = [[0.35, '0.35 m', '0.334 V'], [0.6, '0.60 m', '0.544 V'], [0.85, '0.85 m', '0.768 V']];

export const CHAIN = [
  { n: '01', kind: 'Energy', eq: 'v = √(2gh)', title: 'Fall',
    body: 'Potential energy mgh becomes kinetic energy ½mv² by the time the water reaches the wheel.' },
  { n: '02', kind: 'Rotation', eq: 'ω = v / r', title: 'Turn',
    body: 'Water hits the buckets tangentially, so the wheel’s rim moves at the water’s speed.' },
  { n: '03', kind: 'Pulleys', eq: 'ωₘ = 1.5 ω', title: 'Gear up',
    body: 'The 36T pulley on the wheel drives a 24T on the motor: 36 / 24 = 1.5.' },
  { n: '04', kind: 'Faraday', eq: 'V = Kₑ ωₘ', title: 'Generate',
    body: 'A coil spinning in a field induces an EMF. Kₑ = NBA is fixed by the motor’s geometry, motor or generator.' },
];

export const CALIBRATION = [
  { label: 'Encoder motor', value: '17 rev/s', detail: 'Commanded over CAN' },
  { label: 'In rad/s', value: '106.81', detail: '17 × 2π' },
  { label: 'CIM shaft', value: '59.34 rad/s', detail: 'Through 20T → 36T' },
  { label: 'Voltmeter', value: '1.84 V', detail: 'Steady state, CIM terminals' },
  { label: 'Back-EMF constant', value: 'Kₑ = 0.031', detail: 'V·s/rad, from V / ω', accent: true },
];

export const STATS = [
  { label: 'Measured k', value: '1.31 ± 0.06', detail: 'V·m⁻½, best fit' },
  { label: 'Predicted k', value: '1.97', detail: 'V·m⁻½, from Kₑ', accent: true },
  { label: 'Of ideal', value: '67%', detail: 'Gradient ratio, 1.31 / 1.97' },
];

// Raw peak voltages (V), three trials per height.
export const TRIALS = [
  { h: '0.350', t: ['0.322', '0.341', '0.339'], mean: '0.334 ± 0.010' },
  { h: '0.600', t: ['0.547', '0.552', '0.533'], mean: '0.544 ± 0.010' },
  { h: '0.850', t: ['0.718', '0.797', '0.789'], mean: '0.768 ± 0.040', wide: true },
];

export const WHY = [
  { value: '−0.450 V', title: 'A threshold',
    body: 'The fit misses the origin. Below some wheel speed, armature resistance and bearing friction eat the power before any useful voltage appears, so low drops read disproportionately low.' },
  { value: '33%', title: 'Losses add up',
    body: 'Water missing the buckets or striking at an angle, plus belt and bearing friction. The real impact radius is also smaller than the outer one, which partly hides the losses.' },
  { value: '4×', title: 'Messier at the top',
    body: 'At 0.85 m the trial range was 0.079 V, four times the 0.019 V at lower heights. Faster flow out of the jug is more turbulent, so how much water hits the buckets cleanly varies more.' },
];

export const FIXES = [
  { limit: 'Kₑ calibrated at one speed', fix: 'Calibrate at 5–10 encoder speeds and use the gradient of V against ω.' },
  { limit: 'Only three heights', fix: 'Test 8–10 heights from 0.20 to 1.00 m in 0.10 m steps.' },
  { limit: 'Flow falls as the jug drains', fix: 'Use a constant-head tank with a fixed level and a calibrated nozzle.' },
  { limit: 'Peak read by eye', fix: 'Log voltage at ≥ 100 Hz with the CANivore and laptop already in the setup.' },
  { limit: 'Impact radius assumed', fix: 'Measure where the water actually hits the buckets with calipers, and use that radius.' },
];

// Photos at the bottom of the page, in build order.
export const PHOTOS = [
  { src: '/assets/hydro/cnc.webp', w: 1600, h: 900,
    alt: 'Polycarbonate sheet on the team’s CNC router', caption: 'Cutting the polycarbonate plates on the CNC' },
  { src: '/assets/hydro/rig-bench.webp', w: 1200, h: 1600,
    alt: 'The assembled rig standing on a workbench in the robotics shop', caption: 'The rig, assembled in the shop' },
  { src: '/assets/hydro/assembly.webp', w: 1200, h: 1600,
    alt: 'Working on the wheel at the base of the rig', caption: 'Fitting the wheel' },
  { src: '/assets/hydro/calibration.webp', w: 1600, h: 1200,
    alt: 'Laptop, wiring and CAN hardware on a workbench', caption: 'Kₑ calibration: an encoder motor driven over CAN from a laptop' },
  { src: '/assets/hydro/whiteboard.webp', w: 1600, h: 1200,
    alt: 'Whiteboard working from V = Kₑω to Kₑ = 0.031', caption: 'Working out Kₑ on the whiteboard' },
  { src: '/assets/hydro/trial.webp', w: 900, h: 1600,
    alt: 'A jug of water held above the rig during a trial', caption: 'A trial: the jug uncapped above the wheel' },
];
