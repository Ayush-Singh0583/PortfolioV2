// Everything you are likely to want to edit lives in this file.

export const profile = {
  name: 'Ayush Singh',
  // \u00a0 keeps words together when the line wraps on narrow screens.
  tagline: 'I build products end\u00a0to\u00a0end, with an ML\u00a0streak.',
  role: 'Information Science & Engineering · RVITM, Bengaluru',
  availability: 'Open to a 6-month internship · Jan–Jun 2027',
  // The live address. Link previews (LinkedIn, WhatsApp, X…) are built from it at build time.
  site: 'https://portfolio-v2-sigma-amber.vercel.app',
  // A résumé PDF to offer as a download: put it in /public and name it here, e.g.
  // 'Ayush_Singh_Resume.pdf'. Off for now, because the current one has your phone number
  // and USN. Everything in /public is published, so only use a version without them.
  resume: null,
  links: [
    { label: 'GitHub', url: 'https://github.com/Ayush-Singh0583' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/ayush-singh-47b446298' },
    { label: 'LeetCode', url: 'https://leetcode.com/u/Ayush_Learning' },
    { label: 'Email', url: 'mailto:ayushsingh10580@gmail.com' },
  ],
}

// The contact section at the end.
export const contact = {
  email: 'ayushsingh10580@gmail.com',
  // With no endpoint, "Send" opens the visitor's email app with the message filled in.
  // For messages straight to your inbox, use a free form service:
  //   Formspree: endpoint: 'https://formspree.io/f/<your-form-id>'
  //   Web3Forms: endpoint: 'https://api.web3forms.com/submit', extraFields: { access_key: '<your-key>' }
  endpoint: null,
  extraFields: {},
  // Conversation starters floating beside the form; clicking one starts the message.
  topics: [
    { label: 'Internship', message: "Hi Ayush, I'd like to talk about an internship." },
    { label: 'Collaboration', message: "Hi Ayush, I have a project idea and I'd love to build it together." },
    { label: 'Freelance work', message: "Hi Ayush, I'm looking for help with a freelance project." },
    { label: 'Feedback', message: 'Hi Ayush, a few thoughts on your portfolio: ' },
    { label: 'Just saying hi', message: 'Hi Ayush, just saying hi!' },
  ],
}

// The words that float out of your head, one bubble each. Around a dozen fits on screen.
export const traits = [
  // Ayush's own words.
  'Overthinker',
  'Conceptual Thinker',
  'Problem Solver',
  // How ChatGPT describes him after ~3 years of conversations, one word per cluster:
  // Curious (also Inquisitive), Analytical (Logical), Meticulous (Methodical, Disciplined),
  // Persistent (Determined), Innovative (Creative, Original, Imaginative), Introspective (Reflective).
  // Unused from that list: Technical, Independent, Ambitious, Practical, Observant, Adaptable,
  // Articulate, Expressive, Experimental, Versatile, Perceptive.
  'Curious',
  'Analytical',
  'Meticulous',
  'Persistent',
  'Resourceful',
  'Innovative',
  'Strategic',
  'Introspective',
  'Skeptical',
  'Poetic',
]

// The opening scene: your Ghibli portrait as a cutout whose head opens.
// The layers in public/portrait/ were cut from your picture (see README).
export const portrait = {
  body: 'portrait/body.webp',
  lid: 'portrait/lid.webp',
  // Height of the top of your head in the 3D scene, in metres.
  height: 1.8,
}

// From the résumé.
export const about = {
  cgpa: '8.74',
  summary:
    "I'm an Information Science & Engineering student at RV Institute of Technology and Management, Bengaluru, and I build products end to end: Node.js/Express and FastAPI backends, React and TypeScript front ends, on PostgreSQL, MySQL, SQLite and MongoDB. I bring an ML background into product work. My intrusion detection system runs real-time inference behind documented REST APIs and a live React dashboard. I care about the fundamentals (schema design, transactions and concurrency, data structures, algorithms, system design), and I test what I ship.",
  education: [
    { title: 'B.E., Information Science & Engineering', place: 'RV Institute of Technology and Management, Bengaluru', years: '2023–2027', detail: 'CGPA 8.74 / 10' },
    { title: 'CBSE Class XII', place: 'SJS Public School', years: '2022', detail: '84.4%' },
    { title: 'CBSE Class X', place: 'SJS Public School', years: '2020', detail: '87.4%' },
  ],
  skills: {
    Languages: ['TypeScript', 'JavaScript', 'Python', 'Java', 'C++17', 'C', 'SQL'],
    Frontend: ['React', 'TypeScript', 'HTML/CSS'],
    Backend: ['Node.js', 'Express.js', 'FastAPI', 'Spring Boot', 'Spring Security', 'JWT', 'REST API design', 'OpenAPI/Swagger'],
    Databases: ['PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Schema design', 'Transactions & locking'],
    'ML & Data': ['Scikit-Learn', 'XGBoost', 'Pandas', 'NumPy', 'Model evaluation', 'Threshold calibration'],
    'Cloud & DevOps': ['Git', 'GitHub Actions', 'Docker', 'Linux', 'Vercel', 'Postman'],
    'Core CS': ['Data Structures & Algorithms', 'OOP', 'DBMS', 'Operating Systems', 'Computer Networks', 'Computer Architecture', 'System Design'],
  },
  // Leadership and certifications. Give one a `date` (e.g. '2024-09-15') and it also
  // appears on the timeline in the right year.
  highlights: [
    { title: 'Hackathon Operations Lead', org: 'Fantom Code', text: 'Coordinated a national hackathon for 500+ participants, owning scheduling and stakeholder communication.' },
    { title: 'Smart India Hackathon', org: 'Team member', text: 'Designed and pitched a technical solution in a multidisciplinary team, presenting the architecture to an evaluation panel.' },
    { title: 'Certifications', org: 'Cisco · AWS', text: 'Cisco Networking Basics; AWS Cloud Practitioner Essentials (training course).' },
    { title: 'Competitive programming', org: 'LeetCode · Codeforces · HackerRank', text: 'Active on LeetCode, Codeforces and HackerRank.' },
  ],
}

export const journey = {
  // 'ring': each year pins in place while its cards turn on a 3D ring, oldest first, the front
  //         one zoomed in; a circular dial shows where you are (scroll, drag, click or use ← →).
  // 'stack': each year pins in place while its cards slide in and stack up like a deck.
  // 'list': each year's cards scroll past in a column.
  layout: 'ring',
  // GitHub accounts whose public repos appear on the timeline (fetched at build time).
  githubAccounts: ['Ayush-Singh0583', 'AyushDevJourney'],
  // First day of 1st year. Academic years are counted from this date.
  collegeStart: '2023-08-01',
  // Things that happened outside GitHub. `label` replaces the shown date when the exact month isn't known.
  milestones: [
    { date: '2023-08-01', label: '2023', title: 'Started B.E. in Information Science & Engineering', text: 'RV Institute of Technology and Management, Bengaluru. CGPA so far: 8.74 / 10.' },
    { date: '2024-08-17', title: 'First GitHub repository', text: '“Lets Start The First Thing”: the first repo on my first account, AyushDevJourney.' },
    { date: '2025-08-13', title: 'Started my main GitHub account', text: 'Opened Ayush-Singh0583, home to most of the projects that follow.' },
  ],
  // Work that isn't a public repo. Add `url` when there's a link.
  extraProjects: [
    {
      date: '2026-10-16',
      label: 'Ongoing',
      status: 'In progress',
      title: 'Secure Banking Transaction API',
      description: 'A RESTful banking backend in Spring Boot with stateless JWT authentication, on PostgreSQL, documented with OpenAPI/Swagger and containerised with Docker.',
      stack: ['Java', 'Spring Boot', 'Spring Security', 'JWT', 'PostgreSQL', 'Docker', 'OpenAPI/Swagger'],
      highlights: [
        'Concurrency-safe fund transfers using pessimistic locking with deterministic lock ordering, preventing race conditions and deadlocks.',
        'Money movement modelled as a double-entry ledger with BigDecimal for exact arithmetic.',
        'Idempotency records, so retried requests never create duplicate transactions.',
      ],
    },
  ],
  // Repos to leave off the timeline (profile pages, empty repos).
  hideRepos: ['Ayush-Singh0583', 'campus', 'AyushDevJourney', 'Start'],
  // Nicer titles, descriptions, tech stacks and highlights for specific repos (keyed by repo name).
  // `featured` projects get a highlighted card. `date` / `label` override GitHub's creation
  // date, for projects uploaded long after they were built.
  repoOverrides: {
    'VoIP-Using-Jawa-And-Swing': {
      // GitHub says Oct 2025, but Ayush built it in 2nd year; exact month unknown.
      date: '2025-01-15',
      label: '2024–25',
      title: 'VoIP Audio Comm-Link',
      description: 'Real-time audio streaming in Java: captures the microphone, compresses it with µ-law (G.711) and streams it over UDP, with neon-themed Swing sender and receiver apps.',
      stack: ['Java', 'Swing', 'UDP', 'µ-law (G.711)', 'Networking'],
    },
    Algorithm_Vizualizer: {
      title: 'Pathfinding Visualizer',
      description: 'A Pygame visualiser on a 16×16 grid: watch A*, BFS, DFS, Dijkstra and bidirectional search find their way around walls you draw or randomise.',
      stack: ['Python', 'Pygame', 'A*', 'BFS / DFS', 'Dijkstra'],
    },
    'Rescue-Path-optimizer': {
      title: 'Rescue Path Optimizer',
      description: 'Finds the safest way out of a building: runs Dijkstra’s algorithm from your position to several exits over a danger-weighted graph, and re-routes when a wall collapses and a path disappears.',
      stack: ['C', 'Graphs', 'Dijkstra', 'Linked lists'],
    },
    AcadsphereV2: {
      title: 'AcadSphere: Academic Event Management',
      description: 'A full-stack MERN platform for hackathons, fests, workshops and conferences: events and sessions, teams, submissions and judging, attendance, feedback and announcements, with role-based JWT auth and dashboards.',
      stack: ['React', 'Vite', 'Node.js', 'Express.js', 'MongoDB', 'JWT', 'Recharts'],
    },
    ML_GESTURE: { title: 'ML Gesture Control' },
    // Descriptions below are written from each repo's README.
    'smart-todo-pro': {
      title: 'Smart To-Do Pro',
      description: 'A task manager rebuilt in React: categories, priorities and due dates with live countdowns, inline editing, search (Ctrl + K), filters, and light and dark themes, all saved in the browser.',
      stack: ['React', 'Vite', 'CSS', 'LocalStorage'],
    },
    'Habit-tracker': {
      title: 'Habitual: Habit Tracker',
      description: 'A full-stack MERN habit tracker with streaks, analytics charts and a heatmap, and JWT sign-in with access and refresh tokens.',
      stack: ['React', 'Tailwind CSS', 'Chart.js', 'Node.js', 'Express.js', 'MongoDB', 'JWT'],
    },
    FSD_PROJECT: {
      title: 'EventSphere: Event Management',
      description: 'A MERN app for formal academic events: planning and schedules, participants and teams, hackathon submissions and judging, attendance, volunteers, feedback and reports.',
      stack: ['React', 'Vite', 'Node.js', 'Express.js', 'MongoDB', 'JWT'],
    },
    Workout_Tracker: { description: 'A simple way to keep track of your workouts.' },
    'Interview-Speaking-Trainer': {
      description: 'A full-stack MVP for practising communication: pick a random HR, technical, behavioural or discussion topic, prepare for 60 seconds, record your answer in the browser and review past sessions, all stored locally with FastAPI, SQLite and React.',
    },
    CODEBASE: {
      description: 'A developer workspace for programming knowledge: store problems, version solutions like Git commits, attach notes and references, and track your progress. A TypeScript backend, React front end and PostgreSQL, with a high-performance C++ core.',
    },
    NTM: {
      title: 'Do EDM Tool-Wear Models Transfer?',
      status: 'Research',
      description: 'Co-authored research: do machine-learning models of tool wear in die-sinking EDM work in a new lab? Across 156 runs from 10 published studies, none transfers reliably to a study it hasn’t seen.',
      stack: ['Python', 'XGBoost', 'Random forests', 'Ridge regression'],
    },
    'ML-Network-Intrusion-Detection-System': {
      title: 'Real-Time ML Network Intrusion Detection System',
      featured: true,
      description: 'A live intrusion detection system: captures packets, rebuilds network flows and runs ML inference in real time, with a FastAPI backend and a React dashboard.',
      stack: ['Python', 'FastAPI', 'REST APIs', 'SQLite', 'React', 'Scikit-Learn', 'XGBoost', 'Scapy'],
      highlights: [
        'Captures packets with Scapy, reconstructs bidirectional flows and extracts CICIDS2017-compatible features for real-time inference.',
        'Layered FastAPI backend with documented REST APIs (OpenAPI/Swagger) and SQLite persistence; system design docs and 60+ pytest unit and regression tests.',
        'Benchmarked Random Forest vs XGBoost on a held-out day with unseen attacks: XGBoost caught 2.3× more DDoS at ~0.1% false alarms, but needed calibration for stable thresholds.',
      ],
    },
    Focus: {
      title: 'Focus: Full-Stack Productivity Platform',
      featured: true,
      description: 'Task management, time tracking and usage analytics, with a Node.js/Express and MongoDB backend and a React front end.',
      stack: ['Node.js', 'Express.js', 'MongoDB', 'React', 'GitHub Actions', 'Vercel'],
      highlights: [
        'Node.js/Express REST backend on MongoDB powering tasks, time tracking and analytics.',
        'Continuous deployment with GitHub Actions on every push to main: 30+ automated deployments so far.',
      ],
    },
    'CacheSimulatorV2-c-17-': {
      title: 'Configurable CPU Cache Simulator & Memory Analyzer',
      featured: true,
      description: 'A full-stack analysis tool: a C++17 engine built with CMake behind a React and TypeScript interface for trace-driven, multi-level cache visualisation.',
      stack: ['C++17', 'CMake', 'React', 'TypeScript', 'Computer Architecture', 'Valgrind'],
      highlights: [
        'Configurable L1/L2 simulator: direct-mapped, N-way set-associative and fully associative, with runtime-configurable write policies.',
        'O(1) LRU replacement; hit rate, miss rate and AMAT computed from memory traces and validated against Valgrind.',
        'Unit tests on a custom C++ test framework.',
      ],
    },
    'CPU-Cache-Simulator': { title: 'CPU Cache Simulator (first version)' },
    Portfolio: {
      title: 'Portfolio V1',
      description: 'My first portfolio: a single-page, scroll-driven site whose hero is a live network-traffic animation drawn on a canvas, with GSAP scroll effects and three project case studies.',
      stack: ['HTML', 'CSS', 'JavaScript', 'GSAP', 'Lenis', 'Canvas'],
    },
    PortfolioV2: {
      title: 'Portfolio V2 (this site)',
      description: 'The site you are on: a 3D intro where my traits appear out of my head as bubbles, then my journey year by year. Built with React, Three.js and plenty of overthinking.',
    },
    'Evoting-System': { title: 'Blockchain E-Voting System', description: 'A blockchain-based e-voting system: a remote, decentralised and location-independent way to vote.' },
  },
}
