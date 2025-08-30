"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Exercise } from "./exercises";
import { getRandomExercise } from "./exercises";

/** Types */
type StudyDuration = "30m" | "45m" | "1h" | "1.5h" | "2h";
type StudyIntensity = "high" | "medium" | "low";

/**
 * Break time is DIRECTLY PROPORTIONAL to study intensity.
 * break = baseMinutesByDuration * intensityFactor (rounded)
 */
const baseMinutesByDuration: Record<StudyDuration, number> = {
  "30m": 5,
  "45m": 8,
  "1h": 10,
  "1.5h": 15,
  "2h": 20,
};

const intensityFactor: Record<StudyIntensity, number> = {
  low: 1.0,
  medium: 1.3,
  high: 1.6,
};

const computeBreakMinutes = (dur: StudyDuration, inten: StudyIntensity) =>
  Math.max(1, Math.round(baseMinutesByDuration[dur] * intensityFactor[inten]));

const format2 = (n: number) => String(n).padStart(2, "0");

export default function RechargeProtocol() {
  const [studyDuration, setStudyDuration] = useState<StudyDuration>("30m");
  const [studyIntensity, setStudyIntensity] = useState<StudyIntensity>("high");

  // Timer state (BREAK only)
  const initialBreak = computeBreakMinutes("30m", "high");
  const [totalSeconds, setTotalSeconds] = useState<number>(initialBreak * 60);
  const [isActive, setIsActive] = useState<boolean>(false);

  // Exercise UI
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [showExerciseUI, setShowExerciseUI] = useState<boolean>(false);

  // Derived values
  const currentBreakMinutes = useMemo(
    () => computeBreakMinutes(studyDuration, studyIntensity),
    [studyDuration, studyIntensity]
  );
  const minutes = useMemo(() => Math.floor(totalSeconds / 60), [totalSeconds]);
  const seconds = useMemo(() => totalSeconds % 60, [totalSeconds]);

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /** Helpers */
  const seedTimer = (mins: number) => setTotalSeconds(mins * 60);
  const seedExercise = () => {
    // pass break minutes so tokens like {{MINUTES}} are filled (e.g., "Call a friend for X minutes")
    const ex = getRandomExercise(currentBreakMinutes);
    setExercise(ex);
    setCurrentStepIndex(0);
  };

  // Reseed timer when inputs change
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    seedTimer(currentBreakMinutes);
  }, [currentBreakMinutes]);

  // Countdown effect
  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTotalSeconds((prev) => {
        if (prev > 0) return prev - 1;

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsActive(false);
        // keep exercise UI up; user can close
        try {
          audioRef.current?.play().catch(() => {});
        } catch {}
        return 0;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive]);

  /** Actions */
  const onStartPause = () => {
    setIsActive((prev) => {
      const next = !prev;
      if (next) {
        // starting
        seedExercise();
        setShowExerciseUI(true); // show minimal exercise view
      }
      return next;
    });
  };

  const onReset = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    seedTimer(currentBreakMinutes);
    setCurrentStepIndex(0);
  };

  const closeExerciseUI = () => setShowExerciseUI(false);

  const nextStep = () => {
    if (!exercise) return;
    setCurrentStepIndex((i) => Math.min(i + 1, exercise.steps.length - 1));
  };

  const prevStep = () => {
    if (!exercise) return;
    setCurrentStepIndex((i) => Math.max(i - 1, 0));
  };

  /** Minimal, monochrome button classes (responsive + smaller) */
  const btn =
    "px-3 py-1.5 text-xs sm:text-sm font-mono rounded border border-neutral-300 text-neutral-900 bg-white hover:bg-neutral-100 transition-colors";
  const btnPrimary =
    "px-3 py-1.5 text-xs sm:text-sm font-mono rounded border border-neutral-900 text-white bg-neutral-900 hover:bg-neutral-800 transition-colors";
  const chip =
    "text-[10px] sm:text-xs px-2 py-0.5 rounded border border-neutral-200 text-neutral-600";

  /** If exercise UI is showing, render ONLY the minimal overlay */
  if (showExerciseUI) {
    const totalSteps = exercise?.steps.length ?? 0;
    const step = exercise?.steps[currentStepIndex];

    return (
      <div className="min-h-screen bg-white text-neutral-900 font-mono">
        {/* Sticky top bar for mobile usability */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 border-b border-neutral-200 bg-white">
          <div className="flex items-center gap-2">
            <span className={chip}>Break</span>
            <span className="text-xs text-neutral-600">
              {format2(minutes)}:{format2(seconds)}
            </span>
            {/* Beta mention in overlay */}
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded border border-neutral-300 text-neutral-700">
              Beta
            </span>
          </div>

          {/* Close (X) */}
          <button
            aria-label="Close exercise"
            onClick={closeExerciseUI}
            className="h-7 w-7 inline-flex items-center justify-center rounded border border-neutral-300 hover:bg-neutral-100"
          >
            ×
          </button>
        </div>

        {/* Exercise body (responsive paddings) */}
        <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-3 pb-6">
          <div className="mb-2 text-xs sm:text-sm text-neutral-600">
            {exercise ? exercise.name : "Preparing exercise"}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="text-sm">
              Step {totalSteps ? currentStepIndex + 1 : 0}/{totalSteps}
            </div>
            {/* Hidden study/break details per request */}
          </div>

          <div className="border border-neutral-200 rounded p-3 sm:p-4">
            <div className="text-base sm:text-lg leading-relaxed whitespace-pre-line">
              {step?.instruction ?? "Follow the next step."}
            </div>
          </div>

          {/* Controls (stack on mobile) */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <button
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className={`${btn} disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto`}
            >
              Back
            </button>

            {currentStepIndex < totalSteps - 1 ? (
              <button
                onClick={nextStep}
                className={`${btnPrimary} w-full sm:w-auto`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={closeExerciseUI}
                className={`${btnPrimary} w-full sm:w-auto`}
              >
                Done
              </button>
            )}
          </div>

          {/* Timer finished note */}
          {totalSeconds === 0 && (
            <div className="mt-3 text-xs sm:text-sm text-neutral-600">
              Break finished. You can close this panel or review steps.
            </div>
          )}
        </div>

        {/* Beep */}
        <audio
          ref={audioRef}
          src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
          preload="auto"
        />
      </div>
    );
  }

  /** Configuration + timer view — top-aligned with *little* top padding, responsive */
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-mono pt-3 sm:pt-5">
      <div className="mx-auto w-full max-w-3xl border border-neutral-200 bg-white rounded-none sm:rounded-xl px-4 sm:px-6 py-5">
        <h1 className="text-xl sm:text-2xl font-bold text-center sm:text-left">
          Recharge Protocol
        </h1>

        {/* Beta notice */}
        <div className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
          <p className="text-xs sm:text-sm text-neutral-700">
            <span className="mr-2 inline-flex items-center rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide">
              Beta
            </span>
            This tool is in beta — expect occasional breaking changes.
          </p>
        </div>

        {/* Controls */}
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm text-neutral-700">Study Duration</label>
            <div className="flex flex-wrap gap-2">
              {(["30m", "45m", "1h", "1.5h", "2h"] as StudyDuration[]).map(
                (d) => {
                  const active = studyDuration === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setStudyDuration(d)}
                      aria-pressed={active}
                      className={`px-3 py-1.5 text-xs sm:text-sm rounded border transition-colors ${
                        active
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-900 border-neutral-300 hover:bg-neutral-100"
                      }`}
                    >
                      {d}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm text-neutral-700">Study Intensity</label>
            <div className="flex flex-wrap gap-2">
              {(["high", "medium", "low"] as StudyIntensity[]).map((i) => {
                const active = studyIntensity === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStudyIntensity(i)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 text-xs sm:text-sm rounded border capitalize transition-colors ${
                      active
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-900 border-neutral-300 hover:bg-neutral-100"
                    }`}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="mt-4 sm:mt-5 flex flex-col items-start gap-1">
          <div className="text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight">
            {format2(minutes)}:{format2(seconds)}
          </div>
          <div className="text-xs sm:text-sm text-neutral-600">
            Break{" "}
            <span className="font-semibold">{currentBreakMinutes} min</span>{" "}
            (based on {studyDuration} • {studyIntensity})
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onStartPause}
            className={`${isActive ? btn : btnPrimary} w-full sm:w-auto`}
          >
            {isActive ? "Pause" : "Start"}
          </button>
          <button
            type="button"
            onClick={onReset}
            className={`${btn} w-full sm:w-auto`}
          >
            Reset
          </button>
        </div>

        {/* Beep at end */}
        <audio
          ref={audioRef}
          src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
          preload="auto"
        />
      </div>
    </div>
  );
}
