export const C = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  ink: "#242621",
  inkMuted: "#6B6F66",
  sage: "#5C7A5E",
  sageDeep: "#3F5940",
  sageTint: "#E9EFE7",
  sageMid: "#7A9E7C",
  amber: "#B8863B",
  amberTint: "#FDF3E3",
  rust: "#A6503A",
  rustTint: "#FCEEE9",
  line: "#E4E2DA",
  lineStrong: "#D0CEC6",
  blue: "#4A6FA5",
  blueTint: "#EAF0FD",
};

export const shadow = {
  sm: "0 1px 4px rgba(36,38,33,0.06)",
  card: "0 2px 16px rgba(36,38,33,0.07), 0 1px 3px rgba(36,38,33,0.04)",
  cardHover: "0 8px 32px rgba(36,38,33,0.11), 0 2px 8px rgba(36,38,33,0.06)",
  btn: "0 4px 14px rgba(92,122,94,0.35)",
  lg: "0 16px 48px rgba(36,38,33,0.12)",
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export type Screen =
  | "landing"
  | "dashboard"
  | "crop-condition"
  | "recommendation"
  | "grade-capture"
  | "grading-result"
  | "grading-history"
  | "irrigation"
  | "harvest-window"
  | "disease"
  | "revenue-summary"
  | "schemes"
  | "scheme-detail"
  | "season-review"
  | "season-detail"
  | "alerts"
  | "messages"
  | "chatbot"
  | "voice"
  | "settings"
  | "help"
  | "offline";
