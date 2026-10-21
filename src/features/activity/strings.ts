/** User-facing copy for the activity feature. Translate here. */
export const activityStrings = {
  title: "Activity",
  description: "Exercise adds calories back to your budget.",
  logActivity: "Log activity",

  day: {
    totalHeading: "Exercise total",
    entries: "Logged activities",
    empty: "No activity logged for this day yet.",
  },

  weight: {
    using: (kg: string, when: string) => `Calories use your weight of ${kg} kg (${when}).`,
    missing: "Log your weight to calculate the calories your activities burn.",
    missingAction: "Log weight in Settings",
  },

  units: {
    kcal: "kcal",
    minutes: (minutes: string) => `${minutes} min`,
    met: (met: string) => `MET ${met}`,
  },

  add: {
    title: "Log activity",
    close: "Close",
    search: "Search activities",
    searchPlaceholder: "Running, yoga, swimming…",
    catalog: "Activities",
    noResults: (query: string) => `No activity matches “${query}”.`,
    back: "Back to activities",
  },

  form: {
    minutes: "Duration (minutes)",
    minutesHint: (max: number) => `Whole minutes, up to ${max}.`,
    previewHeading: "Calories burned",
    previewEmpty: "Enter a duration to see kcal.",
    previewBasis: (met: string, kg: string) => `MET ${met} × ${kg} kg`,
    save: "Add activity",
    update: "Save changes",
    saving: "Saving…",
    activityDeleted: "The activity behind this entry was deleted, so its duration can't change. You can still delete it.",
    noWeight: "Log your weight in Settings to change this entry's duration. You can still delete it.",
  },

  edit: {
    title: "Edit activity",
    delete: "Delete activity",
    confirmDelete: (label: string) => `Delete “${label}” from this day?`,
    confirmDeleteAction: "Delete",
    deleting: "Deleting…",
    cancel: "Cancel",
  },

  validation: {
    required: "Required.",
    wholeMinutes: "Enter whole minutes.",
    minutesRange: (max: number) => `Enter between 1 and ${max} minutes.`,
    kcalTooLarge: "That is more than one entry can hold. Split it into shorter entries.",
    fix: "Check the highlighted fields.",
  },

  errors: {
    unauthorized: "Your session expired. Sign in again.",
    noWeight: "Log your weight in Settings before adding activities.",
    saveFailed: "Could not save the activity. Try again.",
    dayFull: "This day already has the maximum number of activities.",
    deleteFailed: "Could not delete the activity.",
    entryMissing: "This entry no longer exists.",
    activityMissing: "This activity no longer exists.",
    unexpected: "Something went wrong. Try again.",
  },
} as const;
