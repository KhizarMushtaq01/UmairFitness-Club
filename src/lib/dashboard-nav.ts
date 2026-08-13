export const NAV_BY_ROLE = {
  MEMBER: [
    ["overview", "Overview"],
    ["workouts", "Workout plan"],
    ["nutrition", "Nutrition"],
    ["bookings", "Bookings"],
    ["payments", "Payments"],
    ["profile", "Profile"],
  ],
  TRAINER: [
    ["overview", "Overview"],
    ["clients", "Clients"],
    ["schedule", "Schedule"],
    ["programs", "Programs"],
  ],
  ADMIN: [
    ["analytics", "Analytics"],
    ["members", "Members"],
    ["trainers", "Trainers"],
    ["plans", "Plans"],
    ["shop", "Shop"],
    ["orders", "Orders"],
    ["content", "Content"],
    ["gallery", "Gallery"],
    ["settings", "Settings"],
    ["roles", "Roles"],
  ],
} as const;

export const ROLE_BASE_PATH = { MEMBER: "member", TRAINER: "trainer", ADMIN: "admin" } as const;
export type Role = keyof typeof ROLE_BASE_PATH;

/** Landing tab for each role — admins start on analytics, everyone else on overview. */
export const ROLE_HOME_TAB: Record<Role, string> = {
  MEMBER: "overview",
  TRAINER: "overview",
  ADMIN: "analytics",
};

export function roleHomePath(role: Role) {
  return `/dashboard/${ROLE_BASE_PATH[role]}/${ROLE_HOME_TAB[role]}`;
}
