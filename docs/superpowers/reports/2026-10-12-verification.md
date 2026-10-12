# Stage 5 — Final verification (fresh agent)

Repo: `/Users/adeelgulfraz/Documents/Projects/Insurance Education`, branch `main`, HEAD `899ccef` (unchanged — no fixes needed).
Date: 2026-10-12.

**Overall verdict: ALL PASS.** No content or code fixes were required, so no commits were made. `git status` is clean.

---

## 1. Build, validate, test — PASS

```
npm ci              → found 0 vulnerabilities
npm run validate    → exam bank: 398 distinct questions / ✔ content is valid
npm test            → tests 23, pass 23, fail 0
npm run build       → validate + tsc --noEmit + vite build
                      dist/index.html 0.65 kB, assets/index-*.css 9.18 kB, assets/index-*.js 680.73 kB (208.95 kB gzip), no warnings
```

Deployment:
- `.github/workflows/deploy.yml`: `on: push: branches: [main]` (+ `workflow_dispatch`); build job runs `npm ci`, `validate`, `test`, `build`, `configure-pages@v5`, `upload-pages-artifact@v3` (path `dist`); deploy job uses `actions/deploy-pages@v4` with `pages: write` / `id-token: write`. PASS.
- `GITHUB_REPOSITORY=someone/insurance-foundations npx vite build` (output to scratch dir) → `index.html` references `/insurance-foundations/assets/index-*.js` and `/insurance-foundations/assets/index-*.css`. PASS. `vite.config.ts` also returns `/` for `owner.github.io` repos and when the variable is unset.

## 2. Module spot-read (05, 07, 12 in full; 10 and 11 glanced) — PASS

**Tone (all three):** warm, plain English, addressed to Poppy, short paragraphs, every term defined in the same sentence it's introduced in (e.g. "avoid the policy (treat it as if it never existed)", "excess … the first part of a claim you pay yourself"). Clinical analogies are used well and aren't overdone: pre-assessment clinic / medication history check (05), returning to baseline (07), episode of care vs long-term condition management (12). Everyday examples throughout (café, car, phone, sofa, cottage).

**Module 05 — Fair presentation & good faith.** Accuracy checked:
- CIDRA 2012 covers consumers ("wholly or mainly for purposes unrelated to trade, business or profession"); duty is reasonable care not to misrepresent; no duty to volunteer; failing to confirm or amend details on request can be a misrepresentation; reasonable care is judged by clarity of questions and the insurer's knowledge of the customer. Correct.
- Insurance Act 2015 duty of fair presentation: disclose every material circumstance known or ought to be known, or enough to put a prudent insurer on notice; reasonably clear and accessible (no data dumping); facts substantially correct, beliefs in good faith; the five exceptions; knowledge via senior management and the people responsible for insurance, blind-eye knowledge, and a reasonable search covering the broker and the people insured. Correct.
- Remedies: qualifying breach; deliberate or reckless → avoid and keep premium (CIDRA: unless unfair); careless → avoid and refund / different terms (other than premium) / proportionate reduction. Worked example (£1,000 paid against £1,500 → 2/3 of £9,000 = £6,000) is correct. Abolition of the old avoidance-for-breach-of-good-faith remedy is noted. Correct.
- Topics covered: IA 2015 ✔, CIDRA ✔, material facts ✔, duty of fair presentation ✔, reasonable search ✔, remedies (deliberate/reckless vs careless, proportionate) ✔, misrepresentation ✔, broker's role ✔.

**Module 07 — Indemnity.** Accuracy: market value / reinstatement / new-for-old / agreed value; liability = damages and costs; the four settlement methods, including the method-vs-valuation-basis distinction for reinstatement; excess types (compulsory, voluntary, deductible, franchise); sum insured vs limit of indemnity, inner limits; average formula and worked example (£20k/£40k × £4k = £2k); average applies by law only in marine (MIA 1906); betterment; benefit policies (life, PA, CI, IP) vs PMI on indemnity lines; Consumer Duty foreseeable-harm link on replacement offers. All correct.
Topics: principle and purpose ✔, measurement (market value, reinstatement, new-for-old, agreed value) ✔, methods (cash, repair, replace, reinstate) ✔, excesses/deductibles ✔, limits ✔, average/underinsurance ✔, betterment ✔, non-indemnity benefit policies bridging to health/protection ✔.

**Module 12 — Health & protection.** Accuracy: acute vs chronic; typical inclusions and exclusions (pre-existing, chronic, A&E, routine maternity, cosmetic, GP); moratorium (5-year look-back, 2 clear years) vs FMU; MHD and CPME for groups; cash plans and dental; IP (deferred period, partial-salary benefit, own/suited/any occupation); CI (listed definitions, survival period); term vs whole-of-life; group life (death in service, trust), group IP (benefit usually paid to the employer), group CI, free cover limit; GP referral and pre-authorisation; waiting lists driving demand; claims data as special category data. All correct for the UK market as an overview, with no deep pricing.
Topics: PMI individual and group ✔, covers/excludes ✔, pre-existing ✔, chronic vs acute ✔, moratorium vs FMU ✔, cash plans ✔, dental ✔, IP ✔, CI ✔, life ✔, group risk ✔, how health broking works (EBC, renewals, claims advocacy, wellbeing add-ons) ✔, NHS vs private interface ✔, why a clinical background helps ✔.

**Module 10 (glance).** FCA = conduct for all firms and prudential for non-PRA firms, including almost all brokers; PRA (Bank of England) = prudential for insurers; dual regulation. FSMA general prohibition, SM&CR, the 12 Principles (Principles 6 and 7 disapplied where the Consumer Duty applies), the six TCF outcomes, Consumer Duty in force July 2023 / July 2024 (closed products), three cross-cutting rules and four outcomes (products & services, price & value, consumer understanding, consumer support), annual board report, ICOBS (status disclosure, demands and needs, IPID, claims, renewal price disclosure, GIPP for home and motor), FOS (8 weeks, binding if accepted, small business eligibility), FSCS (90% / 100% for compulsory), UK GDPR special category data, 72-hour breach reporting, the four FCA vulnerability drivers. Correct as of 2026.

**Module 11 (glance).** Glossary section "Glossary: 49 terms you'll hear in a broking office" has 49 defined terms (≥ 40), including every term the brief names: TOBA, slip, binder, MGA, bordereau, rate, loss ratio, run-off.

## 3. 20 random questions — PASS (20/20)

Sampling: all 400 questions (12 × 30 + 40 extras) in file order, mulberry32 PRNG seeded `20261012`, 20 distinct indices. For each: exactly one defensible answer, plausible distractors, the explanation matches the keyed answer and teaches, no letter or position references, no "all/none of the above".

| id | verdict | note |
|---|---|---|
| m05-q17 | OK | IA 2015 deliberate/reckless → avoid and keep premium; explanation contrasts the careless remedies |
| m01-q08 | OK | law of large numbers; explanation corrects the misconception that individual risk falls |
| m05-q26 | OK | CIDRA deliberate: avoid, keep premium unless unfair |
| m01-q04 | OK | fundamental risk = war |
| m10-q03 | OK | FSMA 2000; distractors are real Acts |
| m09-q25 | OK | claims-made + retroactive date; good broker tip |
| m11-q29 | OK | CII Code: CII disciplinary action |
| x-q03 | OK | £1,500/£3,000 → £5,000 of £10,000; £8,500 is a plausible trap |
| m07-q12 | OK | voluntary excess; distinguishes franchise |
| m07-q19 | OK | rebuild cost, not sale price |
| m11-q02 | OK | CPD, with an HCPC analogy |
| m04-q24 | OK (judgement) | liability policy after selling the café: "no possible liability, so no insurable interest". Defensible in the module's framing; "no possible" is slightly absolute |
| m03-q08 | OK | the schedule |
| x-q30 | OK | IA 2015 s10 suspension of cover for a breached warranty; correct for theft that night |
| m01-q29 | OK | particular vs fundamental, true/false format |
| m06-q16 | OK | write-back: fire covered, flood excluded |
| m08-q13 | OK | clashing "other insurance" clauses cancel out (Weddell / National Employers v Haydon line) |
| m08-q18 | OK | subrogation surplus goes to the insured (Yorkshire v Nisbet) |
| m06-q23 | OK | theft a week later is a new intervening cause |
| x-q10 | OK | cover note issued with authority binds; insurable interest at time of loss |

Bank-wide checks (all 400): a regex for "all/none/both of the above", "option A–D", "first/second/... option" and "above" found 7 hits, all ordinary prose ("above the free cover limit", "above that"), none positional. No question has duplicate options.

Observation, not a defect: two stems are reused verbatim across modules (m09-q05 = m10-q16 on the IPID, m09-q21 = m10-q21 on the FOS) with equivalent answers. The brief only forbids duplicates within a module, and exam dedupe keeps the first copy (bank = 398).

## 4. App walk-through at 375px — PASS

`npm run preview` via `preview_start` (`.claude/launch.json` "preview", port 4173, git-ignored), `resize_window` preset mobile (375×812). Answers were chosen by matching option text against a stem → answer map generated from the JSON, served temporarily as `dist/answers.json` and deleted afterwards. Options were clicked as DOM buttons.

- **Home header:** `h1` text === `"Insurance Foundations — built for Poppy"` → true. Ring shows 0/12, "Start here: What insurance actually is", modules 2–12 shown as Locked.
- **Reading view:** recap card, sections and a sticky "Take the quiz" button are visible at 375px. Scroll position is remembered: a real scroll to y=1000 on m03, then Home, then back to m03 restored y=1000 (`scrollPos: 1000` stored).
- **Pass with 8/10 (m01):** draw m01-q02, q20, q27, q25, q05, q22, q03, q08 (correct), q21, q14 (wrong) → "8/10", headline "Nice — 8/10. On to How the UK insurance market works.", "Next module" offered. Once an answer is submitted, all options are `disabled`; tapping another option changed nothing. Feedback shows Correct/Not quite plus the explanation in an `aria-live` region.
- **Fail with 7/10 (m02):** → "7/10 — not quite. You need 8. Have another go, the questions change each time."; buttons were only Retry / Back to reading / Home (no Next module). `#/module/m03` and `#/module/m03/quiz` both show "This module unlocks when you pass How the UK insurance market works." Home lists m02 as Ready with best 7/10.
- **Fresh draws:** attempt A {q02,06,11,23,04,07,01,29,03,13}; attempt B (new visit) {q11,14,30,29,26,10,09,24,07,19}; attempt C (via the Retry button) {q23,16,01,13,11,28,09,25,29,08}. Overlap A∩B=3, B∩C=3, A∩C=5, consistent with independent random draws of 10 from 30. After Retry, focus moves to the new stem. Attempt C scored 10/10 and m02 passed; the progress table shows 3 tries, best 10/10.
- **Export → reset → import:** the export code is 340 chars of base64. "Reset everything" (confirm stubbed to true) → localStorage key removed, table back to Ready/Locked. I typed the code into Import with real keystrokes, Tabbed to Import (3px teal focus outline) and pressed Enter → "Progress restored."; the stored JSON is byte-identical to the pre-reset value.
- **Exam lock:** with 2 modules passed, and again with 11 seeded as passed, `#/exam` showed "The final exam unlocks once all 12 modules are passed." and the home card said "Unlocks when all 12 modules are passed." After seeding all 12 as passed → 12/12, "Continue: Final exam", "Start the exam".
- **Exam run, reload and resume:** answered 30 questions (20 correct, 10 wrong) and flagged 5 (m09-q16, m06-q08, m10-q17, m11-q22, m09-q21), current = Q31, timer "00:08". After `location.reload()`: same question ids and option orders, same answers, same flags, same current question and stem; the timer continued at "00:09". After reload, Prev showed the answer still selected and Q29 showed "Flagged" (aria-pressed=true). The review grid shows 30 answered / 70 unanswered / 5 flagged, 100 cells, with an amber ring on flagged cells.
- **Submit and results:** Submit asked "70 unanswered — submit anyway?" (stubbed to yes) and went to `#/exam/results` with "20 of 100 correct. Not this time — 70% needed. Your weakest modules are listed first." The saved attempt has score 20; byModule totals sum to **100** (13 modules incl. "Mixed scenarios" 2/13), and corrects sum to 20, matching. Each of the 12 module rows has a "Revise this module" link to `#/module/mNN`; there are also "Retake exam" and "Home" links. `inProgress` was cleared.
- **No horizontal overflow** at 375px: `scrollWidth` = 375 on `#/`, `#/module/m05`, `#/module/m12/quiz`, `#/progress`, `#/exam`, `#/exam/results`.
- **Dark mode** (`colorScheme: dark`): `prefers-color-scheme: dark` matches, body bg rgb(14,20,19) and text rgb(228,235,233). The exam, results and quiz-feedback screens (red wrong / green correct) are legible with good contrast.
- **Keyboard:** Tab moves through controls, and `:focus-visible` gives a 3px solid teal outline (seen on the Import button, a review grid cell and an answer option). Enter on review cell 2 jumped to Q2. Opening review moves focus to its heading; a new question moves focus to its stem.

## 5. Fixes

None required. No commits made; `git status` clean at HEAD `899ccef`.

## Residual risks / judgement calls

- **`window.confirm` was stubbed** in the browser for Reset and for submitting with unanswered questions, because native dialogs block the automation. The confirm text was captured, but the native dialog UI itself wasn't exercised.
- **"Copy export code" (clipboard API) was not exercised.** I copied the code from the read-only textarea instead. The fallback message path exists in code.
- **Not tested on a real phone or in Safari/iOS.** The 375px check used Chromium emulation, so iOS-specific quirks (safe-area, sticky CTA with the dynamic toolbar) are unverified.
- **GitHub Pages deploy not run.** The workflow and base path were checked statically and with a local build. The first deploy still needs Pages → Source set to GitHub Actions (documented in the README).
- **Content accuracy** was checked in full for 3 modules plus glances at 10 and 11 and 20 of 400 questions; the rest is covered only by the validator and earlier QA stages. m04-q24's wording ("no possible liability") is a mild absolute that an expert could quibble with.
- **Time-sensitive facts** (IPT 12%, FSCS 90%/100%, ICO → Information Commission under the Data (Use and Access) Act 2025) are correct as of Oct 2026 but will date.
- `lastVisited` is stored but "Continue" on Home uses the first unpassed module. This is reasonable behaviour and matches the brief's wording loosely; noted only.
