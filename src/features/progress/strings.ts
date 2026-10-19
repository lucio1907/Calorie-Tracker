/** User-facing copy for the progress feature. Translate here. */
export const progressStrings = {
  title: "Progress",
  description: "Weight trend and daily calorie balance.",
  logWeight: "Log weight",

  range: {
    label: "Time range",
    option: (days: number) => `${days} days`,
  },

  weight: {
    heading: "Weight trend",
    empty: "No weight logged in this range yet.",
    latest: "Latest",
    change: "Change",
    lowest: "Lowest",
    highest: "Highest",
    noChange: "—",
    kg: (kg: string) => `${kg} kg`,
    signedKg: (kg: string) => `${kg} kg`,
    chartLabel: (count: number, days: number, from: string, to: string) =>
      `Weight chart: ${count} ${count === 1 ? "entry" : "entries"} in the last ${days} days, from ${from} to ${to}.`,
    legendWeight: "Weight",
    legendAverage: "7-day average",
    tooltip: (date: string, kg: string, average: string) => `${date}: ${kg} kg (7-day average ${average} kg)`,
  },

  entries: {
    heading: "Weight log",
    list: "Weight entries",
    empty: "Entries you log appear here.",
    changeFromPrevious: (kg: string) => `${kg} kg vs previous`,
  },

  calories: {
    heading: "Daily calorie balance",
    description: "Food minus exercise, compared with your daily target.",
    noTarget: "Complete your profile in Settings to compare each day with a target.",
    noTargetAction: "Go to settings",
    empty: "No food logged in this range yet.",
    averageBalance: "Average balance",
    averageNet: "Average net intake",
    averageTarget: "Average target",
    daysUnder: "Days under target",
    daysOver: "Days over target",
    loggedDays: (logged: number, days: number) => `${logged} of ${days} days logged`,
    under: "Under target",
    over: "Over target",
    onTarget: "On target",
    notLogged: "Not logged",
    chartLabel: (under: number, over: number) =>
      `Daily balance chart: ${under} ${under === 1 ? "day" : "days"} under target, ${over} over target.`,
    dayList: "Daily balance by day",
    dayDetail: (food: string, exercise: string, target: string) =>
      `Food ${food} · Exercise ${exercise} · Target ${target}`,
    dayDetailNoTarget: (food: string, exercise: string) => `Food ${food} · Exercise ${exercise}`,
    balance: (kcal: string) => `${kcal} kcal`,
    tooltip: (date: string, balance: string) => `${date}: ${balance} kcal`,
    kcal: "kcal",
  },

  form: {
    addTitle: "Log weight",
    editTitle: "Edit weight",
    close: "Close",
    date: "Date",
    kg: "Weight (kg)",
    kgHint: "Logging a date that already has a weight replaces it.",
    save: "Save weight",
    update: "Save changes",
    saving: "Saving…",
    delete: "Delete entry",
    confirmDelete: (date: string) => `Delete the weight for ${date}?`,
    confirmDeleteAction: "Delete",
    deleting: "Deleting…",
    cancel: "Cancel",
  },

  validation: {
    required: "Required.",
    number: "Enter a number.",
    weightRange: (min: number, max: number) => `Enter a weight between ${min} and ${max} kg.`,
    date: "Pick a date.",
    futureDate: "The date can't be in the future.",
    dateTaken: "That date already has a weight. Edit that entry instead.",
    fix: "Check the highlighted fields.",
  },

  errors: {
    unauthorized: "Your session expired. Sign in again.",
    saveFailed: "Could not save the weight. Try again.",
    deleteFailed: "Could not delete the weight.",
    entryMissing: "This entry no longer exists.",
    unexpected: "Something went wrong. Try again.",
  },
} as const;
