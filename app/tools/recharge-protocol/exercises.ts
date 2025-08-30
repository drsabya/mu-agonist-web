// exercises.ts

export type ExerciseStep = {
  instruction: string;
};

export type Exercise = {
  id: string;
  name: string;
  description: string;
  steps: ExerciseStep[];
  videoUrl?: string; // optional, for items that benefit from a video
};

/**
 * NOTE:
 * - The first three exercises are kept EXACT and UNMODIFIED per your requirement.
 * - Additional "relaxation" items are appended.
 * - To reflect the available break time in steps (e.g., "Call a friend for ... min"),
 *   use getRandomExercise(breakMinutes) or call renderExerciseForBreak(ex, breakMinutes).
 */
export const exercises: Exercise[] = [
  {
    id: "box-breathing",
    name: "Box Breathing",
    description:
      "While there are many different forms of deep breathing exercises, box breathing can be particularly helpful with relaxation. Box breathing is a breathing exercise to assist patients with stress management and can be implemented before, during, and/or after stressful experiences. Box breathing uses four simple steps. Its title is intended to help the patient visualize a box with four equal sides as they perform the exercise. This exercise can be implemented in a variety of circumstances and does not require a calm environment to be effective.",
    steps: [
      {
        instruction: "Step One: Breathe in through the nose for a count of 4.",
      },
      { instruction: "Step Two: Hold breath for a count of 4." },
      { instruction: "Step Three: Breath out for a count of 4." },
      { instruction: "Step Four: Hold breath for a count of 4." },
      { instruction: "Repeat" },
      {
        instruction:
          "Note: The length of the steps can be adjusted to accommodate the individual (e.g., 2 seconds instead of 4 seconds for each step).",
      },
    ],
  },
  {
    id: "guided-imagery",
    name: "Guided Imagery",
    description:
      "Guided imagery is a relaxation exercise intended to assist patients with visualizing a calming environment. Visualization of tranquil settings assists patients with managing stress via distraction from intrusive thoughts. Cognitive behavioral theory suggests that emotions are derived from thoughts, therefore, if intrusive thoughts can be managed, the emotional consequence is more manageable. Imagery employs all five senses to create a deeper sense of relaxation. Guided imagery can be practiced individually or with the support of a narrator.",
    steps: [
      {
        instruction:
          "Step One: Sit or lie down comfortably. Ideally, the space will have minimal distractions.",
      },
      {
        instruction:
          "Step Two: Visualize a relaxing environment by either recalling one from memory or created one through imagination (e.g., a day at the beach). Elicit elements of the environment using each of the five senses using the following prompts:\nWhat do you see? (e.g., deep, blue color of the water)\nWhat do you hear? (e.g., waves crashing along the shore)\nWhat do you smell? (e.g., fruity aromas from sunscreen)\nWhat do you taste? (e.g., salty sea air)\nWhat do you feel? (e.g., warmth of the sun)",
      },
      {
        instruction:
          "Step Three: Sustain the visualization as long as needed or able, focusing on taking slow, deep breaths throughout the exercise. Focus on the feelings of calm associated with being in a relaxing environment.",
      },
    ],
  },
  {
    id: "progressive-muscle-relaxation",
    name: "Progressive Muscle Relaxation",
    description:
      "Progressive Muscle Relaxation (PMR) is a relaxation technique targeting the symptom of tension associated with anxiety. The exercise involves tensing and releasing muscles, progressing throughout the body, with the focus on the release of the muscle as the relaxation phase. Progressive muscle relaxation can be practiced individually or with the support of a narrator.",
    steps: [
      {
        instruction:
          "Step One: Sit or lie down comfortably. Ideally, the space will have minimal distractions.",
      },
      {
        instruction:
          "Step Two: Starting at the feet, curl the toes under and tense the muscles in the foot. Hold for 5 seconds, then slowly release for 10 seconds. During the release, focus attention on the alleviation of tension and the experience of relaxation.",
      },
      {
        instruction:
          "Step Three: Tense the muscles in the lower legs. Hold for 5 seconds, then slowly release for 10 seconds. During the release, focus attention on the alleviation of tension and the experience of relaxation.",
      },
      {
        instruction:
          "Step Four: Tense the muscles in the hips and buttocks. Hold for 5 seconds, then slowly release for 10 seconds. During the release, focus attention on the alleviation of tension and the experience of relaxation.",
      },
      {
        instruction:
          "Step Five: Tense the muscles in the stomach and chest. Hold for 5 seconds, then slowly release for 10 seconds. During the release, focus attention on the alleviation of tension and the experience of relaxation.",
      },
      {
        instruction:
          "Step Six: Tense the muscles in the shoulders. Hold for 5 seconds, then slowly release for 10 seconds. During the release, focus attention on the alleviation of tension and the experience of relaxation.",
      },
      {
        instruction:
          "Step Seven: Tense the muscles in the face (e.g., squeezing eyes shut). Hold for 5 seconds, then slowly release for 10 seconds. During the release, focus attention on the alleviation of tension and the experience of relaxation.",
      },
      {
        instruction:
          "Step Eight: Tense the muscles in the hand, creating a fist. Hold for 5 seconds, then slowly release for 10 seconds. During the release, focus attention on the alleviation of tension and the experience of relaxation.",
      },
      {
        instruction:
          " Note: Be careful not to tense to the point of physical pain, and be mindful to take slow, deep breaths throughout the exercise.",
      },
    ],
  },

  // ------------------------------
  // Additional relaxation activities
  // ------------------------------

  {
    id: "call-a-friend",
    name: "Call a Friend",
    description:
      "Use your break to connect with someone you care about. Keep it light and uplifting.",
    steps: [
      { instruction: "Find a comfortable, quiet spot." },
      { instruction: "Decide who you’d like to call." },
      // The {{MINUTES}} token can be replaced with the available break time.
      { instruction: "Call a friend for {{MINUTES}} minutes." },
      { instruction: "Wrap up kindly and return to your session." },
    ],
  },

  {
    id: "wash-face-and-hydrate",
    name: "Wash Face & Drink Water",
    description:
      "Simple refresh: wash your face and hydrate slowly to reset your focus.",
    steps: [
      { instruction: "Head to the sink and wash your face." },
      { instruction: "Fill a glass with water." },
      { instruction: "Drink the water slowly, one sip at a time." },
      { instruction: "Pat your face dry and take a deep breath." },
    ],
  },

  {
    id: "fold-and-iron-clothes",
    name: "Fold & Iron Clothes",
    description:
      "Tidy a small batch of laundry—fold basics and iron one or two key items.",
    steps: [
      { instruction: "Gather a small set of clean clothes." },
      { instruction: "Fold shirts, pants, and small items neatly." },
      { instruction: "Set up the iron safely (check heat setting)." },
      { instruction: "Iron 1–2 items that need it." },
    ],
  },

  {
    id: "party-clothes-combos",
    name: "Plan Party Clothes Combinations",
    description:
      "Mix and match tops, bottoms, and accessories to pre-plan an outfit.",
    steps: [
      { instruction: "Pick 2–3 tops, 2 bottoms, and 1 outer layer." },
      { instruction: "Create 2–3 outfit combinations." },
      { instruction: "Snap quick photos to remember your favorites." },
      { instruction: "Set aside the winning combo." },
    ],
  },

  {
    id: "refresh-change-groom",
    name: "Change Clothes & Groom",
    description: "Quick grooming reset to feel fresh and alert.",
    steps: [
      { instruction: "Change into a comfortable, clean outfit." },
      { instruction: "Wash your face." },
      { instruction: "Comb/brush your hair neatly." },
    ],
  },
];

/** Utility: clone an exercise (to avoid mutating the base array). */
function cloneExercise(ex: Exercise): Exercise {
  return {
    id: ex.id,
    name: ex.name,
    description: ex.description,
    steps: ex.steps.map((s) => ({ ...s })),
    videoUrl: ex.videoUrl,
  };
}

/**
 * Render an exercise with the provided break minutes.
 * Currently replaces the token {{MINUTES}} in any step instruction.
 */
export function renderExerciseForBreak(
  ex: Exercise,
  breakMinutes: number
): Exercise {
  const c = cloneExercise(ex);
  const minutes = Math.max(1, Math.round(breakMinutes));
  c.steps = c.steps.map((s) => ({
    instruction: s.instruction.replace(/\{\{MINUTES\}\}/g, String(minutes)),
  }));
  return c;
}

/**
 * Get a random exercise.
 * - If breakMinutes is provided, tokens like {{MINUTES}} are replaced.
 * - Backward compatible with prior usage (no argument).
 */
export function getRandomExercise(breakMinutes?: number): Exercise {
  const base = exercises[Math.floor(Math.random() * exercises.length)];
  return typeof breakMinutes === "number"
    ? renderExerciseForBreak(base, breakMinutes)
    : cloneExercise(base);
}
