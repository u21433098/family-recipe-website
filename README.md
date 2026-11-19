# Claud's Cooks 🍽️

A family recipe website. Claudia adds and edits recipes. Friends and family need a passcode to view them.

**Features:** 9 categories · search across everything · category and favourite filters · tick off ingredients and steps while cooking · keep-screen-on mode · print view · comments · ready for photos.

---

## Try it right now (demo mode)

When `js/config.js` has no Supabase details, the site runs in **demo mode**. Recipes are only saved in your browser.

- Passcode: `demo`
- Owner sign in: any email, password `demo`

---

## One-time setup (about 15 minutes)

### 1. Create the database (free)
1. Go to <https://supabase.com>, sign up and click **New project**. Pick the region closest to South Africa and save the database password somewhere safe.
2. When the project is ready, open **SQL Editor → New query**.
3. Paste in everything from `supabase/schema.sql` and click **Run**.
4. Scroll to **STEP 2** at the bottom of that file. Copy those lines into a new query and remove the `--` at the start of each line. Put in **your email** and the **passcode you'll give family**, then click **Run**.
   *(Run this again any time you want to change the passcode.)*

### 2. Create your owner login
1. Go to **Authentication → Users → Add user → Create new user**.
2. Use the **same email** as in step 1.4, choose a password and tick **Auto Confirm User**.
3. Go to **Authentication → Sign In / Providers**. Turn **off** "Allow new users to sign up" so nobody else can create an account.

### 3. Connect the website to the database
1. In Supabase go to **Project Settings → API** (or the **Connect** button).
2. Copy the **Project URL** and the **anon / publishable key**.
3. Paste them into `js/config.js`:
   ```js
   SUPABASE_URL: "https://xxxx.supabase.co",
   SUPABASE_ANON_KEY: "eyJ...",
   ```
   The anon key is safe to put in the website. The database rules only let it read recipes when the right passcode is given.

### 4. Put it online with GitHub Pages
1. Upload all these files to the `family-recipe-website` repo, keeping the folders as they are.
2. In the repo go to **Settings → Pages**. Under "Source" choose **Deploy from a branch**, pick **main** and **/(root)**, then click **Save**.
3. After a minute or two your site is live at
   `https://u21433098.github.io/family-recipe-website/`

> Free GitHub Pages needs the repo to be **public**. Only the code is public. Your recipes live in Supabase behind the passcode.

---

## Day-to-day use

- **Add a recipe:** open the site, tap **Owner** at the bottom, sign in, then tap **+ Add recipe**.
- **Edit or delete:** while signed in, open a recipe and tap **Edit** or **Delete**. You can also delete comments.
- **Share:** send family the link and the passcode. Each device only asks for the passcode once.
- **Change the name:** edit `SITE_NAME` in `js/config.js`.

## Files

| File | What it is |
|---|---|
| `index.html` | The page shell |
| `css/styles.css` | All colours, fonts and layout |
| `js/config.js` | **Site name, Supabase keys, categories and colours** |
| `js/app.js` | Screens and behaviour |
| `js/data.js` | Saving and loading (Supabase or demo) |
| `js/shapes.js` | The geometric category shapes |
| `supabase/schema.sql` | Database setup |

## Coming next: photos
Every recipe already has a `photos` list, and the site shows photos on cards and recipe pages whenever there are some. The next step is adding a photo upload button to the add/edit form, using Supabase Storage.
