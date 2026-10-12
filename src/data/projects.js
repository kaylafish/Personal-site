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
//                options for 3d: up: 'z', note: '...'
//   facts        exactly three label/value pairs for the title block
//   summary      one or two sentences
//   links        [{ label, href }] — optional
//   featured     optional: a short label (e.g. 'Active research'); makes this
//                the big tile on /projects. One project at a time.
//   page         optional: 'research' gives the project its own bespoke page
//                (components/researchpage.jsx; 'rebuilt' → rebuiltpage.jsx;
//                'magnus' → magnuspage.jsx; 'hydro' → hydropage.jsx;
//                'coyneinator' → coyneinatorpage.jsx)
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
    page: 'quetzy',
    title: 'FRC', titleItalic: 'Quetzy',
    kind: 'Software · 2023', year: '2023',
    cover: '/assets/quetzy.webp', coverAlt: 'FRC 2023 robot',
    hero: { type: 'image', src: '/assets/quetzy.webp' },
    facts: [{ label: 'Year', value: '2023' }, { label: 'Role', value: 'Robot software' }, { label: 'Stack', value: 'Java' }],
    summary: 'FRC 4255’s 2023 Charged Up robot. I wrote its software: one-button arm presets on motion profiles, autonomous routines, and a state machine the LEDs show.',
    links: [],
    blocks: [],
  },
  {
    slug: 'frc-coyneinator',
    page: 'coyneinator',
    title: 'FRC', titleItalic: 'Coyneinator',
    kind: 'Mechanical · 2025', year: '2025',
    cover: '/assets/coyneinator/team-sf-regional.webp',
    coverAlt: 'FRC Team 4255 with the 2025 San Francisco Regional winner banner',
    hero: { type: '3d', src: '/models/coyneinator.glb' },
    facts: [{ label: 'Year', value: '2025' }, { label: 'Role', value: 'Mechanical design' }, { label: 'Result', value: 'SF Regional winner' }],
    summary: 'FRC 4255’s 2025 Reefscape robot: a swerve robot with a pivoting elevator, a coaxial differential wrist and a five-joint arm that only ever moves along safe paths.',
    links: [],
    blocks: [],
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
    slug: 'magnus-effect',
    page: 'magnus',
    title: 'Magnus', titleItalic: 'effect',
    kind: 'Physics · 2026', year: '2026',
    cover: '/assets/magnus/apparatus-cad.webp', coverFit: 'contain',
    coverAlt: 'CAD of the two-wheel ball launcher',
    hero: { type: 'image', src: '/assets/magnus/apparatus-cad.webp' },
    facts: [{ label: 'Year', value: '2026' }, { label: 'Type', value: 'IB Extended Essay' }, { label: 'Method', value: 'RK4 · χ² fit' }],
    summary: 'How the lift on a smooth foam ball grows with its spin. I built a two-wheel launcher, filmed 50 shots at 240 fps, and fitted a numerical flight model to the results.',
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
