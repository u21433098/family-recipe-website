// ==============================================================
//  The only file you need to edit.
// ==============================================================
export const CONFIG = {
  // Your site's name — shows in the header and browser tab.
  SITE_NAME: "Claud's Cooks",
  SITE_TAGLINE: "Our family recipe book",

  // From Supabase → Project Settings → API.
  // Leave both empty to run in DEMO mode (saved in this browser only,
  // passcode "demo", owner password "demo").
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
};

export const CATEGORIES = [
  { id: "starters",     label: "Starters",          color: "#4FC3D9", ink: "#1E2257", shape: "dots"     },
  { id: "beef",         label: "Beef",              color: "#EF4458", ink: "#FFFFFF", shape: "triangle" },
  { id: "chicken",      label: "Chicken",           color: "#F4C21B", ink: "#1E2257", shape: "half"     },
  { id: "lamb",         label: "Lamb",              color: "#B9A6F4", ink: "#1E2257", shape: "ring"     },
  { id: "pork",         label: "Pork",              color: "#FF9EB8", ink: "#1E2257", shape: "frame"    },
  { id: "desserts",     label: "Desserts",          color: "#8E1C48", ink: "#FFFFFF", shape: "star"     },
  { id: "salads-sides", label: "Salads & Sides",    color: "#5DB548", ink: "#FFFFFF", shape: "leaf"     },
  { id: "dips-sauces",  label: "Dips & Sauces",     color: "#FF7A1A", ink: "#1E2257", shape: "beads"    },
  { id: "drinks",       label: "Drinks",            color: "#1E2257", ink: "#FFFFFF", shape: "pinwheel" },
];

export const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
