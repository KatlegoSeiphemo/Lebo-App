import type { ThemeColors } from "@/src/theme";

export type SafetyStatus = "safe" | "pending" | "overdue" | "emergency" | "none";

export function statusConfig(status: string, colors: ThemeColors) {
  switch (status) {
    case "safe":
      return { label: "You are safe", short: "Safe", icon: "ShieldCheck", color: colors.success, on: colors.onSuccess };
    case "pending":
      return { label: "Check-in pending", short: "Pending", icon: "Clock", color: colors.warning, on: colors.onWarning };
    case "overdue":
      return { label: "Safety confirmation overdue", short: "Overdue", icon: "WarningCircle", color: "#E4661A", on: "#FFFFFF" };
    case "emergency":
      return { label: "Emergency active", short: "Emergency", icon: "Siren", color: colors.error, on: colors.onError };
    default:
      return { label: "No safety mode active", short: "Inactive", icon: "Moon", color: colors.muted, on: colors.onSurfaceInverse };
  }
}

export const INCIDENT_CATEGORIES = [
  "Harassment",
  "Threat",
  "Stalking",
  "Domestic violence",
  "Workplace incident",
  "Online harassment",
  "Suspicious activity",
  "Other",
];

export const TIMER_INTERVALS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "4 hours", minutes: 240 },
  { label: "8 hours", minutes: 480 },
];

export const DIGITAL_SAFETY = [
  { title: "Location sharing", icon: "MapPin", body: "Only share your live location with people you trust, and for a limited time. Review who can see you regularly and revoke access when you no longer need it." },
  { title: "Password security", icon: "Lock", body: "Use long, unique passwords for every account. A password manager helps you avoid reusing passwords that could expose all your accounts if one leaks." },
  { title: "Two-factor authentication", icon: "ShieldCheck", body: "Turn on 2FA (an app-based code) for email, banking and social accounts. It stops someone logging in even if they know your password." },
  { title: "Stalking through technology", icon: "Eye", body: "Watch for unexpected tracking apps, shared logins or hidden AirTags. Check app permissions and remove anything you did not install yourself." },
  { title: "Social media privacy", icon: "UsersThree", body: "Set profiles to private, limit who can tag you, and avoid posting your real-time location or home area. Old posts can reveal patterns." },
  { title: "Sharing intimate images", icon: "ImageSquare", body: "Once sent, images can be copied. Never feel pressured. If images are shared without consent, report to the platform and seek legal support." },
  { title: "Phishing", icon: "Fish", body: "Be cautious of urgent messages asking you to click links or share codes. Verify directly with the organisation using an official number." },
  { title: "SIM & account takeover", icon: "SimCard", body: "A SIM-swap can hijack your number and 2FA. Set a SIM PIN with your provider and act fast if your phone loses signal unexpectedly." },
];

export const SAFETY_PLAN_SECTIONS = [
  { key: "trustedContacts", label: "Trusted contacts", placeholder: "Who can you call any time, day or night?" },
  { key: "safeLocations", label: "Safe locations", placeholder: "Places you can go to feel safe" },
  { key: "placesToAvoid", label: "Places to avoid", placeholder: "Areas or situations to stay away from" },
  { key: "transport", label: "Transport options", placeholder: "How you can get to safety" },
  { key: "documents", label: "Important documents", placeholder: "ID, keys, cards to grab quickly" },
  { key: "codeWord", label: "Code word", placeholder: "A discreet word that means 'I need help'" },
  { key: "exitPlan", label: "Exit plan", placeholder: "Steps to leave safely if needed" },
  { key: "instructions", label: "Important instructions", placeholder: "Anything a helper should know" },
];
