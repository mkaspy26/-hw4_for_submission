# Campus Customs: Yale Merch Store + AI Shopping Assistant

A full online store for **Campus Customs** (the shop behind Yale Bulldog Blue) with an AI shopping assistant, **Sir Handsome Dan**. He answers questions about products, prices, and stock **from the shop's real database**, puts search results on the page, remembers logged-in shoppers, and follows strict safety rules.

- **Frontend:** React + Vite + TypeScript (`frontend/`)
- **Backend:** FastAPI + a PydanticAI agent (`backend/`), using `gpt-5.6-luna` through Portkey
- **Data:** SQLite (`data/campus_customs.db`) + product photos (`data/products/`). **Not included in this repo** (see step 1 below).

Full documentation of how the system works is in **[`output/harness.md`](output/harness.md)**.

## Project structure

```
hw4/
├── AI_prompts.md          # every prompt used to build this project
├── requirements.txt       # Python packages for the backend
├── .env.example           # settings template (copy to .env, add your own key)
├── .gitignore
├── README.md
├── frontend/              # Vite React TypeScript app
├── backend/
│   ├── main.py            # FastAPI app (routes, login + password hashing): run with `uvicorn main:app --reload --port 8000`
│   ├── agent.py           # agent wiring: model, prompt, tools, guardrails, limits, audit trail
│   ├── models.py          # Pydantic types (API, agent output, tool results)
│   ├── tools.py           # read-only database tools the agent can call
│   └── prompts/
│       └── prompt.md      # the agent's system prompt (voice + safety rules)
└── output/
    ├── harness.md         # how the whole system works (start here)
    ├── design.md          # storefront design rationale
    ├── usability.md       # usability improvements + measurements
    ├── app_check.html     # live-site test report
    ├── app_check_images/  # screenshots linked from app_check.html
    └── audit_trail.json   # append-only log of agent runs
```

## Requirements

- **Python 3.12+** (tested on 3.14)
- **Node.js 18+** (tested on 24) with npm
- A **Portkey API key** (for the AI assistant)

## Setup (one time)

**1. Put the data back.** The database and product images are kept out of GitHub. Create a `data/` folder at the top level and place them inside it:

```
data/campus_customs.db        # the SQLite database (catalogue, inventory, users, chat_messages)
data/products/*.jpg           # the 102 product photos
```

**2. Add your API key.** Copy the template and put your own Portkey key in it (never commit `.env`):

```bash
cp .env.example .env
```

Then edit `.env` and set `PORTKEY_API_KEY=` to your key.

**3. Install the backend:**

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r requirements.txt
```

**4. Install the frontend:**

```bash
cd frontend && npm install
```

## Run

Use two terminals, both started from the project's top-level folder.

**Terminal 1: backend** (FastAPI on port 8000):

```bash
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000
```

**Terminal 2: frontend** (Vite on port 5173):

```bash
cd frontend && npm run dev
```

Then open **http://localhost:5173**. The Vite dev server forwards `/api` and `/media` requests to the backend on port 8000. Press `Ctrl+C` in each terminal to stop.

**Test login** (seeded in the database): `test@campuscustoms.yale.edu` / `password`. You can also create a new account on the site.

## What to try

- Click **Sir Handsome Dan** (bottom-right, or on the homepage) and ask: *"What hoodies do you have?"*, *"Is the Sailing Left Chest Hoodie in stock in L?"*, *"How much is the Boola Boola tee?"*
- Open any product page and click **"Ask Sir Handsome Dan about this item"**, then try *"Do you have this in pink?"*
- Use the filters on **Products**, hover the college names on the homepage ribbon, and hunt for the 16 hidden keys (tracked in the Grimoire).
