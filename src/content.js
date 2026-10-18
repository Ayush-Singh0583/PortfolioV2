// Everything you are likely to want to edit lives in this file.

export const profile = {
  name: 'Ayush Singh',
  tagline: 'I build products end to end, with an ML streak.',
  role: 'Information Science & Engineering · RVITM, Bengaluru',
  availability: 'Open to a 6-month internship · Jan–Jun 2027',
  // A PDF in /public to offer as a download, e.g. 'Ayush_Singh_Resume.pdf'. Off for now:
  // the current PDF has your phone number and USN, so it's kept local (see .gitignore).
  resume: null,
  links: [
    { label: 'GitHub', url: 'https://github.com/Ayush-Singh0583' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/ayush-singh-47b446298' },
    { label: 'LeetCode', url: 'https://leetcode.com/u/Ayush_Learning' },
    { label: 'Email', url: 'mailto:ayushsingh10580@gmail.com' },
  ],
}

// The words that float out of your head, one keycap each. Longer words get wider keys.
export const traits = [
  'Overthinker',
  'Conceptual Thinker',
  'Problem Solver',
  // Placeholders: swap these for your own.
  'Curious',
  'Systems Thinker',
  'Builder',
  'Fast Learner',
  'Night Owl',
  'Debugger',
  'Detail-Oriented',
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
  // First day of 1st year. Academic years are counted from this date.
  collegeStart: '2023-08-01',
  // Things that happened outside GitHub. `label` replaces the shown date when the exact month isn't known.
  milestones: [
    { date: '2023-08-01', label: '2023', title: 'Started B.E. in Information Science & Engineering', text: 'RV Institute of Technology and Management, Bengaluru. CGPA so far: 8.74 / 10.' },
    { date: '2025-08-13', title: 'Joined GitHub', text: 'Opened the account that holds every project that follows.' },
  ],
  // Work that isn't a repo on this GitHub account. Add `url` when there's a link.
  extraProjects: [
    {
      // Exact month unknown; dated mid-year so it sorts into Year 2. Lives on Ayush's other GitHub account.
      date: '2025-01-15',
      label: '2024–25',
      title: 'VoIP Calling App',
      description: 'A voice-over-IP calling app in Java, with a Swing desktop interface.',
      stack: ['Java', 'Swing'],
    },
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
  // Repos to leave off the timeline.
  hideRepos: ['Ayush-Singh0583', 'campus'],
  // Nicer titles, descriptions, tech stacks and highlights for specific repos (keyed by repo name).
  // `featured` projects get a highlighted card.
  repoOverrides: {
    ML_GESTURE: { title: 'ML Gesture Control' },
    FSD_PROJECT: { title: 'Event Management App' },
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
    Portfolio: { title: 'Portfolio V1' },
    'Evoting-System': { title: 'E-Voting System', description: 'A remote, decentralised and location-independent way to vote.' },
  },
}
