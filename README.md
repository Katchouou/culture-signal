# CULTURE SIGNAL®

A personal English-language culture discovery reader with Chinese context and **traceable evidence**. It is a static site, not a mocked app: the provided October 15, 2026 editorial snapshot is readable locally, and a scheduled Python collector can refresh the separate discovery feed on GitHub Pages.

## Open immediately

Open `index.html` in Chrome or Safari. The bundled `data/seed.js` powers offline reading, search, filters, source links, story drawers, and browser-local saved stories. Photo assets are publisher-hosted and need an internet connection; offline they fall back to designed typographic covers. Image rights remain with their publishers, and some remote image hosts block hotlinks. The fallback does not falsely present decorative images as proof of a specific celebrity look.

## Turn on automatic updates

1. Create a new GitHub repository (e.g. `culture-signal`). Use a public repository for GitHub Free Pages. Upload the **contents** of this folder to the `main` branch, including the hidden `.github/workflows/daily-refresh.yml` file; `index.html` must be at the repository root.
2. Under **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. The workflow itself now refreshes the feed, saves it to the repository, and deploys the exact same files to Pages. A `GITHUB_TOKEN` data commit alone would not trigger a branch-based Pages build.
3. Under **Actions**, find **Refresh and publish Culture Signal** and choose **Run workflow**. Check that both `build` and `deploy` succeed, then open the Pages URL shown in the deployment. The workflow requests `contents: write`, `pages: write`, and `id-token: write`; repository or organization policy must allow those permissions.
4. The cron schedule requests a refresh at UTC minutes **07, 22, 37, and 52** of every hour (about every 15 minutes). GitHub Actions may delay or skip scheduled runs, so this is near-real-time polling, **not a 15-minute guarantee or live streaming**. The app checks the published feed every five minutes while open and again when the tab becomes visible. It shows the last successful collection to the minute in Beijing time and source errors. You can run the workflow manually any time.

**GitHub Pages is public by default in many setups.** Do not put personal secrets in this repository. The app itself requires no API key, no subscription, and no database.

### What updates automatically

- The **Daily Signals** desk: Google Trends US/GB RSS for search spikes; recent English Google News RSS discovery by fashion / celebrities / internet memes / beauty / lifestyle / UK culture; Spotify weekly charts from Kworb where accessible, plus official Apple Music US/UK top-song rankings (rank only). These are English discovery leads, not verified Chinese trend reports.
- Apple Music chart items use artwork URLs returned by Apple's feed. News items show a publisher-provided RSS image only when one exists. Other new items have no automatic picture; remote images may expire or block embedding. The older **Discover** editorial pictures remain fixed until edited by a person.
- Each numerical signal uses the metric from the named provider. Google Trends `approx_traffic` is an approximate traffic **bucket**, not a precise Google search count. Kworb data reproduces publicly displayed weekly ranks and plays; chart access can be rate-limited. News stories **do not** receive fabricated popularity numbers.
- The **Discover** editorial stories are intentionally dated snapshots, with real context and manually checked citations. This script does not invent Chinese summaries or claim it has fact-checked every article found overnight. For daily editorial rewrites, you need an editorial pipeline/LLM with paid API and a verification stage.

To change future discovery topics, edit `config.json`. To update manually: `pip install -r requirements.txt && python scripts/update.py` then commit the updated `data/` files. Python 3.11+ is recommended.

## Reality check

Simply opening `index.html` does **not** run internet crawls: GitHub Actions must be enabled on the repository, or an equivalent scheduled job must run elsewhere. Instagram and TikTok do not offer reliable, open, unauthenticated access to all creators' precise realtime post metrics. Thus this version does not claim to scrape every influencer's latest post or estimate the platform's overall share of voice. Those require authorized APIs, an approved data vendor, or manual curation. Fifteen-minute collection attempts do not make weekly charts, news mentions, or an editorial snapshot into live social trends.

The app never equates editorial articles with measurable adoption, and preserves stale/failed source states. Images are used as remote editorial previews and attributed; rights remain with their respective publishers, and links may expire. If you publish widely, obtain rights or swap the images.

## Structure

- `index.html` — responsive app layout
- `assets/style.css` — design system
- `assets/app.js` — navigation, filters, search, detail panels, saved signals, feed rendering
- `data/feed.json` — snapshot + auto-updated data
- `data/seed.js` — inline fall-back for local file mode
- `scripts/update.py` — fail-soft public RSS and chart ingestion
- `config.json` — editable keyword queries and countries
- `.github/workflows/daily-refresh.yml` — approximately 15-minute scheduler and Pages deployment

No analytics, trackers, user accounts, embedded advertising, or fake popularity score.

## A data-interpretation example

The Owala vs Stanley story intentionally presents two **non-comparable** ASInsight Amazon US keyword samples from July 2026: “tumbler” Top 10 ASINs reported **Owala 42K / Stanley 10K** estimated units; “stanley tumbler” Top 10 ASINs reported **Stanley 27K / Owala 15K**. This proves that the query changes the apparent winner, not that either brand has a universal market-share lead.
