// ============================================================================
// COYNEINATOR (FRC 4255, 2025 Reefscape) — copy for
// components/coyneinatorpage.jsx, from Claude Design's "Coyneinator Page".
// The numbers are the robot code's setpoints and limits; the route timings
// are simulated from those limits, not a robot log.
// ============================================================================

// The 3D tour, one stop per subsystem. `focus` keys are CFG in
// components/coyneview.jsx; each feature pill re-focuses the model.
export const TOUR = [
  { focus: 'drive', kicker: 'Drivetrain', title: 'Swerve.', note: 'MK4i modules in blue',
    body: 'Four SDS MK4i modules, so the robot can drive and turn independently and line up on any face of the reef.',
    feats: [] },
  { focus: 'elev', kicker: 'Pivoting elevator', title: '1.4 ft to 7 ft.', slider: true,
    body: 'The whole elevator pivots, then telescopes along the arm. Heavy parts stay low so it can stand tall without tipping.',
    feats: [
      { focus: 'pivotgb', title: '275:1 pivot', note: 'gearboxes in blue',
        body: 'Two custom gearboxes sit right down at the bottom of the frame and give the pivot a 275:1 reduction, keeping their weight as low as it can go.' },
      { focus: 'elevbelt', title: 'Belt-driven stages', note: 'motors and belts in blue',
        body: 'Two Krakens drive the stages by belt at 4:1, telescoping about 0.95 m along the arm.' },
    ] },
  { focus: 'wrist', kicker: 'Differential wrist', title: 'Coaxial, and differential.',
    body: 'Pitch and roll share one axis and two motors. Turn both the same way and the wrist pitches; turn them opposite ways and it rolls.',
    feats: [
      { focus: 'diff', title: 'The differential', note: 'bevel gears in blue',
        body: 'Spiral bevel gears combine the two inputs, so each motor contributes to both pitch and roll. In code: left = pitch + roll, right = pitch − roll.' },
      { focus: 'gearbox', title: 'Gearboxes down low', note: '',
        body: 'The wrist’s custom gearboxes ride in the last elevator stage instead of out at the tip, which keeps weight off the end of a 7 ft reach.' },
      { focus: 'belts', title: 'Belts inside the tube', note: 'seen through the tube',
        body: 'With the gearboxes kept low, belts running inside the tube carry their torque up to the wrist.' },
    ] },
  { focus: 'intake', kicker: 'Intake', title: 'Belt-driven, low-slung.',
    body: 'The ground intake swings between the floor, the handoff to the wrist, and stowed.',
    feats: [
      { focus: 'zombie', title: 'Zombie axle', note: 'axle and belt path in blue',
        body: 'An axle on the right-side plates carries the drive across the pivot by belt, so the motor lives low in the robot instead of out on the swinging arm.' },
      { focus: 'srpp', title: 'SRPP plates', note: 'SRPP plates in blue',
        body: 'The two plates that swing with the intake are self-reinforced polypropylene instead of polycarbonate: about 25% lighter (0.9 vs 1.2 g/cm³) with roughly 2.5× the tensile strength (174 vs ~65 MPa), and stiffer, so the plates resist flex and impacts.' },
    ] },
  { focus: 'climb', kicker: 'Climber', title: 'The end of the match.',
    body: 'Its arm poses, Climb Init and Climb Final, are part of the same state graph. Nothing leads out of Climb Final.',
    feats: [] },
];

// The elevator slider runs 5° → 86° of pivot and defaults to Idle (65°).
export const IDLE = 60 / 81;

export const COG_FACTS = [
  { k: 'Height', v: '1.4 → 7 ft' }, { k: 'Pivot', v: '275 : 1' }, { k: 'Elevator', v: '2 Krakens, 4 : 1' },
];

export const GRAPH_STATS = [
  { k: 'Named poses', v: '25', d: 'Five joint values each' },
  { k: 'Allowed moves', v: '47', d: 'Directed; only 5 pairs run both ways' },
  { k: 'Stored routes', v: '625', d: 'Every ordered pair, looked up as table[from][to]' },
  { k: 'Longest route', v: '6', d: 'Moves; most routes are 2–4' },
];

export const GRAPH_NOTES = [
  { t: 'Idle is home', b: '14 poses have an edge straight back to it, including every scoring pose.' },
  { t: 'A gate to the reef', b: 'Waiting to Score is the only way into the ten reef poses, so the arm always passes through it before going near the reef.' },
  { t: 'Order, forced', b: 'L4 Back Intermediate exists so scoring L4 over the back happens in two steps: extend with the wrist straight, then flip the wrist.' },
  { t: 'Safety is the data', b: 'A move that isn’t an edge can’t happen. Adding a pose is one line of setpoints and its edges, then re-running the script.' },
];

export const HOPS = [
  { k: 'Request', v: 'Ground Intake', d: '→ Score L4 Back' },
  { k: 'to Handoff', v: '0.86 s', d: 'waits for intake pitch' },
  { k: 'to Waiting to Score', v: '0.96 s', d: 'waits for wrist pitch' },
  { k: 'to L4 Back Intermediate', v: '1.22 s', d: 'waits for the elevator' },
  { k: 'to Score L4 Back', v: '0.64 s', d: 'waits for wrist pitch' },
  { k: 'Settled', v: '3.82 s', d: 'after a 0.12 s scoring hold', accent: true },
];

export const MORE = [
  { t: 'Reef auto-align', b: 'Picks the nearest of the 12 branches by angle around the reef centre, backs off 20 in, and drives there on three P controllers (x, y, heading), capped at 3 m/s and 180°/s.' },
  { t: 'Front or back by heading', b: 'The scoring sequence compares heading with the reef face and picks the Front or Back pose, so the robot never turns around to score.' },
  { t: 'Pose estimate', b: 'Four PhotonVision cameras feed AprilTag poses into a swerve pose estimator, rejecting estimates off the field, more than 5 cm off the floor, or from ambiguous tags.' },
  { t: 'Logging and 3D view', b: 'Every input and controller output is logged with AdvantageKit, and the measured and goal arm poses are published side by side for AdvantageScope.' },
  { t: 'Change your mind mid-move', b: 'A new request starts its route from the waypoint the arm is heading to, so it finishes that hop and stays on the graph.' },
];

// tone: 'on' (blue), 'warn' (amber) or '' (grey)
export const STATUS = [
  { k: 'Running', tone: 'on', b: 'The graph, route walker and five joint loops run every loop on this branch.' },
  { k: 'Written', tone: 'warn', b: 'Coral, algae and climb sequences, auto-align and the front/back choice exist as commands that aren’t on a button yet. Autonomous does nothing.' },
  { k: 'Off', tone: '', b: 'Joint interlocks are written with six unit tests but switched off; safety comes from the graph’s edges alone.' },
  { k: 'Not wired', tone: '', b: 'Game-piece sensors aren’t connected, so possession tracking relies on commands reporting what happened.' },
  { k: 'Gains', tone: '', b: 'The values shown are what’s in the code, not a claim of final tuning.' },
];

export const TEAM_PHOTO = {
  src: '/assets/coyneinator/team-sf-regional.webp', w: 1800, h: 1350,
  alt: 'FRC Team 4255 in green team shirts, kneeling and standing in a gym around the blue 2025 San Francisco Regional winner banner, with medals and the Reefscape trophy',
};

// The tribute that opens the page. Mikayla's wording; keep it verbatim.
export const MEMORIAL = 'In loving memory of my mentor, Robin Coyne, thanks for all that you have taught me and thousands of others';
export const ROBIN_PHOTOS = [
  { src: '/assets/coyneinator/robin-1.webp', w: 624, h: 498, alt: 'Robin Coyne smiling at a table in the pits, holding a machined plate' },
  { src: '/assets/coyneinator/robin-2.webp', w: 1200, h: 929, alt: 'Robin Coyne in a straw hat and sunglasses, holding up a trophy cup' },
  { src: '/assets/coyneinator/robin-3.webp', w: 1200, h: 901, alt: 'Robin Coyne in the shop, guiding two students as they drill a part' },
  { src: '/assets/coyneinator/robin-4.webp', w: 624, h: 500, alt: 'Robin Coyne cheering in the stands in a Team 4255 shirt, with gold and green pom-poms clipped to a pair of glasses' },
];
