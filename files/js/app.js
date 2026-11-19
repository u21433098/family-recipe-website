import { CONFIG, CATEGORIES, catById } from "./config.js";
import { api } from "./data.js";
import { shape } from "./shapes.js";

const $app = document.getElementById("app");
const state = { recipes: [], owner: null, query: "", filter: "all", loaded: false };

// ---------- helpers ----------
const str = (s) => (s == null ? "" : String(s));
const esc = (s) => str(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lines = (s) => str(s).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const norm = (s) => str(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const safeUrl = (u) => (/^https?:\/\//i.test(str(u).trim()) ? str(u).trim() : "");
const fmtDate = (d) => new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
const go = (hash) => { location.hash = hash; };

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function mosaic(n = 9, size = "") {
  return `<div class="mosaic ${size}">${CATEGORIES.slice(0, n).map((c, i) => {
    const bg = CATEGORIES[(i + 4) % CATEGORIES.length];
    return `<div class="tile" style="background:${bg.color}">${shape(c.shape, c.color)}</div>`;
  }).join("")}</div>`;
}

function topbar() {
  return `<header class="topbar">
    <a href="#/" class="brand"><span class="brand-mark">${shape("dots", "#EF4458", "#F4C21B")}</span>${esc(CONFIG.SITE_NAME)}</a>
    <nav>
      ${state.owner ? `<a class="btn btn-add" href="#/add">+ Add recipe</a>
        <button class="btn btn-ghost" data-act="signout">Sign out</button>` : ""}
    </nav>
  </header>`;
}

// ---------- search ----------
function matches(r, q) {
  if (!q) return true;
  const hay = norm([r.name, r.added_by, catById(r.category).label, r.ingredients, r.steps, r.notes, r.story, r.servings].join(" \n "));
  return norm(q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
function filtered() {
  const favs = api.favourites();
  return state.recipes.filter((r) =>
    (state.filter === "all" || (state.filter === "favs" ? favs.has(r.id) : r.category === state.filter)) && matches(r, state.query));
}

// ---------- views ----------
function viewGate(error = "") {
  document.title = CONFIG.SITE_NAME;
  $app.innerHTML = `<main class="gate">
    ${mosaic(9, "mosaic-gate")}
    <form class="gate-card" id="gate-form">
      <p class="eyebrow">Welcome to</p>
      <h1>${esc(CONFIG.SITE_NAME)}</h1>
      <p>${esc(CONFIG.SITE_TAGLINE)}. Enter the family passcode to come in.</p>
      <input type="password" name="code" placeholder="Passcode" autocomplete="current-password" required autofocus>
      ${error ? `<p class="err">${esc(error)}</p>` : ""}
      <button class="btn btn-primary btn-block">Let me in</button>
      ${api.demo ? `<p class="hint">Demo mode — the passcode is <b>demo</b></p>` : ""}
      <a class="small-link" href="#/admin">Owner sign in</a>
    </form>
  </main>`;
  document.getElementById("gate-form").onsubmit = async (e) => {
    e.preventDefault();
    const code = new FormData(e.target).get("code");
    try {
      if (await api.checkPasscode(code)) { await loadRecipes(); render(); }
      else viewGate("That passcode isn't right — try again.");
    } catch (err) { viewGate("Couldn't connect. Check your internet and try again."); }
  };
}

function viewHome() {
  document.title = CONFIG.SITE_NAME;
  const chip = (id, label, color) =>
    `<button class="chip ${state.filter === id ? "on" : ""}" data-filter="${id}" style="--c:${color}">${label}</button>`;
  $app.innerHTML = `${topbar()}
  <main>
    <section class="hero">
      <div class="hero-text">
        <p class="eyebrow">${esc(CONFIG.SITE_TAGLINE)}</p>
        <h1>${esc(CONFIG.SITE_NAME)}</h1>
        <label class="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5 L21 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
          <input id="q" type="search" placeholder="Search recipes, ingredients, notes…" value="${esc(state.query)}" aria-label="Search recipes">
        </label>
      </div>
      ${mosaic(9, "mosaic-hero")}
    </section>
    <div class="chips" role="toolbar" aria-label="Filter by category">
      ${chip("all", "All", "#1E2257")}
      ${chip("favs", "♥ Favourites", "#EF4458")}
      ${CATEGORIES.map((c) => chip(c.id, esc(c.label), c.color)).join("")}
    </div>
    <p class="count" id="count"></p>
    <section class="grid" id="grid"></section>
  </main>
  ${footer()}`;
  renderGrid();
  const q = document.getElementById("q");
  q.oninput = () => { state.query = q.value; renderGrid(); };
}

function renderGrid() {
  const list = filtered(), favs = api.favourites();
  const total = state.recipes.length;
  document.getElementById("count").textContent =
    total ? `${list.length} of ${total} recipe${total === 1 ? "" : "s"}` : "";
  const grid = document.getElementById("grid");
  if (!total) {
    grid.innerHTML = `<div class="empty">${shape("ring", "#EF4458")}<h2>No recipes yet</h2>
      <p>${state.owner ? `Add your first one — <a href="#/add">start here</a>.` : "Check back soon!"}</p></div>`;
    return;
  }
  if (!list.length) {
    grid.innerHTML = `<div class="empty">${shape("half", "#4FC3D9")}<h2>Nothing found</h2><p>Try another word or category.</p></div>`;
    return;
  }
  grid.innerHTML = list.map((r) => {
    const c = catById(r.category);
    const photo = r.photos?.[0];
    return `<a class="card" href="#/recipe/${encodeURIComponent(r.id)}" style="--c:${c.color};--ink:${c.ink}">
      <div class="card-art">${photo ? `<img src="${esc(photo)}" alt="" loading="lazy">` : shape(c.shape, c.ink === "#FFFFFF" ? "rgba(255,255,255,.9)" : "#1E2257")}
        ${favs.has(r.id) ? `<span class="fav-dot" title="Favourite">♥</span>` : ""}</div>
      <div class="card-body">
        <span class="tag">${esc(c.label)}</span>
        <h3>${esc(r.name)}</h3>
        <p class="meta">${[r.servings && `Serves ${esc(r.servings)}`, r.added_by && `by ${esc(r.added_by)}`].filter(Boolean).join(" · ")}</p>
      </div>
    </a>`;
  }).join("");
}

let wakeLock = null;
async function viewRecipe(id) {
  const r = state.recipes.find((x) => x.id === id);
  if (!r) { $app.innerHTML = `${topbar()}<main class="empty"><h2>Recipe not found</h2><a href="#/">Back to all recipes</a></main>`; return; }
  const c = catById(r.category);
  const fav = api.favourites().has(r.id);
  const src = safeUrl(r.source_url);
  document.title = `${r.name} · ${CONFIG.SITE_NAME}`;
  $app.innerHTML = `${topbar()}
  <main class="recipe" style="--c:${c.color};--ink:${c.ink}">
    <section class="r-hero">
      <div class="r-hero-art">${shape(c.shape, c.ink === "#FFFFFF" ? "rgba(255,255,255,.18)" : "rgba(30,34,87,.14)")}</div>
      <a class="back" href="#/">← All recipes</a>
      <span class="tag tag-light">${esc(c.label)}</span>
      <h1>${esc(r.name)}</h1>
      <p class="r-meta">${[r.servings && `Serves ${esc(r.servings)}`, r.added_by && `Added by ${esc(r.added_by)}`].filter(Boolean).join("  ·  ")}</p>
    </section>

    <div class="actions no-print">
      <button class="act ${fav ? "on" : ""}" data-act="fav">${fav ? "♥ Favourite" : "♡ Favourite"}</button>
      <button class="act" data-act="wake" ${"wakeLock" in navigator ? "" : "hidden"}>☀ Keep screen on</button>
      <button class="act" data-act="print">⎙ Print</button>
      ${state.owner ? `<a class="act" href="#/edit/${encodeURIComponent(r.id)}">✎ Edit</a>
        <button class="act act-danger" data-act="delete">✕ Delete</button>` : ""}
    </div>

    ${r.photos?.length ? `<section class="photos">${r.photos.map((p) => `<img src="${esc(p)}" alt="${esc(r.name)}" loading="lazy">`).join("")}</section>` : ""}

    <div class="r-cols">
      <section class="panel ingredients">
        <h2>Ingredients</h2>
        <p class="tip no-print">Tap to tick off as you go</p>
        <ul>${lines(r.ingredients).map((l, i) => `<li><label><input type="checkbox" data-ing="${i}"><span>${esc(l)}</span></label></li>`).join("")}</ul>
      </section>
      <section class="panel steps">
        <h2>Method</h2>
        <ol>${lines(r.steps).map((l, i) => `<li data-step="${i}"><span class="n">${i + 1}</span><p>${esc(l)}</p></li>`).join("")}</ol>
      </section>
    </div>

    ${r.notes ? `<section class="panel note"><h2>Notes</h2><p>${esc(r.notes).replace(/\n/g, "<br>")}</p></section>` : ""}
    ${r.story || src ? `<section class="panel story"><h2>The story</h2>
      ${r.story ? `<p>${esc(r.story).replace(/\n/g, "<br>")}</p>` : ""}
      ${src ? `<p><a href="${esc(src)}" target="_blank" rel="noopener noreferrer">View original source ↗</a></p>` : ""}</section>` : ""}

    <section class="panel comments no-print">
      <h2>Comments</h2>
      <div id="comment-list"><p class="tip">Loading…</p></div>
      <form id="comment-form" class="comment-form">
        <input name="author" placeholder="Your name" maxlength="60" required value="${esc(localStorage.getItem("rb.name") || "")}">
        <textarea name="body" placeholder="Made it? Changed something? Share a tip…" maxlength="1000" rows="3" required></textarea>
        <button class="btn btn-primary">Post comment</button>
      </form>
    </section>
  </main>
  ${footer()}`;
  window.scrollTo(0, 0);

  // ticking state, per recipe, kept for this session
  const tickKey = `rb.ticks.${r.id}`;
  const ticks = JSON.parse(sessionStorage.getItem(tickKey) || '{"i":[],"s":[]}');
  const saveTicks = () => sessionStorage.setItem(tickKey, JSON.stringify(ticks));
  document.querySelectorAll("[data-ing]").forEach((cb) => {
    cb.checked = ticks.i.includes(+cb.dataset.ing);
    cb.onchange = () => { ticks.i = cb.checked ? [...ticks.i, +cb.dataset.ing] : ticks.i.filter((x) => x !== +cb.dataset.ing); saveTicks(); };
  });
  document.querySelectorAll("[data-step]").forEach((li) => {
    li.classList.toggle("done", ticks.s.includes(+li.dataset.step));
    li.onclick = () => {
      const n = +li.dataset.step;
      li.classList.toggle("done");
      ticks.s = li.classList.contains("done") ? [...ticks.s, n] : ticks.s.filter((x) => x !== n);
      saveTicks();
    };
  });

  document.querySelector('[data-act="fav"]').onclick = (e) => {
    const on = api.toggleFavourite(r.id);
    e.target.classList.toggle("on", on);
    e.target.textContent = on ? "♥ Favourite" : "♡ Favourite";
  };
  document.querySelector('[data-act="print"]').onclick = () => window.print();
  const wakeBtn = document.querySelector('[data-act="wake"]');
  const setWake = (on) => { wakeBtn.classList.toggle("on", on); wakeBtn.textContent = on ? "☀ Screen stays on" : "☀ Keep screen on"; };
  setWake(!!wakeLock);
  wakeBtn.onclick = async () => {
    if (wakeBtn.classList.contains("on")) { const w = wakeLock; wakeLock = null; await w?.release(); setWake(false); return; }
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      // released by the browser when you switch apps — keep the button "on" so we re-acquire on return
      wakeLock.addEventListener("release", () => { wakeLock = null; });
      setWake(true);
    } catch { toast("Your browser wouldn't keep the screen on."); }
  };
  const del = document.querySelector('[data-act="delete"]');
  if (del) del.onclick = async () => {
    if (!confirm(`Delete “${r.name}”? This can't be undone.`)) return;
    try { await api.deleteRecipe(r.id); await loadRecipes(); toast("Recipe deleted"); go("#/"); }
    catch (err) { toast("Couldn't delete: " + err.message); }
  };

  loadComments(r.id);
  document.getElementById("comment-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const author = fd.get("author").trim(), body = fd.get("body").trim();
    if (!author || !body) return;
    localStorage.setItem("rb.name", author);
    try { await api.addComment(r.id, author, body); e.target.body.value = ""; loadComments(r.id); }
    catch (err) { toast("Couldn't post comment: " + err.message); }
  };
}

async function loadComments(id) {
  const box = document.getElementById("comment-list");
  try {
    const list = await api.listComments(id);
    box.innerHTML = list.length ? list.map((c) => `<div class="comment">
        <p class="c-head"><b>${esc(c.author)}</b> <span>${fmtDate(c.created_at)}</span>
        ${state.owner ? `<button class="link-btn" data-del-comment="${esc(c.id)}">delete</button>` : ""}</p>
        <p>${esc(c.body).replace(/\n/g, "<br>")}</p></div>`).join("")
      : `<p class="tip">No comments yet — be the first.</p>`;
    box.querySelectorAll("[data-del-comment]").forEach((b) => b.onclick = async () => {
      if (!confirm("Delete this comment?")) return;
      await api.deleteComment(b.dataset.delComment); loadComments(id);
    });
  } catch { box.innerHTML = `<p class="tip">Couldn't load comments.</p>`; }
}

function viewForm(id) {
  if (!state.owner) { go("#/admin"); return; }
  const r = id ? state.recipes.find((x) => x.id === id) : null;
  if (id && !r) { go("#/"); return; }
  const v = (k) => esc(r?.[k] ?? "");
  document.title = `${r ? "Edit" : "Add"} recipe · ${CONFIG.SITE_NAME}`;
  $app.innerHTML = `${topbar()}
  <main class="form-page">
    <a class="back back-dark" href="${r ? `#/recipe/${encodeURIComponent(r.id)}` : "#/"}">← Cancel</a>
    <h1>${r ? "Edit recipe" : "Add a recipe"}</h1>
    <form id="recipe-form" class="rform">
      <label class="f-wide">Name of recipe <input name="name" required maxlength="200" value="${v("name")}" placeholder="e.g. Gran's Bobotie"></label>
      <label>Who added it <input name="added_by" value="${r ? v("added_by") : esc(localStorage.getItem("rb.addedBy") || "")}" placeholder="Your name"></label>
      <label>Category
        <select name="category" required>
          ${CATEGORIES.map((c) => `<option value="${c.id}" ${r?.category === c.id ? "selected" : ""}>${esc(c.label)}</option>`).join("")}
        </select></label>
      <label>Servings <input name="servings" value="${v("servings")}" placeholder="e.g. 4 or 6–8"></label>
      <label class="f-wide">Ingredients <small>One per line</small>
        <textarea name="ingredients" required rows="8" placeholder="500 g beef mince&#10;1 onion, chopped&#10;2 tbsp chutney">${v("ingredients")}</textarea></label>
      <label class="f-wide">Steps <small>One step per line — they'll be numbered for you</small>
        <textarea name="steps" required rows="8" placeholder="Preheat the oven to 180 °C.&#10;Fry the onion until soft.">${v("steps")}</textarea></label>
      <label class="f-wide">Notes <small>Tips, swaps, what to serve with</small>
        <textarea name="notes" rows="3">${v("notes")}</textarea></label>
      <label class="f-wide">The story <small>Where it was first discovered, who loves it, etc.</small>
        <textarea name="story" rows="3">${v("story")}</textarea></label>
      <label class="f-wide">Source link <small>Optional — e.g. the Pinterest pin</small>
        <input name="source_url" type="url" value="${v("source_url")}" placeholder="https://"></label>
      <div class="f-wide form-actions">
        <button class="btn btn-primary">${r ? "Save changes" : "Add recipe"}</button>
      </div>
    </form>
  </main>`;
  document.getElementById("recipe-form").onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button"); btn.disabled = true;
    const data = Object.fromEntries([...new FormData(e.target)].map(([k, val]) => [k, String(val).trim() || null]));
    if (data.added_by) localStorage.setItem("rb.addedBy", data.added_by);
    try {
      const newId = await api.saveRecipe({ ...data, id: r?.id });
      await loadRecipes();
      toast(r ? "Saved" : "Recipe added");
      go(`#/recipe/${encodeURIComponent(newId)}`);
    } catch (err) { btn.disabled = false; toast("Couldn't save: " + err.message); }
  };
}

function viewAdmin(error = "") {
  document.title = `Owner sign in · ${CONFIG.SITE_NAME}`;
  $app.innerHTML = `<main class="gate">
    ${mosaic(9, "mosaic-gate")}
    <form class="gate-card" id="admin-form">
      <p class="eyebrow">Owner</p>
      <h1>Sign in</h1>
      <p>Only you can add, edit and delete recipes.</p>
      <input name="email" type="email" placeholder="Email" autocomplete="username" ${api.demo ? "" : "required"}>
      <input name="password" type="password" placeholder="Password" autocomplete="current-password" required>
      ${error ? `<p class="err">${esc(error)}</p>` : ""}
      <button class="btn btn-primary btn-block">Sign in</button>
      ${api.demo ? `<p class="hint">Demo mode — the password is <b>demo</b></p>` : ""}
      <a class="small-link" href="#/">← Back</a>
    </form>
  </main>`;
  document.getElementById("admin-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.signIn(fd.get("email"), fd.get("password"));
      state.owner = await api.session();
      await loadRecipes();
      go("#/");
      render();
    } catch (err) { viewAdmin(err.message || "Sign in failed"); }
  };
}

function footer() {
  return `<footer class="footer no-print">${mosaic(9, "mosaic-foot")}
    <p>${esc(CONFIG.SITE_NAME)} · made with love${state.owner ? "" : ` · <a href="#/admin">Owner</a>`}${api.demo ? " · <b>demo mode</b>" : ""}</p></footer>`;
}

// ---------- boot & routing ----------
async function loadRecipes() { state.recipes = await api.listRecipes(); state.loaded = true; }

async function canView() {
  if (state.owner) return true;
  const code = api.savedPasscode();
  if (!code) return false;
  try { return await api.checkPasscode(code); } catch { return false; }
}

let allowed = false;
async function render() {
  const hash = location.hash || "#/";
  if (hash === "#/admin") { if (state.owner) { go("#/"); return; } return viewAdmin(); }
  if (!allowed) allowed = await canView();
  if (!allowed) return viewGate();
  if (!state.loaded) {
    try { await loadRecipes(); }
    catch { api.forgetPasscode(); allowed = false; return viewGate("Please enter the passcode again."); }
  }
  let m;
  if ((m = hash.match(/^#\/recipe\/(.+)$/))) return viewRecipe(decodeURIComponent(m[1]));
  if (hash === "#/add") return viewForm(null);
  if ((m = hash.match(/^#\/edit\/(.+)$/))) return viewForm(decodeURIComponent(m[1]));
  viewHome();
}

document.addEventListener("click", async (e) => {
  const f = e.target.closest("[data-filter]");
  if (f) {
    state.filter = f.dataset.filter;
    document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === f));
    renderGrid();
  }
  if (e.target.closest('[data-act="signout"]')) {
    await api.signOut(); state.owner = null; allowed = false; state.loaded = false;
    toast("Signed out"); go("#/"); render();
  }
});
document.addEventListener("visibilitychange", async () => {
  // the browser drops the wake lock when you switch apps; take it back when you return
  if (document.visibilityState === "visible" && document.querySelector('[data-act="wake"].on') && !wakeLock) {
    try { wakeLock = await navigator.wakeLock.request("screen"); } catch {}
  }
});
window.addEventListener("hashchange", render);

(async () => {
  try { state.owner = await api.session(); } catch { state.owner = null; }
  render();
})();
