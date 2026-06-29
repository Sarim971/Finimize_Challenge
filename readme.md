# Finimize dev challenge

This repo is intended to be forked and uploaded to your own Github account in
order to form the submission for the challenge. Once cloned, it will give you a basic server with a React app, so you don't have to spend time writing boilerplate code. Feel free to make any changes you wish - the existing code is purely intended to get you going faster.

## Python & Django setup

- Requires Python 3.10+ (Django 5.2 requirement)
- Clone the repo
- cd into repo
- Create a virtualenv for the project (use `python3` to bootstrap it — macOS ships Python 3 only as `python3`)

```sh
python3 -m venv venv
```

- Activate the virtualenv — from here on `python` and `pip` refer to the venv

```sh
source venv/bin/activate
```

- Install dependencies in the new virtualenv

```
pip install -r requirements.txt
```

```
python manage.py runserver
```

- Server should be running at http://localhost:8000

## Client setup

- cd into `client`
- Ensure you're using Node 22 (check `.nvmrc`)

```sh
nvm use
```

- Enable Corepack so the pinned Yarn version (Yarn 4, see `packageManager` in `package.json`) is used

```sh
corepack enable
```

- Run `yarn install`
- Run `yarn start`

The webapp should now be running at http://localhost:5173 🚀

### Tests

Tests run with [Vitest](https://vitest.dev/) (+ React Testing Library):

```sh
yarn test        # run once
yarn test:watch  # watch mode
```

## The challenge

Create a web-app that shows how much you can expect to make from your savings over time.

The app must satisfy the following Acceptance Criteria (ACs):

- It should allow the user to vary the initial savings amount, monthly deposit and interest rate through the UI
- It should display how much the user's initial savings amount will be worth over the next 50 years. This should assume that the monthly amount is paid in each month, and the value rises with the interest rate supplied. There are resources online about calculating compound interest totals - e.g. [Wikipedia](https://en.wikipedia.org/wiki/Compound_interest#Investing:_monthly_deposits)
- All calculations must take place server-side, and all monthly projection data should be returned via an endpoint
- The calculations must be triggered onChange of any input, to give live feedback on the input data. The performance (try the slider) should be reasonable.

### Our Guidance

The challenge should not take any more than 2-3 hours. You do not need to complete the challenge in one go.

These are some qualities we value:

- Well-modularised, robust and clearly-written code
- Maintainability. Another team member should be able to easily work with your code after you've finished.
- Single Responsibility Principle
- A well-organised codebase
- Simple, elegant but fun UX

An outline UI has been provided, as well as some simple setup logic on the server. How you connect these and structure logic is up to you! Feel free to make changes to any of the code provided (including the UI) if you wish.

We have chosen to include a basic design system on the client, to give you an idea of how we like to build UIs. For this challenge we have used [Chakra JS](https://chakra-ui.com/docs/getting-started). If you're not familiar with such systems, hopefully this won't be too steep a learning curve. The docs will give you details of all the components/props you can use, but as a head-start, you can pass in styling props to the components including margins/padding etc like this:

```
// This produces a Box (styled div) with a top margin of 2, padding of 3 and a black background colour.
// Colours and spacing properties are defined in `themes/index.tsx`
<Box mt={2} p={3} bg='black'>
```

Although the API might be relatively straightforward, please try and write the API code as if you were building something more complex. We would like to gain an idea of how you would go about structuring API code.

Other than the above AC, feel free to take the challenge in any direction you feel best showcase your strengths!

**Once complete**, drop us a brief note (either an email, or in the readme somewhere) explaining:

- How you approached the challenge
- What bits of your solution you like
- What bits of your solution you’d like to improve upon or would develop next
- How you used AI (remember using AI tooling is encouraged, so we want to hear about your approach)

Please also attach an image/gif of the finished product.

---

## Solution notes

### How I approached the challenge

1. **Backend first** — designed a clean three-layer Django architecture:
   - [`services.py`](interest_calculator/services.py) — pure business logic (compound interest formula, no Django imports)
   - [`validation.py`](interest_calculator/validation.py) — JSON parsing and field-level validation, returning a typed `ValidationResult`
   - [`views.py`](interest_calculator/views.py) — thin orchestration: validate → calculate → serialise → respond

2. **Frontend second** — mirrored the same separation of concerns:
   - [`api/savingsApi.ts`](client/src/api/savingsApi.ts) — all fetch/HTTP logic in one place
   - [`hooks/useSavingsProjection.ts`](client/src/hooks/useSavingsProjection.ts) — debounced data-fetching hook (300 ms) keeps the UI fast during slider sweeps
   - [`components/InputPanel.tsx`](client/src/components/InputPanel.tsx) — each field gets a slider for exploration plus a numeric input for precision
   - [`components/SavingsSummary.tsx`](client/src/components/SavingsSummary.tsx) — headline projected balance, formatted as GBP
   - [`App.tsx`](client/src/App.tsx) — wires it all together; yearly data points (month % 12 === 0) feed the chart

### What I like

- The service layer is **completely framework-agnostic** pure Python — trivially testable and reusable.
- The `ValidationResult` dataclass makes validation outcomes explicit and type-safe; no exceptions used for control flow.
- The debounce in `useSavingsProjection` means slider performance is smooth — the server is only hit after the user pauses.
- TypeScript strict mode is on; all public contracts are typed (no implicit `any`).
- **32 Django tests** cover services, validation, and the HTTP integration layer.
- **44 frontend tests** cover the API client, the `useSavingsProjection` hook, all components, and key App interactions.

### What I'd improve / develop next

- **Error boundaries**: wrap the chart in a React error boundary so a render failure doesn't blank the whole page.
- **Accessibility**: add `aria-valuenow`/`aria-valuemin`/`aria-valuemax` to sliders and improve colour-contrast ratios.
- **Persistence**: save the last-used inputs to `localStorage` so the user's settings survive a page refresh.
- **Animation**: animate the chart line on data update to make the live-feedback feel more polished.
- **Chunk splitting**: the production bundle is a single 628 kB chunk; lazy-loading chart.js would cut initial load time.

### How I used AI

Bob (IBM's AI coding assistant, running Claude Sonnet) was used throughout. After reading the README and exploring the codebase I described the full architecture (three-layer Django backend + hook/component React frontend) and Bob generated the initial code for all files in parallel. I reviewed every file for correctness — verifying the compound interest formula, the validation logic, the TypeScript types, and the test assertions — and directed targeted fixes (e.g. adding the SQLite `DATABASES` config after the test teardown error surfaced). The AI saved significant boilerplate time; all design decisions, logic checks and code review were my own.

### Using AI

We believe a modern developer workflow should make use of the best tools available, so we would encourage you to use AI tools for this challenge - hopefully it saves you some time!

At the time of writing we are using [CursorAI](https://www.cursor.com/). It has a free trial so you're welcome to give it a go if you haven't already tried it.

Bear in mind that when using AI, you are still responsibility for the quality of the output. The same principles mentioned above still apply. And we will still expect to be able to discuss the end solution, so please ensure you're familiar with what's been committed.

### Tooling

The frontend contains some tooling you might be familiar with

#### Typescript

If you like to use Typescript in your workflow, you should get any warnings/errors appear in your terminal after running `yarn start`.

We believe strong TS typing will make your code much more robust.

#### Prettier

We believe Prettier makes your life easier! There is an example .prettierrc included in the `frontend` directory - feel free to tweak the settings if you'd prefer.

You might need to give your IDE a nudge to pick the settings up - [here's an example](https://stackoverflow.com/a/58669550/4388938) of how to do that with VS Code
