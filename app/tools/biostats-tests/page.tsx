// app/tools/biostats-tests/page.tsx
"use client";
import React, { useMemo, useState } from "react";

/** ─────────────────────────────────────────────────────────────────────────────
 * Version/Status
 * ────────────────────────────────────────────────────────────────────────────*/
const VERSION = "v0.1";
const STATUS = "beta";

/** ─────────────────────────────────────────────────────────────────────────────
 * Types & Catalog
 * ────────────────────────────────────────────────────────────────────────────*/
type VarType = "continuous" | "ordinal" | "categorical";
type Category = "Comparison" | "Association" | "Prediction";

type Variable = {
  name: string;
  type: VarType;
  levels?: number; // for categorical only
};

const ICONS: Record<VarType, string> = {
  continuous: "📈",
  ordinal: "🪜",
  categorical: "🏷️",
};

const CONTINUOUS: Variable[] = [
  { name: "Systolic blood pressure (mmHg)", type: "continuous" },
  { name: "Serum creatinine (mg/dL)", type: "continuous" },
  { name: "Hemoglobin (g/dL)", type: "continuous" },
  { name: "BMI (kg/m²)", type: "continuous" },
  { name: "Age (years)", type: "continuous" },
];

const ORDINAL: Variable[] = [
  { name: "Pain score (VAS 0–10)", type: "ordinal" },
  { name: "NYHA class (I–IV)", type: "ordinal" },
  { name: "Tumor stage (I–IV)", type: "ordinal" },
  { name: "Likert satisfaction (1–5)", type: "ordinal" },
  { name: "Glasgow Coma Scale (3–15)", type: "ordinal" },
];

/** Treatment presets + other categorical vars */
const CATEGORICAL: Variable[] = [
  { name: "Sex (male/female)", type: "categorical", levels: 2 },
  { name: "Smoking status (yes/no)", type: "categorical", levels: 2 },
  { name: "Treatment (A vs placebo)", type: "categorical", levels: 2 }, // preset
  { name: "Treatment (A/B/placebo)", type: "categorical", levels: 3 }, // preset
  { name: "Blood type (A/B/AB/O)", type: "categorical", levels: 4 },
  { name: "Disease status (present/absent)", type: "categorical", levels: 2 },
];

const ALL_VARS: Variable[] = [...CONTINUOUS, ...ORDINAL, ...CATEGORICAL];

/** Helpers */
const withIcon = (v: Variable) => `${ICONS[v.type]} ${v.name}`;
const isBinary = (v: Variable) =>
  v.type === "categorical" && (v.levels ?? 0) === 2;

/** ─────────────────────────────────────────────────────────────────────────────
 * Suggestion Engine (Univariate only)
 * ────────────────────────────────────────────────────────────────────────────*/
function suggestTest(params: {
  indep: Variable[];
  dep: Variable | null;
  category: Category;
  assumeNormal: boolean;
  paired: boolean;
  smallSample2x2: boolean;
}): { test?: string; note?: string } {
  const { indep, dep, category, assumeNormal, paired, smallSample2x2 } = params;

  if (!dep) return { note: "Select exactly one dependent (outcome) variable." };

  // Rule: If ≥2 independents and category ≠ Prediction → advise individual tests & suggest Prediction
  if (indep.length >= 2 && category !== "Prediction") {
    return {
      note: "You selected ≥2 predictors. For Comparison/Association, run individual tests for each predictor–outcome pair. To assess combined effects of multiple predictors on one outcome, switch to Prediction.",
    };
  }

  /** Association (one predictor + one outcome) */
  if (category === "Association") {
    if (indep.length < 1)
      return { note: "Select one independent variable to assess association." };
    const a = indep[0];
    const b = dep;

    if (a.type === "continuous" && b.type === "continuous") {
      return assumeNormal
        ? { test: "Pearson correlation (r)" }
        : { test: "Spearman correlation (ρ)" };
    }

    if (a.type === "ordinal" && b.type === "ordinal") {
      return { test: "Kendall’s Tau" };
    }

    if (
      (a.type === "ordinal" && b.type !== "categorical") ||
      (b.type === "ordinal" && a.type !== "categorical")
    ) {
      return { test: "Spearman correlation (ρ)" };
    }

    if (a.type === "categorical" && b.type === "categorical") {
      if (isBinary(a) && isBinary(b)) return { test: "Phi coefficient" };
      return { test: "Cramér’s V" };
    }

    // Mixed continuous + categorical → steer to Comparison logic
    return {
      note: "For continuous + categorical association, compare group differences instead: use t-test/ANOVA (normal) or Mann–Whitney/Kruskal–Wallis (non-normal) under Comparison.",
    };
  }

  /** Comparison (group differences; requires a categorical grouping predictor) */
  if (category === "Comparison") {
    const group = indep.find((v) => v.type === "categorical");
    if (!group)
      return {
        note: "Choose a categorical predictor as the grouping variable.",
      };

    const groups = group.levels ?? 2;

    if (dep.type === "continuous") {
      if (paired)
        return assumeNormal
          ? { test: "Paired t-test" }
          : { test: "Wilcoxon signed-rank test" };
      if (groups === 2)
        return assumeNormal
          ? { test: "t-test" }
          : { test: "Mann–Whitney U test" };
      return assumeNormal
        ? { test: "One-way ANOVA" }
        : { test: "Kruskal–Wallis H test" };
    }

    if (dep.type === "ordinal") {
      if (paired) return { test: "Wilcoxon signed-rank test" };
      return groups === 2
        ? { test: "Mann–Whitney U test" }
        : { test: "Kruskal–Wallis H test" };
    }

    if (dep.type === "categorical") {
      if (isBinary(dep)) {
        if (paired) return { test: "McNemar’s test" };
        if (groups === 2)
          return smallSample2x2
            ? { test: "Fisher’s exact test" }
            : { test: "Chi-square test" };
        return { test: "Chi-square test" };
      }
      return { test: "Chi-square test" };
    }
  }

  /** Prediction (univariate outcome) */
  if (category === "Prediction") {
    if (dep.type === "continuous") return { test: "Linear regression" };

    if (dep.type === "categorical") {
      if (isBinary(dep))
        return {
          test: "Binomial Logistic Regression",
          note: "Binary outcome (levels = 2) → logit link by default.",
        };
      return {
        test: "Multinomial Logistic Regression",
        note: "Multi-class outcome (levels > 2).",
      };
    }

    if (dep.type === "ordinal") {
      return {
        note: "Ordinal outcomes are typically modeled with Ordinal Logistic Regression.",
      };
    }
  }

  return { note: "Adjust your selections to match a supported mapping." };
}

/** ─────────────────────────────────────────────────────────────────────────────
 * Documentation (toggleable blurbs for each test)
 * ────────────────────────────────────────────────────────────────────────────*/
const TEST_DOCS: Record<string, string> = {
  "t-test":
    "Compare means between 2 independent groups for a continuous, approximately normal outcome.",
  "Paired t-test":
    "Compare means of a continuous outcome in paired/repeated measures (normal).",
  "One-way ANOVA":
    "Compare means across >2 independent groups for a continuous, normal outcome.",
  "Mann–Whitney U test":
    "Nonparametric alternative to t-test for 2 groups or for ordinal outcomes.",
  "Wilcoxon signed-rank test":
    "Nonparametric paired alternative to paired t-test for continuous/ordinal outcomes.",
  "Kruskal–Wallis H test":
    "Nonparametric alternative to one-way ANOVA for >2 groups or ordinal outcomes.",
  "Chi-square test":
    "Test association between categorical variables; needs adequate expected counts.",
  "Fisher’s exact test":
    "Exact test for 2×2 tables with small sample/low expected counts.",
  "McNemar’s test": "Test change/discordance in paired binary outcomes.",
  "Pearson correlation (r)":
    "Linear association between two continuous, approximately normal variables.",
  "Spearman correlation (ρ)":
    "Monotonic association between two variables (ranks); for non-normal or ordinal mixes.",
  "Kendall’s Tau": "Association between two ordinal variables; robust to ties.",
  "Phi coefficient":
    "Association between two binary variables (special case of correlation for 2×2).",
  "Cramér’s V":
    "Strength of association for categorical × categorical with >2 levels.",
  "Linear regression":
    "Predict continuous outcome from one or more predictors; coefficients are mean differences/slopes.",
  "Binomial Logistic Regression":
    "Predict binary outcome; outputs log-odds/odds ratios.",
  "Multinomial Logistic Regression":
    "Predict multi-class categorical outcome; compares each class to reference.",
};

/** ─────────────────────────────────────────────────────────────────────────────
 * UI (single outcome; mutual exclusion between sides)
 * ────────────────────────────────────────────────────────────────────────────*/
export default function BiostatsTestsPage() {
  const [indep, setIndep] = useState<Variable[]>([]);
  const [dep, setDep] = useState<Variable | null>(null);

  const [category, setCategory] = useState<Category>("Comparison");
  const [assumeNormal, setAssumeNormal] = useState<boolean>(true);
  const [paired, setPaired] = useState<boolean>(false);
  const [smallSample2x2, setSmallSample2x2] = useState<boolean>(false);

  // Docs toggles
  const [showCurrentDoc, setShowCurrentDoc] = useState<boolean>(false);
  const [openDocs, setOpenDocs] = useState<Record<string, boolean>>({});

  /** Mutual exclusion: a variable selected on one side is hidden on the other,
   *  while still visible on its chosen side to allow unselecting. */
  const indepNames = new Set(indep.map((v) => v.name));
  const depName = dep?.name ?? null;

  const filterForIndep = (vars: Variable[]) =>
    vars.filter((v) => v.name !== depName || indepNames.has(v.name));

  const filterForDep = (vars: Variable[]) =>
    vars.filter((v) => !indepNames.has(v.name) || v.name === depName);

  const suggest = useMemo(
    () =>
      suggestTest({
        indep,
        dep,
        category,
        assumeNormal,
        paired,
        smallSample2x2,
      }),
    [indep, dep, category, assumeNormal, paired, smallSample2x2]
  );

  const toggleIndep = (v: Variable) => {
    const exists = indep.some((x) => x.name === v.name);
    setIndep(exists ? indep.filter((x) => x.name !== v.name) : [...indep, v]);
  };

  const selectDep = (v: Variable) => {
    setDep((curr) => (curr?.name === v.name ? null : v));
  };

  const CheckItem = ({
    v,
    checked,
    onChange,
  }: {
    v: Variable;
    checked: boolean;
    onChange: () => void;
  }) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="accent-black"
        checked={checked}
        onChange={onChange}
      />
      <span>{withIcon(v)}</span>
    </label>
  );

  const RadioItem = ({
    v,
    selected,
    onChange,
  }: {
    v: Variable;
    selected: boolean;
    onChange: () => void;
  }) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="radio"
        name="dep-radio"
        className="accent-black"
        checked={selected}
        onChange={onChange}
      />
      <span>{withIcon(v)}</span>
    </label>
  );

  const GroupIndep = ({ title, vars }: { title: string; vars: Variable[] }) => (
    <div>
      <h3 className="text-xs font-semibold tracking-tight mb-2">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-auto border border-neutral-200 p-2">
        {vars.map((v) => (
          <CheckItem
            key={v.name}
            v={v}
            checked={indep.some((x) => x.name === v.name)}
            onChange={() => toggleIndep(v)}
          />
        ))}
      </div>
    </div>
  );

  const GroupDep = ({ title, vars }: { title: string; vars: Variable[] }) => (
    <div>
      <h3 className="text-xs font-semibold tracking-tight mb-2">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-auto border border-neutral-200 p-2">
        {vars.map((v) => (
          <RadioItem
            key={v.name}
            v={v}
            selected={dep?.name === v.name}
            onChange={() => selectDep(v)}
          />
        ))}
      </div>
    </div>
  );

  const SelectionSummary = () => (
    <div className="text-xs text-neutral-700 space-y-1">
      <div>
        <span className="font-semibold">Independent (predictors):</span>{" "}
        {indep.length ? indep.map((v) => withIcon(v)).join(" · ") : "—"}
      </div>
      <div>
        <span className="font-semibold">Dependent (outcome):</span>{" "}
        {dep ? withIcon(dep) : "—"}
      </div>
    </div>
  );

  const toggleDoc = (key: string) =>
    setOpenDocs((s) => ({ ...s, [key]: !s[key] }));

  return (
    <main className="min-h-screen bg-white text-neutral-900 font-mono p-6">
      {/* Version badge */}
      <div className="mb-2">
        <span className="inline-flex items-center rounded-full border border-neutral-300 bg-neutral-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-700">
          {VERSION} • {STATUS}
        </span>
      </div>

      {/* Title (smaller, bold, no emoji) */}
      <h1 className="text-lg font-bold tracking-tight">
        Biostats Tests — Univariate (single outcome)
      </h1>

      {/* Variable selection */}
      <section className="mt-6">
        <div className="border border-neutral-300 p-4">
          <h2 className="text-sm font-semibold tracking-tight mb-3">
            Select variables
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Independent */}
            <div>
              <h3 className="text-sm font-semibold mb-2">
                Independent (predictors)
              </h3>
              <div className="space-y-4">
                <GroupIndep
                  title="📈 Continuous"
                  vars={filterForIndep(CONTINUOUS)}
                />
                <GroupIndep title="🪜 Ordinal" vars={filterForIndep(ORDINAL)} />
                <GroupIndep
                  title="🏷️ Categorical"
                  vars={filterForIndep(CATEGORICAL)}
                />
              </div>
            </div>

            {/* Dependent (single selection via radio) */}
            <div>
              <h3 className="text-sm font-semibold mb-2">
                Dependent (outcome)
              </h3>
              <div className="space-y-4">
                <GroupDep
                  title="📈 Continuous"
                  vars={filterForDep(CONTINUOUS)}
                />
                <GroupDep title="🪜 Ordinal" vars={filterForDep(ORDINAL)} />
                <GroupDep
                  title="🏷️ Categorical"
                  vars={filterForDep(CATEGORICAL)}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded border border-neutral-200 bg-neutral-50 p-3">
            <SelectionSummary />
          </div>
        </div>
      </section>

      {/* Options & Result — below variable selection */}
      <section className="mt-6">
        <div className="border border-neutral-300 p-4">
          <h2 className="text-sm font-semibold tracking-tight mb-3">
            Options & Result
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <label className="block">
              <span className="text-xs text-neutral-700">Category</span>
              <select
                className="mt-1 w-full border border-neutral-300 bg-white px-2 py-1 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                <option value="Comparison">Comparison</option>
                <option value="Association">Association</option>
                <option value="Prediction">Prediction</option>
              </select>
            </label>

            {/* Normality */}
            <label className="flex items-center gap-2 text-sm mt-5 sm:mt-0">
              <input
                type="checkbox"
                className="accent-black"
                checked={assumeNormal}
                onChange={(e) => setAssumeNormal(e.target.checked)}
              />
              Assume normality (affects 📈 outcomes & Pearson)
            </label>

            {/* Pairing */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-black"
                checked={paired}
                onChange={(e) => setPaired(e.target.checked)}
              />
              Paired / Repeated measures
            </label>

            {/* Small sample 2x2 */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-black"
                checked={smallSample2x2}
                onChange={(e) => setSmallSample2x2(e.target.checked)}
              />
              Small sample (2×2 tables)
            </label>
          </div>

          {/* Result */}
          <div className="mt-4 rounded border border-neutral-200 bg-neutral-50 p-4">
            {suggest.test ? (
              <>
                <div className="text-sm flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded border border-neutral-900 bg-neutral-900 px-2 py-0.5 text-white">
                    Test
                  </span>
                  <strong>{suggest.test}</strong>
                  {TEST_DOCS[suggest.test] && (
                    <button
                      className="ml-auto text-xs underline decoration-dotted hover:opacity-80"
                      onClick={() => setShowCurrentDoc((s) => !s)}
                    >
                      {showCurrentDoc ? "Hide" : "Show"} doc for this test
                    </button>
                  )}
                </div>
                {suggest.note && (
                  <p className="mt-2 text-xs text-neutral-700">
                    {suggest.note}
                  </p>
                )}
                {showCurrentDoc && TEST_DOCS[suggest.test] && (
                  <div className="mt-3 text-xs border border-neutral-200 bg-white p-3">
                    <div className="font-semibold mb-1">
                      Doc — {suggest.test}
                    </div>
                    <p className="text-neutral-700">
                      {TEST_DOCS[suggest.test]}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-neutral-700">
                {suggest.note ?? "Make selections to see the suggested test."}
              </p>
            )}
          </div>

          <div className="mt-4 text-[11px] text-neutral-500">
            Univariate only (single outcome). Logistic regression
            (binomial/multinomial) under Prediction. Treatment presets added.
          </div>
        </div>
      </section>

      {/* Documentation (toggleable per test) */}
      <section className="mt-6">
        <div className="border border-neutral-300 p-4">
          <h2 className="text-sm font-semibold tracking-tight mb-3">
            Documentation (expand what you need)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(TEST_DOCS).map(([key, text]) => (
              <div key={key} className="border border-neutral-200">
                <button
                  className="w-full text-left px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
                  onClick={() => toggleDoc(key)}
                >
                  {openDocs[key] ? "▼" : "▶"} {key}
                </button>
                {openDocs[key] && (
                  <div className="px-3 pb-3 text-xs text-neutral-700 bg-neutral-50">
                    {text}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
