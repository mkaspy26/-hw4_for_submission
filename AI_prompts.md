# AI Prompts Log

## Problem 1: Vibe coder prompts

**Prompt:**

> create AI_prompts.md
> here, you will log all the prompts i give you and each time i will giev you 1. the problem number 2. the name of the probelm 3. the prompt 4. if i missed anything in the first prompt i'll follow up with another & explain what i was lacking on the first

**Follow-up:** None

## Problem 2: Analyze the Database

**Prompt:**

> look at the database data/campus_customs.db and understand the fields of each table. you should understand catalogues, inventoyr, users among other things.
> start output/harness.md where you'd write down each table and its fields and a short line on why each field matters fo rthe shop or the chatbot. in further probelms, you will keep adding to this harness file (models, tools, safety, specs)

**Follow-up:** None

## Problem 3: Build the Campus Customs Website

**Prompt:**

> Scaffold a React + Vite + TypeScript front end for Campus Customs and put a nav bar at the top that links to the following pages: 1. home 2. products 3. about us 4. login 5. create account.
> pull campus customs type wording from this webiste: https://yalebulldogblue.com/ from the "Home" and "About Us" pages but reword this stuff so it doesnt sound like direct copy paste. For the products page, show product images from the catalogue (use image paths in the database) with basic product info (name, price, short description). make each product open a single item page (large image on the left and the full product text on the right inclusing the desciption, price, sizes/stock when you have them). clicking a card on products should take the shopper there.
> add a chat interface in the bottom right of the site ( a floating chat panel is fine). it doesn't need to talk to an agent yet -- a stub that will call your backend later is enough for this problem. you'll need a small API soon to read the database and it's fine to start with a simple FastAPI app in backend/main.py just to serve products and images and then grow it into the agent backend in Problem 5 later.

**Follow-up:** None

## Problem 4: Create Account and Login

**Prompt:**

> Make a normal create an account & login flow. for the creat account i want 1. first name 2. last name 3. email 4. password (& confirm password). for login: 1. email 2. password. new accounts go into the "users" table and make sure to store passwords securely so AI or human hackers can't access them.
> The seed database already has a tes user you can use while building it. the email: test@campuscustoms.yale.edu, password: password, has function: PBKDF2-HMAC-SHA256, 120,000 iterations (stored as pbkdf2_sha256$salt$hash).
> this is how login checks a password: 1. you never un-hash the stored value. you re-hash what the user typed and compare. 2. read the salt out of the stored string--do not make a new one at login. 3. has the typed password with that same salt, then compare to the stored hash. use a constant-time compare. 4. signup and login must use the same hash settings (same function, same salt handling, same iteration count). If they differ, even the right password wont match. 4. surest check: login as the seeded test user AND as a brand new account you just creted in your own app. confim you can login as that user and that a brand new account you create also works. update output/harness.md with how auth works (what u store for a user and how passwords r protected).

**Follow-up:** None

## Problem 5: PydanticAI agent Backend

**Prompt:**

> Build the shop chatbot as a pydanticAI agent behind FastAPI which is plugged into your front end chat widget. puyt the api app in backend/main.py that's the file you run with Uvicorn. keep the agent as these 4 files next to it: backend/prompts/prompt.md (system prompt whcih will i will add more to later), backend/agent.py (agent entry/wiring), backend/tools.py (tools the agent can call), backend/models.py (pydantic/pydanticai structured types). In main.py expose a chat route so a message from the website returns a reply from the agent (and wtvr else u need fro products/auth). use my api portkey for the agent.
> put campus customs voice and safety basics into prompts/prompt.md (you'll expand tools and safety later). start or update types in models.py for chat replies/product cards as needed. in output/harness.md note how the front end talks to FastAPI and hwo the agent is loaded (prompt file + model). make sure the backend runs from the bankend/ folder like this: uvicorn main:app --reload --port 8000.

**Follow-up:** None

## Problem 6: Tools: Product Info and Stock

**Prompt:**

> Give agent tools that look up real info from campus_customs.db: 1. product description 2. price 3. how many r in stock (by size when customer asks). the agent miust use the databse. never invent prices or quantities and if the the size or anything is out of stock, u must state it clearly.
> expand prompts/prompt.md so agent knows to call these tools for price and stock questions. add or update return types in models.py.
> in output/harness.md list each tool and explain which model fields u chose for lookup results & why

**Follow-up:** None

## Problem 7: Chat Search That Updates the Page

**Prompt:**

> Now we're gonna add a cool feature to the site. When someone asks about a type of item (ex. what hoodies do you have?) the agent should search the catalogue and the website should dynamically show those matching items as product cards (image, name, price, short info). this is an API contract. the agent returns structured product matches and the front end renders them on the website which should look rly cool.
> After the dynamic product cards are loaded by your new feature, make sure the same single-item page behaviour you buuilt in problem 3 still works: each product card (including the ones the chat just put on the page) should still open that dteail view (big image + the full info) when its clicked.
> update prompts/prompt.md and output/harness.md so its clear how search results reach the page

**Follow-up:** None

## Problem 8: Customer Memory

**Prompt:**

> when a shopper is logged i, save their chat history in the database table and reload it when they return. The agent should know who's chatting (name, email) and put that in agent deps (or an equivalent clear pattern) and/or tools the agent can call.
> also, pass enouh page context that if someone is on product page and asks "do you have this in pink?" the agent knows which item they mean. Hint: you can put code inot the agent context.
> Guests can still chat but history only needs to persist for logged in users.
> Docuent in output/harness.md how user chat history is stored, what customer fields the agent sees and how page context is passed.

**Follow-up:** None

## Problem 9: Usability Improvements

**Prompt:**

> Now that the core shop works, improve it. Choose & implement 1. 2 front end usability improvements 2. 2 agent / backend usability improvements. the front end improvements are things that should make the site look better & easier to use, while the agent/backend improvements r things that make the agent ouptut better & more accurate or safer. these could be new agent tools or things that make the agent run faster or cheaper.
> write output/usability.md before or as you build. for each of the improvements, say: 1. what u added 2. y it helps campus customs shopper or the busienss.
> then make sure all improevments actually show up in the running app.

**Follow-up:** None

## Problem 10: Style the Website

**Prompt:**

> Add creative design so the site feels like a real Campus Customs storefront -- fonts, color, hierarchy, motion, product presentiation, chat feel. so i want to make the chatbot handsome dan and create a mini bulldog icon to act as their "personal shopping assistant" and make him rly cute and lick something whenever a user clicks him (which then opens the chatbot). i want some mystical ancient harry potter type vibe for the homepage and stick with the yale navy colours & white. i also want you to create the way ur descritpuions r written like the way a head of college at a college would write (with maybe references to the colleges themselevs) and random mini fun facts hidden across the website and interactive in some sense.
> write output/design.md explaining that the changes i made were to make ppl feel lke they were expereincing the ancient secrets of yale and felt like they were kinda in a harry potter movie (which is what everyone fantasizes about being at yale) which makes ppl not only wanna shop but also to explore the webiste and that the colours reflect the school's values and that the cute bot would not make it annoin to chat but rather fun to chat with the chatbot.  All of this would increase time on the website and increas elikelikhood of buying merchandise because they're so WOW'd by the experience

**Follow-up:**

> love the new version but when lets say handsome dan chat shows a few results and then i go back to home page and go back to products page, the results (filtered search) doesnt clear automatically -- i want it to. also, instead of "picked by your shopping assistant" it should be on theme to be picked by handsome dan or smtg and smtg about the icon of handsome dan doesn t sit right -- it's like floating which is sick and blinking which is cool but its in between mystical and cute but its neither. make it either or and i love the footprints after i ask chatbot smtg, love the pre made questions and love the paws-itively and shit like that. the backdrop on home page w the blue & candles is weak -- change it & maybe make colleges in the back or handsome dans or smtg else -- i;m open but rn blue & candles is ugly.  not a big fan of that campus customs font tho. i love the secret counter but instead of stars make it smtg else

**What the first prompt was lacking:** It didn't say how chat results should behave when the shopper navigates away (they should clear once you leave the Products area), and it didn't name a single clear personality for Dan (mystical vs. cute), so the first version landed in between. It also left the homepage backdrop, brand font, and secret-marker style open, and the first choices (blue night sky + candles, the Cinzel font, ✦ stars) didn't match the look I wanted.

**Follow-up 2:**

> actually, instead of going the cute route, i want to make it the mystical, magical route. the home page is like paper cartoon -- i want it kinda spooky and feel like harry potter type gothic mystical magical vibe. make the whole vibe around this. put teasers in create an account & login page about maybe getting tapped into a secret society. i want the font to be legible but ancient harry potter vibe. the secrets should be clearer too

**What the earlier prompts were lacking:** I hadn't committed to one direction for the whole site. I'd picked "cute" for Dan without realizing it would clash with the mystical Yale feel I actually wanted everywhere (homepage, Dan, fonts, account pages). I also didn't say the homepage should be dark and spooky (the engraving came out like a paper cartoon), didn't specify a font that is both legible and ancient-looking, didn't ask for secret-society teasers on the login/sign-up pages, and didn't say the hidden secrets needed to be obvious and trackable (they were too subtle to find).

**Follow-up 3:**

> ok nice but dont make the dan glow in dark. juts make him like a mature bulldog who kinda looks like a prince. also theres a dan in the middle of the homepage which is obstructing my view. i dont like the dark backdrop as much. make it make to white

**What the earlier prompts were lacking:** "Mystical" didn't say whether Dan should be spooky or regal, so he came out as a glowing spirit when I wanted a mature, princely bulldog. I also didn't say Dan should appear only as the corner icon (not in the middle of the homepage), or that "mystical" should still keep the white background rather than turning the whole site dark.

**Follow-up 4:**

> [attached image: a cartoon bulldog mascot, white with tan patches, a red collar, and a gold medal]
> anytime i see handsome dan, i wanna be able to click him. "an audience with handsome dan" isnt clear enough. also, i want you to model handsome dan off of this guy but pretend he aged into an adult so he looks more mature and he's looking at you from the side with a mini crown but dont in the webiste ever call him a prince. you can call him sir handsome dan. i also want a mini dan right above the scrolling tab of all the colleges and it'd be nice to be able to have smtg pop up when my mouse toggles the colleges in that tab. i love the play on words for create an account but i also need a MINI description of on taht page of y ppl actuallly create an account

**What the earlier prompts were lacking:** I hadn't given a visual reference for Dan, so his look kept missing. I also hadn't said that every Dan should be clickable with a plain label, what title to use (Sir, not prince), that the college ribbon should be interactive, or that the playful sign-up copy still needs a short, literal reason to create an account.

**Follow-up 5:**

> he looks a bit derranged/handy capped / not as majestic as i envisioned so change him plz an dmake the handsome dan run across , using the college tab thing as the floor and make him stop once or twice for like a second pause maybe look at you and then run off only for him to come back

**What the earlier prompts were lacking:** "Looking at you from the side" plus "mature" left the look open to interpretation, and the side-turned head came out lopsided rather than majestic. I hadn't described the quality I wanted (dignified, regal, composed). I also hadn't asked for any motion for the ribbon Dan: him running along the college tab as a floor, pausing to look at the viewer, and running off and back.


## Problem 11: Site Testing (app check)

**Prompt:**

> Test the live site and document it in output/app_check.html. Include clear screenshots and short captions for: 1. chat checking the inventory level of an item (honest stock/price from the DB) 2. dynamic search-result cards appearing after a category question (ex. hoodie) 3. the Smart suggestion chips in the chat you added in problem 9.
> the html should be very clear: headings for each check, screenshot, one or two sentences on what that screenshot proves. Put the screenshot image files in output/app_check_images/ and link them from app_check.html with relative paths (ex. app_check_images/inventory.png)

**Follow-up:** None

## Problem 12: Audit Trail, Safety, Finish Harness

**Prompt:**

> Keep an append-only output/audit_trail.json of agent-loop activity (time, tool name, short args/result, stop reason). Don't wipe it between runs. Safety rules I want you to add to prompts/prompt.md are to never falsify information — if you cant find it in our database, dont make shit up. Never hack any website and only stay within the realm of our folder. If you ever dont know what to do with something because theres a conflict and you need someone to cast judgement — ask me. Dont go overboard of a certain amount of tokens and tools called (you pick the right amount) per prompt. Finish the output/harness.md so it's clear how the system works. You're gonna start the document by wrapping things up very clearly — 1. Context in a concise but very clear way of what the task is, what files were created and how they interact / what each was useful for. 2. model fields in models.py and y u chose them 3. Tools and abilities 4. Safety rules 5. Specs (loop limits, result caps, models, how to run front + back)

**Follow-up:** None

## Problem 13: Push to GitHub and Submit the URL

**Prompt:**

> [attached image: the desired folder structure: hw4/ with AI_prompts.md, requirements.txt, .env.example, .gitignore, README.md, frontend/, backend/ (main.py, agent.py, models.py, tools.py, prompts/prompt.md), output/ (harness.md, design.md, usability.md, app_check.html, app_check_images/, audit_trail.json)]
> Put all the code that we put in hw4 and i will push it to github. but make a copy of this hw4 folder (called hw4_for_submission) which i will push to github that doesnt have my read .env filed iwth my apiporteky and doesnt have the campus_customs.db nor the product images cuz i dont want any of it on github. include a .env.example with placeholders of a fake apikey -- do NOT put the real one! i want u to make a requirements.txt file. make a .gitignore file. not sure what the README.md file is, but if there is one, i want it just in the hw4 folder, not in any subfolders. in the for_submission file, i want it to look like the screenshot
> also, put the .webloc and the .command file that you recentlyo made when i asked to be able to access the websbite to a folder called "me" and here, i want you to add another file that's called launch website which contains code taht i can input in my terminal which will launch the website. i dont want this "me" new folder in the for_submission folder -- just keep the "me" folder for my purposes.

**Follow-up:**

> README.md should explain how to run the front end and back end after palcing the data back

**What the first prompt was lacking:** It didn't say what the README should contain. It needs to explain how to put the database and product images back (since they're not on GitHub) and then how to run the backend and frontend.

**Follow-up 2:**

> in the submission folder: there shouldnt be a data folder! ouptu fodler is perfect. prompts folder is sperfect. the backend/ folder has way too many docs (should only have main.py, agent.py, models.py, tools.py and in the frontend/ there should just be the vite react typescript app

**What the earlier prompts were lacking:** I didn't say the backend had to be *exactly* the four agent files (so the login and audit helpers got merged into `main.py` and `agent.py`), and I didn't say there should be no `data/` folder at all, not even the generated product notes. Those notes now live inside the React app as `frontend/src/collegeNotes.json`.
