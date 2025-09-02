// app/tools/my-branch/page.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";

/**
 * NEET-PG Subject Pathfinder (Light Theme, Refined)
 * - Removed CVTS and Neurosurgery
 * - If patient interaction is low, auto-lower medical/surgical inclination
 *   and exclude heavy patient-facing branches
 * - Added Desired Pay factor
 * - Light, monochrome, minimal, mono-font
 * - More nuanced scoring: weighted cosine + rules + hard filters
 */

// --------------------------- Types & Data --------------------------- //

type SubjectKey =
  | "Anatomy"
  | "Physiology"
  | "Biochemistry"
  | "Pathology"
  | "Pharmacology"
  | "Microbiology"
  | "Forensic Medicine"
  | "Social & Preventive Medicine (SPM) / Community Medicine"
  | "General Medicine"
  | "Dermatology & Venereology"
  | "Psychiatry"
  | "Pediatrics"
  | "General Surgery"
  | "Orthopedics"
  | "Anesthesia"
  | "Obstetrics & Gynecology"
  | "Ophthalmology"
  | "Otorhinolaryngology (ENT)"
  | "Pulmonary Medicine"
  | "Hospital Administration"
  | "Sports Medicine";

// Final list (CVTS & Neurosurgery removed)
const SUBJECTS: SubjectKey[] = [
  "Anatomy",
  "Physiology",
  "Biochemistry",
  "Pathology",
  "Pharmacology",
  "Microbiology",
  "Forensic Medicine",
  "Social & Preventive Medicine (SPM) / Community Medicine",
  "General Medicine",
  "Dermatology & Venereology",
  "Psychiatry",
  "Pediatrics",
  "General Surgery",
  "Orthopedics",
  "Anesthesia",
  "Obstetrics & Gynecology",
  "Ophthalmology",
  "Otorhinolaryngology (ENT)",
  "Pulmonary Medicine",
  "Hospital Administration",
  "Sports Medicine",
];

// Attributes (0–10 unless stated)
const ATTRS = [
  {
    key: "surgicalInclination",
    label: "Surgical inclination",
    help: "OR time, operating, hands-on",
  },
  {
    key: "medicalInclination",
    label: "Medical inclination",
    help: "Diagnostics, therapeutics, longitudinal care",
  },
  {
    key: "proceduralLove",
    label: "Love for procedures",
    help: "Endoscopy, scopes, minor OT",
  },
  {
    key: "emergencyTolerance",
    label: "Emergency tolerance",
    help: "Acute care, rapid decisions",
  },
  {
    key: "icuComfort",
    label: "ICU comfort",
    help: "Ventilators, lines, nights",
  },
  {
    key: "fineMotorSkill",
    label: "Fine motor skill",
    help: "Microsuturing, precision work",
  },
  {
    key: "patientInteraction",
    label: "Desire for patient interaction",
    help: "Bedside time, counselling",
  },
  {
    key: "researchAcademia",
    label: "Research & academia",
    help: "Teaching, trials, bench/epi",
  },
  {
    key: "populationHealth",
    label: "Population health",
    help: "Prevention, policy, programs",
  },
  {
    key: "legalForensics",
    label: "Legal/forensics",
    help: "Medico-legal, postmortems, law",
  },
  {
    key: "workLifeBalance",
    label: "Work–life balance",
    help: "Preference for predictable hours",
  },
  {
    key: "nightShifts",
    label: "Night shifts OK",
    help: "Comfort with nights/calls",
  },
  {
    key: "athleteInclination",
    label: "Sports/rehab focus",
    help: "Athletes, MSK, performance",
  },
  { key: "pedsAffinity", label: "Pediatrics affinity", help: "Kids, neonates" },
  { key: "womenHealth", label: "Women’s health", help: "Obstetrics, gynae" },
  {
    key: "lungsLove",
    label: "Respiratory interest",
    help: "Airways, ILD, bronchoscopy",
  },
  {
    key: "visualDetail",
    label: "Visual detail",
    help: "Microscopy, patterns (path/oph)",
  },
  {
    key: "pharmTheory",
    label: "Pharmacology/theory",
    help: "MOA, PK/PD, ADRs",
  },
  {
    key: "desiredPay",
    label: "Desired pay",
    help: "Relative earning expectations",
  }, // NEW
] as const;

type AttrKey = (typeof ATTRS)[number]["key"];

type Answers = Record<AttrKey, number> & {
  prefersOutpatient: boolean;
  prefersTeamLeadership: boolean;
  rankPreferences: SubjectKey[];
  freeText: string;
};

// Subjects that are heavy on direct patient interaction
const PATIENT_HEAVY: SubjectKey[] = [
  "General Medicine",
  "Dermatology & Venereology",
  "Psychiatry",
  "Pediatrics",
  "General Surgery",
  "Orthopedics",
  "Anesthesia",
  "Obstetrics & Gynecology",
  "Ophthalmology",
  "Otorhinolaryngology (ENT)",
  "Pulmonary Medicine",
  "Sports Medicine",
];

// Heuristic profiles (0–10). Includes desiredPay.
const SUBJECT_PROFILES: Record<SubjectKey, Partial<Record<AttrKey, number>>> = {
  Anatomy: {
    researchAcademia: 8,
    visualDetail: 8,
    workLifeBalance: 7,
    desiredPay: 5,
  },
  Physiology: {
    researchAcademia: 8,
    visualDetail: 6,
    workLifeBalance: 7,
    desiredPay: 5,
  },
  Biochemistry: {
    researchAcademia: 9,
    visualDetail: 7,
    pharmTheory: 7,
    workLifeBalance: 8,
    desiredPay: 5,
  },
  Pathology: {
    visualDetail: 9,
    researchAcademia: 7,
    workLifeBalance: 7,
    patientInteraction: 2,
    desiredPay: 7,
  },
  Pharmacology: {
    pharmTheory: 9,
    researchAcademia: 8,
    workLifeBalance: 7,
    desiredPay: 6,
  },
  Microbiology: {
    visualDetail: 7,
    researchAcademia: 7,
    workLifeBalance: 7,
    desiredPay: 6,
  },
  "Forensic Medicine": {
    legalForensics: 9,
    researchAcademia: 6,
    workLifeBalance: 7,
    desiredPay: 6,
  },
  "Social & Preventive Medicine (SPM) / Community Medicine": {
    populationHealth: 10,
    researchAcademia: 7,
    workLifeBalance: 8,
    patientInteraction: 3,
    desiredPay: 6,
  },
  "General Medicine": {
    medicalInclination: 9,
    patientInteraction: 8,
    emergencyTolerance: 6,
    nightShifts: 6,
    desiredPay: 7,
  },
  "Dermatology & Venereology": {
    workLifeBalance: 8,
    visualDetail: 6,
    patientInteraction: 6,
    proceduralLove: 5,
    desiredPay: 9,
  },
  Psychiatry: {
    patientInteraction: 7,
    workLifeBalance: 7,
    researchAcademia: 6,
    desiredPay: 7,
  },
  Pediatrics: {
    pedsAffinity: 10,
    patientInteraction: 8,
    emergencyTolerance: 6,
    nightShifts: 6,
    desiredPay: 6,
  },
  "General Surgery": {
    surgicalInclination: 9,
    emergencyTolerance: 7,
    nightShifts: 7,
    proceduralLove: 8,
    desiredPay: 8,
  },
  Orthopedics: {
    surgicalInclination: 9,
    fineMotorSkill: 7,
    athleteInclination: 7,
    desiredPay: 8,
  },
  Anesthesia: {
    icuComfort: 8,
    emergencyTolerance: 7,
    nightShifts: 7,
    proceduralLove: 7,
    desiredPay: 7,
  },
  "Obstetrics & Gynecology": {
    womenHealth: 10,
    surgicalInclination: 6,
    emergencyTolerance: 7,
    nightShifts: 7,
    desiredPay: 7,
  },
  Ophthalmology: {
    fineMotorSkill: 9,
    visualDetail: 8,
    workLifeBalance: 7,
    desiredPay: 8,
  },
  "Otorhinolaryngology (ENT)": {
    fineMotorSkill: 7,
    surgicalInclination: 7,
    proceduralLove: 7,
    desiredPay: 7,
  },
  "Pulmonary Medicine": {
    lungsLove: 9,
    medicalInclination: 7,
    proceduralLove: 6,
    icuComfort: 6,
    desiredPay: 7,
  },
  "Hospital Administration": {
    workLifeBalance: 7,
    populationHealth: 6,
    desiredPay: 8,
  },
  "Sports Medicine": {
    athleteInclination: 9,
    proceduralLove: 6,
    patientInteraction: 6,
    desiredPay: 7,
  },
};

// --------------------------- Math Helpers --------------------------- //

const clamp01 = (v: number) => Math.max(0, Math.min(10, v));

function cosineSim(a: number[], b: number[]) {
  let dot = 0,
    an = 0,
    bn = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    an += a[i] * a[i];
    bn += b[i] * b[i];
  }
  if (an === 0 || bn === 0) return 0;
  return dot / (Math.sqrt(an) * Math.sqrt(bn));
}

function normalize(v: number[]) {
  const max = Math.max(...v, 1);
  return v.map((x) => x / max);
}

function toVector(ans: Answers): number[] {
  return ATTRS.map((a) => clamp01(ans[a.key] ?? 0));
}

function subjectVector(subj: SubjectKey): number[] {
  return ATTRS.map((a) =>
    clamp01(SUBJECT_PROFILES[subj][a.key as AttrKey] ?? 0)
  );
}

// --------------------------- Rules & Scoring --------------------------- //

function ruleNudges(ans: Answers, ordered: SubjectKey[]): SubjectKey[] {
  const out = [...ordered];

  // Boosts
  if (ans.populationHealth >= 8)
    prioritize(out, [
      "Social & Preventive Medicine (SPM) / Community Medicine",
    ]);
  if (ans.legalForensics >= 8) prioritize(out, ["Forensic Medicine"]);
  if (ans.womenHealth >= 8) prioritize(out, ["Obstetrics & Gynecology"]);
  if (ans.lungsLove >= 8) prioritize(out, ["Pulmonary Medicine"]);
  if (ans.athleteInclination >= 8) prioritize(out, ["Sports Medicine"]);
  if (ans.prefersTeamLeadership) prioritize(out, ["Hospital Administration"]);

  // Deprioritize night-heavy if they dislike
  if (ans.nightShifts <= 3)
    deprioritize(out, ["General Surgery", "Anesthesia", "Pediatrics"]);

  // Pay preference: gently bubble up higher-pay profiles when desiredPay >= 7
  if (ans.desiredPay >= 7)
    prioritize(out, [
      "Dermatology & Venereology",
      "General Surgery",
      "Orthopedics",
      "Ophthalmology",
      "Hospital Administration",
    ]);

  return out;
}

function prioritize(arr: SubjectKey[], keys: SubjectKey[]) {
  for (const k of keys.reverse()) {
    const idx = arr.indexOf(k);
    if (idx > 0) {
      arr.splice(idx, 1);
      arr.unshift(k);
    }
  }
}

function deprioritize(arr: SubjectKey[], keys: SubjectKey[]) {
  for (const k of keys) {
    const idx = arr.indexOf(k);
    if (idx >= 0) {
      arr.splice(idx, 1);
      arr.push(k);
    }
  }
}

function applyHardFilters(ans: Answers, list: SubjectKey[]): SubjectKey[] {
  // If desire for patient interaction is LOW (<=3), exclude patient-heavy branches
  if (ans.patientInteraction <= 3) {
    return list.filter((s) => !PATIENT_HEAVY.includes(s));
  }
  return list;
}

function explainChoice(best: SubjectKey, ans: Answers): string[] {
  const prof = SUBJECT_PROFILES[best];
  const lines: string[] = [];

  const topFeatures = Object.entries(prof)
    .filter(([_, v]) => (v ?? 0) >= 7)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 5);

  for (const [k] of topFeatures) {
    const label = ATTRS.find((a) => a.key === (k as AttrKey))?.label || k;
    const user = (ans as Answers)[k as AttrKey] ?? 0;
    if (k === "desiredPay") {
      if (ans.desiredPay >= 7)
        lines.push("Aligns with your higher desired pay preference.");
      else lines.push("Pay is decent, but you didn’t prioritize it highly.");
      continue;
    }
    if (user >= 6) lines.push(`Strong alignment on “${label}”.`);
    else if (user >= 4) lines.push(`Moderate fit for “${label}”.`);
    else lines.push(`This branch emphasizes “${label}”; you can upskill here.`);
  }

  // Preference rank influence
  const r = ans.rankPreferences;
  if (r && r.length) {
    const rank = r.indexOf(best);
    if (rank === 0) lines.unshift("Matches your #1 ranked preference.");
    else if (rank > 0 && rank < 4)
      lines.unshift(`Close to your top preferences (#${rank + 1}).`);
  }

  // Patient interaction constraint
  if (ans.patientInteraction <= 3) {
    lines.push(
      "You prefer minimal patient interaction; patient-heavy branches were filtered out."
    );
  }

  return lines;
}

// --------------------------- Component --------------------------- //

export default function Page() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("np_subject_pathfinder_v2_light");
      if (raw) return JSON.parse(raw);
    }
    return {
      surgicalInclination: 5,
      medicalInclination: 5,
      proceduralLove: 5,
      emergencyTolerance: 5,
      icuComfort: 5,
      fineMotorSkill: 5,
      patientInteraction: 5,
      researchAcademia: 5,
      populationHealth: 5,
      legalForensics: 3,
      workLifeBalance: 5,
      nightShifts: 5,
      athleteInclination: 3,
      pedsAffinity: 5,
      womenHealth: 4,
      lungsLove: 4,
      visualDetail: 5,
      pharmTheory: 5,
      desiredPay: 6, // NEW default
      prefersOutpatient: false,
      prefersTeamLeadership: false,
      rankPreferences: [...SUBJECTS],
      freeText: "",
    } as Answers;
  });

  // Persist locally
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "np_subject_pathfinder_v2_light",
        JSON.stringify(answers)
      );
    }
  }, [answers]);

  // Auto-lower surgical/medical inclination if patient interaction is LOW
  useEffect(() => {
    if (answers.patientInteraction <= 3) {
      setAnswers((a) => {
        const si = a.surgicalInclination > 3 ? 3 : a.surgicalInclination;
        const mi = a.medicalInclination > 3 ? 3 : a.medicalInclination;
        if (si === a.surgicalInclination && mi === a.medicalInclination)
          return a;
        return { ...a, surgicalInclination: si, medicalInclination: mi };
      });
    }
  }, [answers.patientInteraction]);

  const progress = useMemo(() => Math.round(((step + 1) / 6) * 100), [step]);

  const result = useMemo(() => {
    // Weighted cosine: slightly higher weight to desiredPay & patientInteraction
    const weights: Partial<Record<AttrKey, number>> = {
      desiredPay: 1.2,
      patientInteraction: 1.1,
      workLifeBalance: 1.1,
    };

    const userVecRaw = toVector(answers);
    const userVec = normalize(applyWeights(userVecRaw, weights));

    const scored = SUBJECTS.map((s) => {
      const subjVec = normalize(applyWeights(subjectVector(s), weights));
      const score = cosineSim(userVec, subjVec);
      // gentle tie-breaker: if subject's desiredPay is near user's desiredPay, add a small bonus
      const payDelta =
        Math.abs((SUBJECT_PROFILES[s].desiredPay ?? 5) - answers.desiredPay) <=
        2
          ? 0.015
          : 0;
      return { subj: s, score: score + payDelta };
    })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.subj);

    // Rule-based reorder
    const nudged = ruleNudges(answers, scored);

    // Hard filters (patient interaction low -> exclude patient-heavy)
    const filtered = applyHardFilters(answers, nudged);

    return filtered.slice(0, 5);
  }, [answers]);

  const best = result[0];
  const explanation = useMemo(
    () => (best ? explainChoice(best, answers) : []),
    [best, answers]
  );

  // --------------------------- UI --------------------------- //

  return (
    <main className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
      <div className="mx-auto max-w-4xl px-4 py-10 font-mono">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-xl tracking-tight uppercase">
            NEET-PG Subject Pathfinder
          </h1>
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1 border border-neutral-300 rounded hover:bg-neutral-50"
              onClick={() => {
                localStorage.removeItem("np_subject_pathfinder_v2_light");
                window.location.reload();
              }}
            >
              Reset
            </button>
            <a
              className="px-3 py-1 border border-neutral-300 rounded hover:bg-neutral-50"
              href="#results"
            >
              Jump to Results
            </a>
          </div>
        </header>

        <div className="mt-6">
          <div className="h-2 w-full bg-neutral-200 rounded">
            <div
              className="h-2 bg-neutral-900 rounded transition-all"
              style={{ width: `${progress}%` }}
              aria-label="progress"
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500">Step {step + 1} / 6</p>
        </div>

        {/* Steps */}
        <section className="mt-8 space-y-10">
          {step === 0 && (
            <StepSliders answers={answers} setAnswers={setAnswers} />
          )}
          {step === 1 && (
            <StepLikertGrid answers={answers} setAnswers={setAnswers} />
          )}
          {step === 2 && <StepBinary prefs={answers} setPrefs={setAnswers} />}
          {step === 3 && (
            <StepRank
              rank={answers.rankPreferences}
              setRank={(r) => setAnswers((a) => ({ ...a, rankPreferences: r }))}
            />
          )}
          {step === 4 && (
            <StepScenarios answers={answers} setAnswers={setAnswers} />
          )}
          {step === 5 && (
            <StepFreeText
              value={answers.freeText}
              setValue={(v) => setAnswers((a) => ({ ...a, freeText: v }))}
            />
          )}
        </section>

        <nav className="mt-8 flex items-center justify-between">
          <button
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="px-4 py-2 border border-neutral-300 rounded disabled:opacity-40 hover:bg-neutral-50"
          >
            ← Back
          </button>
          <button
            onClick={() => setStep((s) => Math.min(5, s + 1))}
            className="px-4 py-2 border border-neutral-900 bg-neutral-900 text-white rounded hover:bg-neutral-800"
          >
            {step === 5 ? "Review" : "Next →"}
          </button>
        </nav>

        {/* Results */}
        <section
          id="results"
          className="mt-14 border-t border-neutral-200 pt-8"
        >
          <h2 className="text-lg uppercase tracking-tight">
            Suggested subjects
          </h2>
          {result.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-600">
              No subjects match your constraints. Try increasing patient
              interaction or adjusting preferences.
            </p>
          ) : (
            <ol className="mt-4 space-y-2">
              {result.map((s, i) => (
                <li key={s} className="flex items-start gap-3">
                  <span className="w-6 text-neutral-500">{i + 1}.</span>
                  <span className={i === 0 ? "font-bold" : ""}>{s}</span>
                </li>
              ))}
            </ol>
          )}

          {/* Why */}
          {best && (
            <details className="mt-6 group">
              <summary className="cursor-pointer list-none inline-flex items-center gap-2 select-none">
                <span className="px-3 py-1 border border-neutral-300 rounded group-open:bg-neutral-50">
                  Why this match?
                </span>
              </summary>
              <div className="mt-4 space-y-2 text-sm text-neutral-700">
                <p>
                  <strong>Top recommendation: </strong>
                  {best}
                </p>
                {explanation.map((line, idx) => (
                  <p key={idx}>• {line}</p>
                ))}
                {answers.freeText?.trim() && (
                  <p className="mt-2 italic text-neutral-500">
                    Note from you: “{answers.freeText.trim()}”.
                  </p>
                )}
                <p className="mt-4 text-neutral-400 text-xs">
                  This is a guidance tool; verify with mentors, postings, and
                  program realities.
                </p>
              </div>
            </details>
          )}
        </section>

        <footer className="mt-12 text-xs text-neutral-500">
          Light • Minimal • Mono font • Local-only state
        </footer>
      </div>
    </main>
  );
}

// --------------------------- Utilities --------------------------- //

function applyWeights(
  vec: number[],
  weights: Partial<Record<AttrKey, number>>
) {
  return vec.map((v, i) => {
    const key = ATTRS[i].key;
    const w = weights[key] ?? 1;
    return v * w;
  });
}

// --------------------------- Step Components --------------------------- //

function StepSliders({
  answers,
  setAnswers,
}: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) {
  const sliders: AttrKey[] = [
    "surgicalInclination",
    "medicalInclination",
    "proceduralLove",
    "fineMotorSkill",
    "patientInteraction",
    "desiredPay", // NEW in core sliders for visibility
    "workLifeBalance",
    "nightShifts",
    "emergencyTolerance",
    "icuComfort",
  ];
  return (
    <div>
      <h3 className="uppercase text-sm tracking-widest text-neutral-500">
        Core preferences
      </h3>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {sliders.map((k) => (
          <div key={k} className="border border-neutral-200 rounded p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm">
                {ATTRS.find((a) => a.key === k)?.label}
                <span className="block text-xs text-neutral-500">
                  {ATTRS.find((a) => a.key === k)?.help}
                </span>
              </label>
              <span className="text-xs text-neutral-500">
                {answers[k as AttrKey]}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={answers[k]}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [k]: Number(e.target.value) }))
              }
              className="mt-3 w-full accent-neutral-900"
            />
            <div className="flex justify-between text-[10px] text-neutral-500">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepLikertGrid({
  answers,
  setAnswers,
}: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) {
  const grid: AttrKey[] = [
    "researchAcademia",
    "populationHealth",
    "legalForensics",
    "athleteInclination",
    "pedsAffinity",
    "womenHealth",
    "lungsLove",
    "visualDetail",
    "pharmTheory",
  ];
  const cols = [0, 2, 4, 6, 8, 10];

  return (
    <div>
      <h3 className="uppercase text-sm tracking-widest text-neutral-500">
        Interests map (Likert grid)
      </h3>
      <div className="mt-4 overflow-x-auto border border-neutral-200 rounded">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="text-left p-3 font-normal text-neutral-500">
                Attribute
              </th>
              {cols.map((c) => (
                <th
                  key={c}
                  className="text-center p-3 font-normal text-neutral-500"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((k) => (
              <tr key={k} className="border-t border-neutral-200">
                <td className="p-3">
                  <div className="font-medium">
                    {ATTRS.find((a) => a.key === k)?.label}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {ATTRS.find((a) => a.key === k)?.help}
                  </div>
                </td>
                {cols.map((c) => (
                  <td key={c} className="p-3 text-center">
                    <input
                      type="radio"
                      name={k}
                      checked={answers[k as AttrKey] === c}
                      onChange={() => setAnswers((a) => ({ ...a, [k]: c }))}
                      className="accent-neutral-900"
                      aria-label={`${k}-${c}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StepBinary({
  prefs,
  setPrefs,
}: {
  prefs: Answers;
  setPrefs: React.Dispatch<React.SetStateAction<Answers>>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border border-neutral-200 rounded p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 accent-neutral-900"
            checked={prefs.prefersOutpatient}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, prefersOutpatient: e.target.checked }))
            }
          />
          <span>
            <span className="block text-sm">
              Prefer predominantly outpatient work?
            </span>
            <span className="block text-xs text-neutral-500">
              Clinics, day-care procedures, predictable schedules.
            </span>
          </span>
        </label>
      </div>
      <div className="border border-neutral-200 rounded p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 accent-neutral-900"
            checked={prefs.prefersTeamLeadership}
            onChange={(e) =>
              setPrefs((p) => ({
                ...p,
                prefersTeamLeadership: e.target.checked,
              }))
            }
          />
          <span>
            <span className="block text-sm">
              Interested in team leadership & systems?
            </span>
            <span className="block text-xs text-neutral-500">
              Admin, ops, quality, strategy.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

function StepRank({
  rank,
  setRank,
}: {
  rank: SubjectKey[];
  setRank: (r: SubjectKey[]) => void;
}) {
  const [filter, setFilter] = useState("");
  const filtered = rank.filter((s) =>
    s.toLowerCase().includes(filter.toLowerCase())
  );

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= rank.length) return;
    const copy = [...rank];
    const tmp = copy[idx];
    copy[idx] = copy[j];
    copy[j] = tmp;
    setRank(copy);
  };

  return (
    <div>
      <h3 className="uppercase text-sm tracking-widest text-neutral-500">
        Personal ranking
      </h3>
      <div className="mt-3 flex items-center gap-3">
        <input
          placeholder="Filter subjects…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full md:w-80 px-3 py-2 bg-white border border-neutral-300 rounded outline-none focus:border-neutral-900"
        />
        <button
          className="px-3 py-2 border border-neutral-300 rounded hover:bg-neutral-50"
          onClick={() => setRank(SUBJECTS)}
        >
          Reset order
        </button>
      </div>

      <ul className="mt-4 divide-y divide-neutral-200 border border-neutral-200 rounded">
        {filtered.map((s) => {
          const idx = rank.indexOf(s);
          return (
            <li key={s} className="flex items-center justify-between p-3">
              <span className="text-sm">{s}</span>
              <div className="flex items-center gap-2">
                <button
                  aria-label="move up"
                  className="px-2 py-1 border border-neutral-300 rounded hover:bg-neutral-50"
                  onClick={() => move(idx, -1)}
                >
                  ↑
                </button>
                <button
                  aria-label="move down"
                  className="px-2 py-1 border border-neutral-300 rounded hover:bg-neutral-50"
                  onClick={() => move(idx, +1)}
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-neutral-500">
        Your top 3 now: {rank.slice(0, 3).join(" • ")}
      </p>
    </div>
  );
}

function StepScenarios({
  answers,
  setAnswers,
}: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) {
  const scenarios = [
    {
      q: "A busy trauma night needs rapid decisions. How energized do you feel?",
      k: "emergencyTolerance" as const,
    },
    {
      q: "You’re offered a bronchoscopy list every morning. How excited are you?",
      k: "proceduralLove" as const,
    },
    {
      q: "Neonatal ICU month assigned. Comfort level?",
      k: "icuComfort" as const,
    },
    {
      q: "6-hour microscope session for precise work. Ready?",
      k: "fineMotorSkill" as const,
    },
    {
      q: "Month of clinics, longitudinal counselling. Like it?",
      k: "patientInteraction" as const,
    },
  ];

  return (
    <div>
      <h3 className="uppercase text-sm tracking-widest text-neutral-500">
        Scenarios
      </h3>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {scenarios.map((s) => (
          <div key={s.k} className="border border-neutral-200 rounded p-4">
            <p className="text-sm">{s.q}</p>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={Number(answers[s.k as keyof Answers])}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [s.k]: Number(e.target.value) }))
              }
              className="mt-4 w-full accent-neutral-900"
            />
            <div className="flex justify-between text-[10px] text-neutral-500">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepFreeText({
  value,
  setValue,
}: {
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="uppercase text-sm tracking-widest text-neutral-500">
        Final note (optional)
      </h3>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-3 w-full h-40 bg-white border border-neutral-300 rounded p-3 text-sm outline-none focus:border-neutral-900"
        placeholder="Tell us constraints/dreams (e.g., minimal nights, high pay, love scopes, want admin track)…"
      />
      <p className="mt-2 text-xs text-neutral-500">
        Your note is shown in the explanation for context.
      </p>
    </div>
  );
}
