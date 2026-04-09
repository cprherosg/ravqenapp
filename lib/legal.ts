export const RAVQEN_WAIVER_VERSION = "v1";
export const RAVQEN_TERMS_VERSION = "v1";

export const RAVQEN_WAIVER_SECTIONS = [
  {
    title: "Assumption of risk",
    body: "Ravqen provides guided solo workouts that may involve resistance training, conditioning, mobility work, and use of gym equipment. By accepting this waiver, the member acknowledges that exercise carries inherent risks including strain, falls, equipment misuse, overexertion, illness, and, in rare cases, serious injury or death.",
  },
  {
    title: "Medical responsibility",
    body: "The member confirms that they are responsible for deciding whether they are fit to participate. They should stop immediately and seek medical advice if they feel pain, dizziness, shortness of breath, or any unusual symptoms. Ravqen does not provide medical diagnosis, treatment, or emergency supervision.",
  },
  {
    title: "Equipment and facility use",
    body: "The member is responsible for using gym equipment safely, setting loads appropriately, checking space and machine setup, and following the rules of the facility where they train. They must choose conservative loads when unsure and progress only when technique remains sound.",
  },
  {
    title: "Release",
    body: "To the fullest extent permitted by law, the member releases Ravqen and its operators from claims arising from ordinary risks associated with participating in the workouts, except where liability cannot legally be excluded. This waiver is intended for first-use acceptance and remains effective until replaced by a new version.",
  },
] as const;

export const RAVQEN_TERMS_SECTIONS = [
  {
    title: "Member access",
    body: "Ravqen provides guided training access based on the member account, assigned membership tier, and gym-specific settings configured by the operator. Access may be limited by active status, category permissions, session credits, or weekly caps.",
  },
  {
    title: "Workout delivery",
    body: "Workout structures, exercise prescriptions, videos, and coaching notes are provided for training guidance only. Ravqen may update programming, exercise media, or product features over time to improve the member experience.",
  },
  {
    title: "Account use",
    body: "Each member account is personal and should not be shared. Members are responsible for keeping login credentials private and for ensuring the name and email on the account remain accurate.",
  },
  {
    title: "Availability and changes",
    body: "Ravqen may modify, pause, or discontinue features, programs, or membership rules from time to time. Before public launch, these baseline terms should be reviewed and finalized with the real billing, refund, and support policies used by the operating business.",
  },
] as const;
