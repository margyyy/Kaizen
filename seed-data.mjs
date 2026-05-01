import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lpnjxkzeyiifzzycmftg.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwbmp4a3pleWlpZnp6eWNtZnRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU2MDg3NiwiZXhwIjoyMDkzMTM2ODc2fQ.Ba9xGydQMIQa8lidBC60M-d66BEcdHM7NDo7TSD438s";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const GOOGLE_ID = "d83a8125-9726-45ed-adca-c634de4d07ed";

function d(y, m, d) { return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function iso(y, m, d, h = 8, min = 0) { return new Date(y, m-1, d, h, min).toISOString(); }
function rng(max) { return Math.floor(Math.random() * max); }

let nextId = 1;
function nid() { return nextId++; }

// ─── Subjects (8) ─────────────────────────────────────────────
const subjects = [
  { id: nid(), userId: 0, name: "Mathematics", color: "#3b82f6" },
  { id: nid(), userId: 0, name: "Computer Science", color: "#22c55e" },
  { id: nid(), userId: 0, name: "Physics", color: "#ef4444" },
  { id: nid(), userId: 0, name: "Italian Literature", color: "#a855f7" },
  { id: nid(), userId: 0, name: "History", color: "#eab308" },
  { id: nid(), userId: 0, name: "English", color: "#14b8a6" },
  { id: nid(), userId: 0, name: "Philosophy", color: "#f97316" },
  { id: nid(), userId: 0, name: "Biology", color: "#ec4899" },
];

// ─── Tasks (~70, mix completed / pending / future) ──────────
const taskDefs = [
  // Mathematics (s:1)
  { s:1, t:"Linear algebra exercises ch. 4", done:true, mo:5 },
  { s:1, t:"Study eigenvalues and eigenvectors", done:true, mo:5 },
  { s:1, t:"Practice differential equations", done:false, mo:6 },
  { s:1, t:"Review matrix operations", done:true, mo:6 },
  { s:1, t:"Complete problem set 7 – integrals", done:true, mo:7 },
  { s:1, t:"Watch 3Blue1Brown linear transformations", done:true, mo:7 },
  { s:1, t:"Study multivariable calculus", done:false, mo:8 },
  { s:1, t:"Practice Taylor series expansions", done:true, mo:9 },
  { s:1, t:"Prepare for calculus exam", done:false, mo:12, future:true },
  // CS (s:2)
  { s:2, t:"Implement binary search tree", done:true, mo:5 },
  { s:2, t:"Study sorting algorithms complexity", done:true, mo:5 },
  { s:2, t:"LeetCode week 12 – dynamic programming", done:false, mo:6 },
  { s:2, t:"Read Rust book chapter 6 – ownership", done:false, mo:6 },
  { s:2, t:"Build REST API with Express + Prisma", done:true, mo:7 },
  { s:2, t:"Study system design basics", done:true, mo:8 },
  { s:2, t:"Implement graph traversal algorithms", done:true, mo:9 },
  { s:2, t:"Learn Docker Compose", done:false, mo:10 },
  { s:2, t:"Study database indexing strategies", done:true, mo:11 },
  { s:2, t:"Build full-stack side project", done:false, mo:12, future:true },
  // Physics (s:3)
  { s:3, t:"Thermodynamics problem set", done:true, mo:5 },
  { s:3, t:"Lab report: pendulum experiment", done:true, mo:6 },
  { s:3, t:"Quantum mechanics intro – wave functions", done:false, mo:7 },
  { s:3, t:"Electromagnetism formulas sheet", done:true, mo:8 },
  { s:3, t:"Study optics – lenses and mirrors", done:true, mo:9 },
  { s:3, t:"Relativity special theory notes", done:false, mo:10 },
  { s:3, t:"Nuclear physics reading", done:false, mo:11 },
  { s:3, t:"Prepare physics final exam", done:false, mo:12, future:true },
  // Italian Literature (s:4)
  { s:4, t:"Read Dante's Inferno canto V", done:true, mo:5 },
  { s:4, t:"Essay: romanticism vs realism", done:true, mo:6 },
  { s:4, t:"Memorize Petrarch sonnet LX", done:false, mo:7 },
  { s:4, t:"Literary criticism – Eco summary", done:false, mo:8 },
  { s:4, t:"Analyze Leopardi's L'infinito", done:true, mo:9 },
  { s:4, t:"Read I Promessi Sposi ch. 1-10", done:true, mo:10 },
  { s:4, t:"Essay on Decadentism", done:false, mo:11 },
  { s:4, t:"Divina Commedia – Paradiso canto I", done:false, mo:12, future:true },
  // History (s:5)
  { s:5, t:"WW2 timeline complete review", done:true, mo:5 },
  { s:5, t:"Cold War notes rewrite", done:false, mo:6 },
  { s:5, t:"French Revolution causes and phases", done:true, mo:7 },
  { s:5, t:"Industrial Revolution study", done:true, mo:8 },
  { s:5, t:"Italian unification summary", done:true, mo:9 },
  { s:5, t:"World War I causes analysis", done:false, mo:10 },
  { s:5, t:"Post-WW2 Italy – reconstruction", done:false, mo:11 },
  { s:5, t:"History final review", done:false, mo:12, future:true },
  // English (s:6)
  { s:6, t:"Vocabulary unit 8", done:true, mo:5 },
  { s:6, t:"Write argumentative essay", done:false, mo:6 },
  { s:6, t:"Listening practice podcast – BBC", done:true, mo:7 },
  { s:6, t:"Grammar: conditionals review", done:true, mo:8 },
  { s:6, t:"Read Shakespeare sonnets", done:false, mo:9 },
  { s:6, t:"Practice speaking – 30 min", done:true, mo:10 },
  { s:6, t:"Write opinion essay on technology", done:false, mo:11 },
  { s:6, t:"Prepare B2 mock test", done:false, mo:12, future:true },
  // Philosophy (s:7)
  { s:7, t:"Read Plato's Republic book I", done:true, mo:6 },
  { s:7, t:"Aristotle – Nicomachean Ethics summary", done:true, mo:7 },
  { s:7, t:"Descartes – Meditations analysis", done:false, mo:8 },
  { s:7, t:"Kant categorical imperative", done:true, mo:9 },
  { s:7, t:"Nietzsche – Thus Spoke Zarathustra", done:false, mo:10 },
  { s:7, t:"Existentialism – Sartre overview", done:false, mo:11 },
  { s:7, t:"Philosophy essay on free will", done:false, mo:12, future:true },
  // Biology (s:8)
  { s:8, t:"Cell biology – membrane transport", done:true, mo:6 },
  { s:8, t:"DNA replication study", done:true, mo:7 },
  { s:8, t:"Photosynthesis and cellular respiration", done:false, mo:8 },
  { s:8, t:"Genetics – Mendelian inheritance", done:true, mo:9 },
  { s:8, t:"Evolution theory notes", done:false, mo:10 },
  { s:8, t:"Human anatomy – nervous system", done:false, mo:11 },
  { s:8, t:"Biology exam preparation", done:false, mo:12, future:true },
];

const tasks = taskDefs.map((t) => {
  const year = t.mo >= 5 ? 2025 : 2026;
  const adjMo = t.mo > 12 ? t.mo - 12 : t.mo; // handle future
  const actualYear = t.future ? 2026 : year;
  const actualMo = t.future ? t.mo - 7 : t.mo; // map future to actual months
  return {
    id: nid(),
    userId: 0,
    subjectId: subjects[t.s - 1].id,
    title: t.t,
    date: d(year, adjMo, 5 + t.s),
    completedAt: t.done ? iso(year, adjMo, 8 + t.s, 14, 0).slice(0, 10) + "T14:00:00.000Z" : undefined,
  };
});

// ─── Study Sessions (~850) ───────────────────────────────────
const studySessions = [];
const sids = subjects.map((s) => s.id);
// May 2025 – April 2026 (12 months)
for (let mo = 0; mo < 12; mo++) {
  const y = 2025 + Math.floor((5 + mo - 1) / 12);
  const m = ((5 + mo - 1) % 12) + 1;
  const dim = new Date(y, m, 0).getDate();

  // Study 22-27 days per month
  const studyDays = 22 + rng(6);
  const chosen = new Set();
  while (chosen.size < studyDays) chosen.add(1 + rng(dim));
  const sorted = [...chosen].sort((a, b) => a - b);

  for (const day of sorted) {
    const nSess = 2 + rng(3); // 2-4 sessions per day
    for (let s = 0; s < nSess; s++) {
      const subj = sids[rng(sids.length)];
      const mins = [25, 30, 45, 50, 60, 75, 90, 120][rng(8)];
      const h = 7 + s * 2 + rng(2);
      const start = iso(y, m, day, h, rng(60));
      const end = new Date(new Date(start).getTime() + mins * 60000).toISOString();
      studySessions.push({ id: nid(), userId: 0, subjectId: subj, minutes: mins, startedAt: start, endedAt: end });
    }
  }
}

// ─── Flashcards (8 sets, ~70 cards) ─────────────────────────
const flashcardSets = [
  { id: nid(), userId: 0, subjectId: subjects[0].id, name: "Linear Algebra", createdAt: d(2025, 5, 10) },
  { id: nid(), userId: 0, subjectId: subjects[1].id, name: "Data Structures & Algorithms", createdAt: d(2025, 6, 1) },
  { id: nid(), userId: 0, subjectId: subjects[2].id, name: "Physics formulas", createdAt: d(2025, 7, 1) },
  { id: nid(), userId: 0, subjectId: subjects[4].id, name: "WW2 Key Dates", createdAt: d(2025, 9, 15) },
  { id: nid(), userId: 0, subjectId: subjects[5].id, name: "English vocabulary B2", createdAt: d(2025, 10, 1) },
  { id: nid(), userId: 0, subjectId: subjects[6].id, name: "Philosophy thinkers", createdAt: d(2025, 11, 1) },
  { id: nid(), userId: 0, subjectId: subjects[7].id, name: "Biology – Cell & Genetics", createdAt: d(2026, 1, 15) },
  { id: nid(), userId: 0, subjectId: subjects[3].id, name: "Italian authors quotes", createdAt: d(2026, 2, 1) },
];

const cardDefs = [
  // Set 1: Linear Algebra
  { sid:1, f:"Eigenvalue definition", b:"A scalar λ such that Av = λv for a non-zero vector v" },
  { sid:1, f:"Determinant", b:"A scalar value characterizing a square matrix; zero means singular" },
  { sid:1, f:"What is a basis?", b:"A set of linearly independent vectors that span a vector space" },
  { sid:1, f:"Rank of a matrix", b:"The dimension of the vector space generated by its columns" },
  { sid:1, f:"Trace definition", b:"Sum of the diagonal elements of a square matrix" },
  { sid:1, f:"Orthogonal matrix", b:"A square matrix whose columns and rows are orthonormal vectors" },
  { sid:1, f:"Symmetric matrix", b:"A matrix equal to its transpose: A = Aᵀ" },
  { sid:1, f:"Singular value decomposition", b:"A = UΣVᵀ – factorization generalizing eigendecomposition" },
  // Set 2: Data Structures & Algorithms
  { sid:2, f:"BST search complexity", b:"O(log n) average, O(n) worst case (unbalanced)" },
  { sid:2, f:"Stack vs Queue", b:"LIFO (stack) vs FIFO (queue)" },
  { sid:2, f:"Hash table collision resolution", b:"Chaining (linked lists) or open addressing (linear probing, double hashing)" },
  { sid:2, f:"Heap property", b:"Parent ≥ children (max-heap) or parent ≤ children (min-heap)" },
  { sid:2, f:"Graph adjacency list", b:"Each vertex stores a list of its neighbors; O(V+E) space" },
  { sid:2, f:"Dijkstra algorithm", b:"Finds shortest path in weighted graph; O((V+E) log V) with binary heap" },
  { sid:2, f:"Quicksort partitioning", b:"Choose pivot, partition array < pivot and > pivot, recurse" },
  { sid:2, f:"Trie data structure", b:"Prefix tree for efficient string search; each node is a character" },
  { sid:2, f:"Dynamic programming", b:"Break problem into overlapping subproblems, memoize results" },
  // Set 3: Physics formulas
  { sid:3, f:"Newton's second law", b:"F = ma (force equals mass times acceleration)" },
  { sid:3, f:"Kinetic energy formula", b:"KE = ½mv²" },
  { sid:3, f:"Ohm's law", b:"V = IR (voltage = current × resistance)" },
  { sid:3, f:"Gravitational force", b:"F = G(m₁m₂)/r²" },
  { sid:3, f:"Energy of a photon", b:"E = hf = hc/λ (Planck's constant × frequency)" },
  { sid:3, f:"Ideal gas law", b:"PV = nRT" },
  { sid:3, f:"Centripetal acceleration", b:"a = v²/r" },
  { sid:3, f:"Work-energy theorem", b:"W = ΔKE (work equals change in kinetic energy)" },
  { sid:3, f:"Coulomb's law", b:"F = k(q₁q₂)/r²" },
  // Set 4: WW2 Key Dates
  { sid:4, f:"D-Day", b:"June 6, 1944 – Allied invasion of Normandy" },
  { sid:4, f:"Operation Barbarossa", b:"June 22, 1941 – German invasion of USSR" },
  { sid:4, f:"Pearl Harbor", b:"Dec 7, 1941 – Japanese attack on US naval base" },
  { sid:4, f:"Yalta Conference", b:"Feb 1945 – Roosevelt, Churchill, Stalin plan post-war Europe" },
  { sid:4, f:"VE Day", b:"May 8, 1945 – Victory in Europe" },
  { sid:4, f:"Battle of Stalingrad", b:"Aug 1942 – Feb 1943; turning point on Eastern Front" },
  { sid:4, f:"Hiroshima & Nagasaki", b:"Aug 6 and 9, 1945 – atomic bombs dropped on Japan" },
  { sid:4, f:"Mussolini's fall", b:"July 25, 1943 – arrested by order of the Grand Council" },
  { sid:4, f:"Armistice of Cassibile", b:"Sep 8, 1943 – Italy surrenders to the Allies" },
  // Set 5: English B2
  { sid:5, f:"Ubiquitous", b:"Present, appearing, or found everywhere" },
  { sid:5, f:"Ephemeral", b:"Lasting for a very short time" },
  { sid:5, f:"Pragmatic", b:"Dealing with things sensibly and realistically" },
  { sid:5, f:"Juxtapose", b:"To place close together for contrasting effect" },
  { sid:5, f:"Inevitable", b:"Certain to happen; unavoidable" },
  { sid:5, f:"Nevertheless", b:"In spite of that; notwithstanding; all the same" },
  { sid:5, f:"Furthermore", b:"In addition; besides (used to introduce a fresh consideration)" },
  { sid:5, f:"Second conditional", b:"If + past simple, would + infinitive (unreal present/future)" },
  // Set 6: Philosophy
  { sid:6, f:"Plato's theory of Forms", b:"Non-material abstract ideas represent the most accurate reality" },
  { sid:6, f:"Aristotle's four causes", b:"Material, formal, efficient, final – explanations for why things exist" },
  { sid:6, f:"Descartes' cogito", b:"'I think, therefore I am' – the foundational certainty" },
  { sid:6, f:"Kant's categorical imperative", b:"Act only according to that maxim you can will to become universal law" },
  { sid:6, f:"Nietzsche's Übermensch", b:"The ideal superior man who creates his own values beyond good and evil" },
  { sid:6, f:"Existentialism: existence precedes essence", b:"Sartre: humans exist first, then define themselves through actions" },
  // Set 7: Biology
  { sid:7, f:"Mitosis phases", b:"Prophase → Metaphase → Anaphase → Telophase (PMAT)" },
  { sid:7, f:"Central dogma of biology", b:"DNA → RNA → Protein (transcription then translation)" },
  { sid:7, f:"Allele definition", b:"One of two or more alternative forms of a gene" },
  { sid:7, f:"Photosynthesis equation", b:"6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂" },
  { sid:7, f:"Mitochondria function", b:"Powerhouse of the cell; site of aerobic respiration, produces ATP" },
  { sid:7, f:"Natural selection", b:"Organisms better adapted to environment survive and reproduce more" },
  { sid:7, f:"Nucleotide components", b:"Sugar (deoxyribose/ribose) + phosphate group + nitrogenous base" },
  // Set 8: Italian authors
  { sid:8, f:"Dante Alighieri – Divina Commedia", b:"Epic poem in three parts: Inferno, Purgatorio, Paradiso (1308-1321)" },
  { sid:8, f:"Petrarca – Canzoniere", b:"366 poems dedicated to Laura; model for European love poetry" },
  { sid:8, f:"Boccaccio – Decameron", b:"100 tales told by 10 young people fleeing plague in Florence (1353)" },
  { sid:8, f:"Machiavelli – Il Principe", b:"Political treatise on power: 'the ends justify the means' (1513)" },
  { sid:8, f:"Ariosto – Orlando Furioso", b:"Chivalric epic poem; adventures of Orlando, Angelica, and knights (1516)" },
  { sid:8, f:"Manzoni – I Promessi Sposi", b:"Historical novel set in 17th-century Lombardy under Spanish rule (1827)" },
  { sid:8, f:"Leopardi – L'infinito", b:"Idyll on the infinite; 'Sempre caro mi fu quest'ermo colle' (1819)" },
  { sid:8, f:"Pirandello – Il fu Mattia Pascal", b:"Novel about identity and masks; protagonist fakes his own death (1904)" },
];

const flashcards = cardDefs.map((c) => ({
  id: nid(),
  userId: 0,
  subjectId: flashcardSets[c.sid - 1].subjectId,
  setId: flashcardSets[c.sid - 1].id,
  front: c.f,
  back: c.b,
  createdAt: flashcardSets[c.sid - 1].createdAt,
  easeFactor: 2.3 + Math.random() * 0.7,
  interval: 1 + rng(60),
  repetitions: 1 + rng(8),
  nextReviewAt: iso(2026, 5, 1 + rng(30)).slice(0, 10) + "T08:00:00.000Z",
  lastReviewedAt: iso(2026, 4, 1 + rng(30)).slice(0, 10) + "T10:00:00.000Z",
  lastQuality: 2 + rng(4),
}));

// ─── Roadmaps (4) ────────────────────────────────────────────
const roadmaps = [];
const roadmapMacros = [];
const roadmapMicros = [];

const roadmapDefs = [
  { subjIdx: 0, title: "Calculus Mastery", topics: ["Limits & Continuity", "Derivatives", "Integrals", "Series & Sequences", "Multivariable Calc"] },
  { subjIdx: 1, title: "CS Fundamentals", topics: ["Programming Basics", "Data Structures", "Algorithms", "System Design", "Databases"] },
  { subjIdx: 2, title: "Physics Core", topics: ["Classical Mechanics", "Thermodynamics", "Electromagnetism", "Waves & Optics", "Modern Physics"] },
  { subjIdx: 3, title: "Italian Lit Journey", topics: ["Medieval Poetry", "Renaissance", "Enlightenment", "Romanticism", "20th Century"] },
];

for (const rd of roadmapDefs) {
  const rid = nid();
  roadmaps.push({ id: rid, userId: 0, subjectId: subjects[rd.subjIdx].id, createdAt: d(2025, 5 + rd.subjIdx, 1) });
  for (let i = 0; i < rd.topics.length; i++) {
    const mid = nid();
    roadmapMacros.push({ id: mid, roadmapId: rid, title: rd.topics[i], order: i, completed: i < 3 });
    const subtopics = ["Introduction & theory", "Practice exercises", "Advanced applications", "Review & summary"];
    for (let j = 0; j < subtopics.length; j++) {
      roadmapMicros.push({ id: nid(), macroId: mid, title: `${rd.topics[i]} – ${subtopics[j]}`, order: j, completed: i < 3 ? j < 3 : j === 0 });
    }
  }
}

// ─── Achievements (all) ──────────────────────────────────────
const achievementDefs = [
  "first_session", "streak_3", "streak_7", "streak_30", "streak_60",
  "focus_10", "focus_50", "focus_100", "focus_250",
  "tasks_5", "tasks_20", "tasks_50",
  "subjects_3", "subjects_5",
  "flashcards_10", "flashcards_50", "flashcards_100",
  "roadmap_1", "roadmap_3",
  "hours_10", "hours_50", "hours_100",
];

const achievements = achievementDefs.map((aid) => {
  let tier = "bronze";
  if (aid.includes("100") || aid.includes("250") || aid.includes("60")) tier = "gold";
  else if (aid.includes("50") || aid.includes("30") || aid.includes("20") || aid.includes("roadmap_3")) tier = "silver";
  const unlocked = !aid.includes("250") && !aid.includes("100") && !aid.includes("60"); // some locked
  return {
    id: nid(), userId: 0, achievementId: aid, tier,
    count: 10 + rng(250),
    lastUnlockedAt: unlocked ? iso(2026, 1 + rng(4), 1 + rng(28)) : undefined,
    lastPeriodKey: unlocked ? `2026-0${1 + rng(4)}` : undefined,
    unlocked,
  };
});

// ─── Assemble & Push ─────────────────────────────────────────
const appData = {
  username: "Marco",
  theme: "dark",
  accent: "teal",
  nextId,
  subjects,
  tasks,
  flashcardSets,
  flashcards,
  studySessions,
  roadmaps,
  roadmapMacros,
  roadmapMicros,
  achievements,
};

const totalHours = Math.round(studySessions.reduce((s, x) => s + x.minutes, 0) / 60);
console.log(`📚 ${subjects.length} subjects`);
console.log(`📋 ${tasks.length} tasks (${tasks.filter(t=>t.completedAt).length} done, ${tasks.filter(t=>!t.completedAt).length} pending)`);
console.log(`⏱️ ${studySessions.length} study sessions — ${totalHours} hours`);
console.log(`🃏 ${flashcardSets.length} sets, ${flashcards.length} flashcards`);
console.log(`🗺️ ${roadmaps.length} roadmaps, ${roadmapMacros.length} macros, ${roadmapMicros.length} micros`);
console.log(`🏆 ${achievements.length} achievements (${achievements.filter(a=>a.unlocked).length} unlocked)`);
console.log(`📦 ${nextId - 1} total objects`);

const { error } = await supabase.from("user_data").upsert({
  google_id: GOOGLE_ID,
  email: "seed@example.com",
  data: appData,
  updated_at: new Date().toISOString(),
}, { onConflict: "google_id" });

if (error) { console.error("ERROR:", error); process.exit(1); }
console.log("✅ Done! Data pushed to Supabase.");
