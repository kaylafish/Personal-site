// ============================================================================
// PROJECTS — ONE ENTRY PER PROJECT, OLDEST FIRST
// ----------------------------------------------------------------------------
// Everything about a project lives here: its card (home page "and so much
// more", /projects), its page at /projects/<slug>, and the photo / 3D model
// the home-page story shows for it.
//
//   slug         URL: /projects/<slug>
//   title        plain part of the name; titleItalic is set in italics after it
//   kind         small caps line above the title on the project page
//   year         shown on cards; leave '' if it doesn't apply
//   cover        card + story photo (in /public/assets)
//   coverFit     optional: 'contain' shows the whole cover on a grid, for
//                drawings that mustn't be cropped
//   hero         top of the project page:
//                  { type: 'image', src }            full-bleed photo
//                  { type: '3d', src: '/models/x.glb' }   interactive model
//                options for 3d: up: 'z', note: '...', builtin: 'r01'
//   facts        exactly three label/value pairs for the title block
//   summary      one or two sentences
//   links        [{ label, href }] — optional
//   featured     optional: a short label (e.g. 'Active research'); makes this
//                the big tile on /projects. One project at a time.
//   page         optional: 'research' gives the project its own bespoke page
//                (components/researchpage.jsx; 'rebuilt' → rebuiltpage.jsx;
//                'hydro' → hydropage.jsx)
//                instead of the datasheet below,
//                which then ignores hero, facts and blocks
//   blocks       the page body, in any order and any mix:
//                  { type: 'text',   title, body }
//                  { type: 'facts',  title, rows: [{ label, value }] }
//                  { type: 'figure', title, src, caption }
//                  { type: 'code',   title, lang, code }
//                  { type: 'notes',  title, items: [{ label, body }] }
//
// todo:true on a row, note or block marks unwritten copy: it renders grey and
// italic so it's easy to spot. A figure with no src shows an empty frame.
//
// TO ADD A 3D MODEL: export the assembly from CAD as .glb, keep it as an
// assembly (every part becomes a piece of the explode slider), then compress:
//     npx @gltf-transform/cli optimize in.glb out.glb \
//       --compress meshopt --texture-compress false \
//       --flatten false --join true --instance true
// Draco-compressed files won't load, and Cloudflare Pages rejects files over
// 25 MB. Put the result in /public/models/ and point hero.src at it.
// ============================================================================
export const PROJECTS = [
  {
    slug: 'frc-charged-up',
    title: 'FRC', titleItalic: 'Charged Up!',
    kind: 'Controls · 2023', year: '2023',
    cover: '/assets/quetzy.webp', coverAlt: 'FRC 2023 robot',
    hero: { type: 'image', src: '/assets/quetzy.webp' },
    facts: [{ label: 'Year', value: '2023' }, { label: 'Role', value: 'Programmer' }, { label: 'Stack', value: 'Python' }],
    summary: 'As a freshman I programmed the entire robot: a state machine, 2-DOF arm feedforward, and PID.',
    links: [],
    blocks: [
      { type: 'text', title: 'Summary', body: 'My introduction to engineering. As a freshman I programmed the entire robot, building my foundation in controls.' },
      { type: 'facts', title: 'System', rows: [
        { label: 'Architecture', value: 'Finite state machine' },
        { label: 'Arm control', value: '2-DOF feedforward + PID' },
        { label: 'Vision', value: 'OpenCV, YOLO' },
        { label: 'Result', value: '[How the robot performed]', todo: true },
      ] },
      { type: 'figure', title: 'State machine', caption: 'State diagram' },
      { type: 'code', title: 'In code', lang: 'python', todo: true,
        code: '# [Paste a short, readable snippet here,\n#  e.g. the arm feedforward or a state transition.\n#  10 to 20 lines is plenty.]' },
      { type: 'figure', title: 'Tuning', caption: 'Step response before / after PID tuning' },
      { type: 'notes', title: 'Notes', items: [
        { label: 'What worked', body: '[...]', todo: true },
        { label: 'What I’d change', body: '[...]', todo: true },
      ] },
    ],
  },
  {
    slug: 'r01',
    title: 'Model rocket', titleItalic: 'R01',
    kind: 'Rocketry', year: '',
    cover: '/assets/project.webp', coverAlt: 'Model rocket R01',
    hero: { type: '3d', builtin: 'r01', note: 'Placeholder model' },
    facts: [{ label: 'Motor', value: 'G80' }, { label: 'Apogee', value: '3,000 ft' }, { label: 'Stack', value: 'C++' }],
    summary: 'My first rocket design, flown on a G80 motor. It reached an apogee of 3,000 feet.',
    links: [],
    blocks: [
      { type: 'text', title: 'Summary', body: 'My first rocket design, flown on a G80 motor. It reached an apogee of 3,000 feet.' },
      { type: 'facts', title: 'Key facts', rows: [
        { label: 'Motor', value: 'G80' },
        { label: 'Apogee', value: '3,000 ft' },
        { label: 'Stack', value: 'C++' },
        { label: 'Recovery', value: '[method]', todo: true },
      ] },
      { type: 'figure', title: 'Design', caption: 'Cross-section or simulation screenshot' },
      { type: 'figure', title: 'Flight data', caption: 'Altitude vs. time plot' },
      { type: 'notes', title: 'Notes', items: [
        { label: 'Stability', body: '[CG/CP and how you checked it.]', todo: true },
        { label: 'Firmware', body: '[What the C++ did on board.]', todo: true },
        { label: 'What went wrong', body: '[Be honest.]', todo: true },
        { label: 'Next revision', body: '[What R02 changes.]', todo: true },
      ] },
    ],
  },
  {
    slug: 'frc-rebuilt',
    page: 'rebuilt',
    title: 'FRC', titleItalic: 'REBUILT',
    kind: 'Mechanical · 2026', year: '2026',
    cover: '/assets/rebuilt.webp', coverAlt: 'FRC 2026 REBUILT robot',
    hero: { type: '3d', src: '/models/rebuilt.glb', note: 'CAD assembly, exported from Onshape' },
    facts: [{ label: 'Year', value: '2026' }, { label: 'Role', value: 'Design + build' }, { label: 'Stack', value: 'CAD/CAM' }],
    summary: 'Design, modeling, and manufacturing. Rack-and-pinion intake, rotor serializer, variable-hood turret shooter.',
    links: [],
    blocks: [],
  },
  {
    slug: 'hydro-generator',
    page: 'hydro',
    title: 'Hydro', titleItalic: 'generator',
    kind: 'Physics · 2026', year: '2026',
    cover: '/assets/hydro/rig-bench.webp', coverAlt: 'The hydro generator rig on a workbench',
    hero: { type: 'image', src: '/assets/hydro/rig-bench.webp' },
    facts: [{ label: 'Course', value: 'IB Physics HL' }, { label: 'Result', value: 'k = 1.31 ± 0.06' }, { label: 'Built with', value: 'CNC · 3D print' }],
    summary: 'A miniature hydroelectric generator for my IB Physics IA: does a CIM motor’s voltage follow V ∝ √h as the water drops further?',
    links: [],
    blocks: [],
  },
  {
    slug: 'canard-roll-reversal',
    page: 'research',
    featured: 'Active research',
    title: 'Canard', titleItalic: 'roll reversal',
    kind: 'Research · Controls', year: '2026',
    // Same drawing as the page hero (HERO_PHOTO in data/research.js); swap
    // both for a photo of the rocket once there is one.
    cover: '/assets/research/voyager-profile.webp', coverFit: 'contain',
    coverAlt: 'Side profile of the rocket from OpenRocket',
    hero: { type: 'image', src: '/assets/research/fig3.webp' },
    facts: [{ label: 'Status', value: 'Active' }, { label: 'Method', value: 'LQR · INDI' }, { label: 'Tools', value: 'Python · RocketPy' }],
    summary: 'Simulation research on keeping a canard-steered rocket in control when its roll authority peaks and then reverses.',
    links: [{ label: 'Code', href: 'https://github.com/kaylafish/voyager-controller-rocketpy' }],
    blocks: [],
  },
];

export const getProject = (slug) => PROJECTS.find((p) => p.slug === slug);
export const projectPath = (slug) => `/projects/${slug}`;

// The viewer props for a project's 3D hero, or null if it has none.
export const projectModel = (p) => {
  if (!p || p.hero.type !== '3d') return null;
  const { type, ...model } = p.hero;
  return { label: `${p.title} ${p.titleItalic || ''}`.trim(), ...model };
};

// ============================================================================
// TOOLKIT — the skills shelf on the home page. Taken from the résumé.
// ============================================================================
export const SKILL_GROUPS = [
  { name: 'Code', color: 'oklch(.78 .11 235)',
    skills: ['Python', 'C++', 'C', 'Java', 'CUDA', 'ARM Assembly', 'Git', 'CI/CD'] },
  { name: 'Design', color: 'oklch(.8 .1 165)',
    skills: ['Onshape', 'SOLIDWORKS', 'Fusion 360', 'FEA'] },
  { name: 'Make', color: 'oklch(.82 .11 75)',
    skills: ['CNC mill & router', 'Manual lathe', 'FDM printing', 'CAM', 'Mechanical assembly'] },
  { name: 'Controls', color: 'oklch(.78 .11 320)',
    skills: ['PID', 'Feedforward', 'State estimation', 'MATLAB'] },
];
