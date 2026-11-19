// Data layer: talks to Supabase, or to localStorage in demo mode.
import { CONFIG } from "./config.js";

const DEMO = !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;
const PASS_KEY = "rb.passcode";

let sb = null;
async function client() {
  if (sb) return sb;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return sb;
}

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// ---------------- demo seed ----------------
const SEED = [
  {
    id: "demo-1", name: "Peppadew & Feta Bites", added_by: "Me", category: "starters", servings: "12 bites",
    ingredients: "1 jar whole peppadews, drained\n150 g feta, crumbled\n2 tbsp cream cheese\nFresh basil to garnish",
    steps: "Mash the feta and cream cheese together.\nSpoon or pipe the filling into each peppadew.\nChill for 20 minutes and top with basil.",
    notes: "Use the mild peppadews if kids are eating.", story: "Found on Pinterest before a Christmas lunch — gone in minutes.",
    source_url: "", photos: [], created_at: "2026-11-01T10:00:00Z",
  },
  {
    id: "demo-2", name: "Sticky Braai Chicken Wings", added_by: "Me", category: "chicken", servings: "4",
    ingredients: "1 kg chicken wings\n3 tbsp apricot jam\n2 tbsp soy sauce\n1 tbsp Worcestershire sauce\n2 garlic cloves, crushed\nSalt and pepper",
    steps: "Mix jam, soy, Worcestershire and garlic.\nToss the wings in half the sauce and marinate for 1 hour.\nBraai over medium coals for 20–25 minutes, turning often.\nBrush with the rest of the sauce for the last 5 minutes.",
    notes: "Also works in the oven at 200 °C for 40 minutes.", story: "", source_url: "https://www.pinterest.com/",
    photos: [], created_at: "2026-11-05T10:00:00Z",
  },
  {
    id: "demo-3", name: "Malva Pudding", added_by: "Me", category: "desserts", servings: "6–8",
    ingredients: "250 ml sugar\n2 eggs\n15 ml apricot jam\n250 ml cake flour\n5 ml bicarbonate of soda\n15 ml butter\n5 ml vinegar\n125 ml milk\nSauce: 250 ml cream, 125 g butter, 125 ml sugar, 125 ml hot water",
    steps: "Preheat the oven to 180 °C.\nBeat the sugar and eggs until pale, then beat in the jam.\nSift flour and bicarb. Melt butter, add vinegar and milk.\nFold wet and dry into the egg mixture alternately.\nBake in a greased dish for 45 minutes.\nMelt the sauce ingredients together and pour over the hot pudding.",
    notes: "Serve with custard or vanilla ice cream.", story: "The Sunday lunch classic.",
    source_url: "", photos: [], created_at: "2026-11-10T10:00:00Z",
  },
  {
    id: "demo-4", name: "Chakalaka", added_by: "Me", category: "salads-sides", servings: "6",
    ingredients: "2 tbsp oil\n1 onion, chopped\n1 green pepper, diced\n2 carrots, grated\n1 tbsp curry powder\n1 tin baked beans\n1 tin chopped tomatoes",
    steps: "Fry the onion and pepper until soft.\nAdd curry powder and cook for a minute.\nAdd carrots, tomatoes and beans and simmer for 15 minutes.",
    notes: "Better the next day.", story: "", source_url: "", photos: [], created_at: "2026-11-12T10:00:00Z",
  },
];

function demoRecipes() {
  let r = store.get("rb.demo.recipes", null);
  if (!r) { r = SEED; store.set("rb.demo.recipes", r); }
  return r;
}

// ---------------- public API ----------------
export const api = {
  demo: DEMO,

  savedPasscode() { return store.get(PASS_KEY, null); },
  forgetPasscode() { store.del(PASS_KEY); },

  async checkPasscode(code) {
    let ok;
    if (DEMO) ok = code === "demo";
    else {
      const { data, error } = await (await client()).rpc("check_passcode", { p_passcode: code });
      if (error) throw error;
      ok = !!data;
    }
    if (ok) store.set(PASS_KEY, code);
    return ok;
  },

  // ---- owner ----
  async session() {
    if (DEMO) return store.get("rb.demo.owner", false) ? { email: "demo owner" } : null;
    const { data } = await (await client()).auth.getSession();
    return data.session ? { email: data.session.user.email } : null;
  },
  async signIn(email, password) {
    if (DEMO) {
      if (password !== "demo") throw new Error("In demo mode the password is “demo”.");
      store.set("rb.demo.owner", true); return;
    }
    const { error } = await (await client()).auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  async signOut() {
    if (DEMO) { store.del("rb.demo.owner"); return; }
    await (await client()).auth.signOut();
  },

  // ---- recipes ----
  async listRecipes() {
    if (DEMO) return [...demoRecipes()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const { data, error } = await (await client()).rpc("get_recipes", { p_passcode: this.savedPasscode() || "" });
    if (error) throw error;
    return data;
  },
  async saveRecipe(r) {
    const fields = ["name", "added_by", "category", "servings", "ingredients", "steps", "notes", "story", "source_url", "photos"];
    const row = Object.fromEntries(fields.filter((f) => f in r).map((f) => [f, r[f]]));
    if (DEMO) {
      const all = demoRecipes();
      if (r.id) Object.assign(all.find((x) => x.id === r.id), row);
      else { row.id = "demo-" + Date.now(); row.created_at = new Date().toISOString(); row.photos ??= []; all.push(row); r = row; }
      store.set("rb.demo.recipes", all);
      return r.id;
    }
    const c = await client();
    if (r.id) {
      const { error } = await c.from("recipes").update(row).eq("id", r.id);
      if (error) throw error;
      return r.id;
    }
    const { data, error } = await c.from("recipes").insert(row).select("id").single();
    if (error) throw error;
    return data.id;
  },
  async deleteRecipe(id) {
    if (DEMO) { store.set("rb.demo.recipes", demoRecipes().filter((x) => x.id !== id)); return; }
    const { error } = await (await client()).from("recipes").delete().eq("id", id);
    if (error) throw error;
  },

  // ---- comments ----
  async listComments(recipeId) {
    if (DEMO) return store.get("rb.demo.comments", []).filter((c) => c.recipe_id === recipeId);
    const { data, error } = await (await client()).rpc("get_comments", { p_passcode: this.savedPasscode() || "", p_recipe_id: recipeId });
    if (error) throw error;
    return data;
  },
  async addComment(recipeId, author, body) {
    if (DEMO) {
      const all = store.get("rb.demo.comments", []);
      all.push({ id: "c" + Date.now(), recipe_id: recipeId, author, body, created_at: new Date().toISOString() });
      store.set("rb.demo.comments", all); return;
    }
    const { error } = await (await client()).rpc("add_comment", {
      p_passcode: this.savedPasscode() || "", p_recipe_id: recipeId, p_author: author, p_body: body,
    });
    if (error) throw error;
  },
  async deleteComment(id) {
    if (DEMO) { store.set("rb.demo.comments", store.get("rb.demo.comments", []).filter((c) => c.id !== id)); return; }
    const { error } = await (await client()).from("comments").delete().eq("id", id);
    if (error) throw error;
  },

  // ---- favourites (per device) ----
  favourites() { return new Set(store.get("rb.favs", [])); },
  toggleFavourite(id) {
    const f = this.favourites();
    f.has(id) ? f.delete(id) : f.add(id);
    store.set("rb.favs", [...f]);
    return f.has(id);
  },
};
