export type ProgramGroup = string;

export const DEFAULT_PROGRAM_GROUPS = [
  "Resistance training",
  "Conditioning",
  "Resistance + conditioning",
] as const;

export type ProgramId =
  | "complimentary"
  | "strength"
  | "pump"
  | "hyper"
  | "hirt"
  | "power"
  | "hyrox"
  | "cardio-summit"
  | "cardio-u"
  | "cardio-hiit"
  | "crewfit"
  | "xtx"
  | "strength-endurance"
  | "shred"
  | "balanced";

export type ProgramDefinition = {
  id: ProgramId;
  name: string;
  group: ProgramGroup;
  focus: string;
  scienceNote: string;
};

export const programCatalog: ProgramDefinition[] = [
  {
    id: "complimentary",
    name: "Complimentary",
    group: "Resistance training",
    focus:
      "Accessible full-body resistance training built around stable machines, dumbbells, and low-complexity movement patterns.",
    scienceNote:
      "Bias toward broad muscular coverage, simple setup, and repeatable technique so newer or complimentary members can train confidently.",
  },
  {
    id: "strength",
    name: "Strength",
    group: "Resistance training",
    focus: "Heavy compound resistance with longer rest to support force production and progressive overload.",
    scienceNote: "Bias toward high-force output, lower rep quality, and adequate inter-set recovery.",
  },
  {
    id: "pump",
    name: "Pump",
    group: "Resistance training",
    focus: "High-volume resistance work targeting local muscular fatigue and metabolic stress.",
    scienceNote: "Bias toward moderate loads, shorter rest, and higher repetition density for hypertrophy support.",
  },
  {
    id: "hyper",
    name: "Hyper",
    group: "Resistance training",
    focus: "Hypertrophy-focused resistance training with unilateral control and time under tension.",
    scienceNote: "Bias toward tissue loading, unilateral stability, and moderate rest for muscle growth stimulus.",
  },
  {
    id: "hirt",
    name: "H.I.R.T",
    group: "Resistance training",
    focus: "High-intensity resistance training using structured work-rest pressure and repeat efforts.",
    scienceNote: "Bias toward resistance-based conditioning with EMOM/AMRAP-style stress while preserving movement quality.",
  },
  {
    id: "power",
    name: "Power",
    group: "Resistance training",
    focus: "Explosive resistance and fast force expression through dynamic movement.",
    scienceNote: "Bias toward rate of force development, crisp intent, and lower fatigue per effort.",
  },
  {
    id: "hyrox",
    name: "Hyrox",
    group: "Resistance + conditioning",
    focus:
      "Race-style hybrid conditioning that blends treadmill running with repeatable functional stations under fatigue.",
    scienceNote:
      "Bias toward compromised running, station efficiency, sustained threshold output, and pacing across long mixed-modality efforts.",
  },
  {
    id: "cardio-summit",
    name: "Cardio Summit",
    group: "Conditioning",
    focus: "Aerobic work capacity with sustained submaximal effort and climbing thresholds.",
    scienceNote: "Bias toward aerobic system development with longer intervals below all-out intensity.",
  },
  {
    id: "cardio-u",
    name: "Cardio U",
    group: "Conditioning",
    focus: "Extended efforts with varied intensity so the member learns pacing and recovery capacity.",
    scienceNote: "Bias toward variable-pace endurance and recovery between repeated high outputs.",
  },
  {
    id: "cardio-hiit",
    name: "Cardio HIIT",
    group: "Conditioning",
    focus: "Short-burst intermittent conditioning performed at high intensity.",
    scienceNote: "Bias toward anaerobic power, short intervals, and clear recovery structure.",
  },
  {
    id: "crewfit",
    name: "CrewFit",
    group: "Conditioning",
    focus: "High-energy conditioning built around efficiency, work rate, and team-style momentum.",
    scienceNote: "Bias toward mixed-energy-system conditioning and repeatable work capacity.",
  },
  {
    id: "xtx",
    name: "XTX",
    group: "Resistance + conditioning",
    focus: "Metabolic complexes combining resistance training and longer aerobic strain.",
    scienceNote: "Bias toward whole-body sequencing with sustained metabolic demand.",
  },
  {
    id: "strength-endurance",
    name: "Strength Endurance",
    group: "Resistance + conditioning",
    focus: "Strength expression maintained across conditioning pressure and repeat efforts.",
    scienceNote: "Bias toward maintaining force output under rising fatigue.",
  },
  {
    id: "shred",
    name: "Shred",
    group: "Resistance + conditioning",
    focus: "Aerobic calorie-burning blend of resistance and conditioning with minimal idle time.",
    scienceNote: "Bias toward continuous work, moderate-to-high heart rate, and high total session density.",
  },
  {
    id: "balanced",
    name: "Balanced",
    group: "Resistance + conditioning",
    focus: "Full-body training emphasizing control, proprioception, range of motion, and joint stability.",
    scienceNote: "Bias toward movement quality, stability, and broad physical coverage.",
  },
];

export const rotationCalendar: ProgramId[][] = [
  ["strength", "hyper", "cardio-hiit", "balanced", "cardio-summit", "crewfit"],
  ["pump", "power", "cardio-u", "strength-endurance", "shred", "crewfit"],
  ["strength", "hirt", "cardio-hiit", "xtx", "balanced", "cardio-summit"],
  ["hyper", "pump", "cardio-u", "strength-endurance", "shred", "hyrox"],
];

export const weekdayLabels = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function getProgramDefinition(programId: string) {
  return programCatalog.find((program) => program.id === programId) ?? programCatalog[0];
}

export function getRotationWeekIndex(date = new Date()) {
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const current = new Date(`${localDate}T00:00:00+08:00`);
  const anchor = new Date("2026-04-06T00:00:00+08:00");
  const diffDays = Math.floor((current.getTime() - anchor.getTime()) / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  return ((diffWeeks % rotationCalendar.length) + rotationCalendar.length) % rotationCalendar.length;
}

export function getProgramForWeekday(weekdayIndex: number, date = new Date()) {
  const week = rotationCalendar[getRotationWeekIndex(date)];
  return getProgramDefinition(week[Math.max(0, Math.min(weekdayIndex, 5))]);
}

export function getRotationSchedule(date = new Date()) {
  const weekIndex = getRotationWeekIndex(date);
  const week = rotationCalendar[weekIndex];

  return week.map((programId, index) => {
    const program = getProgramDefinition(programId);

    return {
      weekIndex,
      day: weekdayLabels[index],
      programId: program.id,
      category: program.name,
      group: program.group,
      focus: program.focus,
      scienceNote: program.scienceNote,
    };
  });
}
