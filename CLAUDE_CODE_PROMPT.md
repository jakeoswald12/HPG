# Bull Sale Check-In App — Claude Code Handoff

## What This Is

A Node.js web app for checking in buyers at an Angus cattle bull sale. It has two browser screens (operator + customer-facing) that sync via BroadcastChannel, backed by a local CSV of ~1,027 customer records and a Google Sheets integration for recording checked-in buyers.

## Project Structure

```
bull-sale-checkin/
├── server.js              # Express server — API for CSV search/update + Google Sheets proxy
├── customers.csv          # CRM data (Last Name, First Name, Business, Address, City, State, Zip, Phone, Miscellaneous)
├── google-apps-script.js  # Google Apps Script code deployed as web app
├── public/
│   ├── operator.html      # Operator screen — search, edit, check-in
│   ├── customer.html      # Customer-facing screen — shows matching records
│   └── logo.png           # Company logo
├── package.json
└── start.sh
```

## What Works

- **CRM search**: Operator types first/last name → searches local CSV → results display as numbered cards on both screens via BroadcastChannel
- **CRM editing**: Operator can select a card, edit fields, and save changes back to the CSV
- **Add new customers**: If no match found, operator can add a new customer to the CSV
- **Server runs on port 8000** (`http://localhost:8000/operator.html` and `http://localhost:8000/customer.html`)
- **Google Sheets proxy**: Server POSTs to a Google Apps Script web app and follows the 302 redirect

## What's Broken — Google Sheets Check-In

The Google Apps Script is supposed to find the **first empty row** on the "Buyers" tab of a Google Sheet and write the buyer's info there. But it keeps writing to the wrong row (way down in the 500s instead of row 4 where buyer #103 is).

### The Buyers tab structure:
- **Column A**: Buyer # (pre-numbered: 101, 102, 103, ... 240, then a "DV Auction" section with 501-750)
- **Column B**: Last Name
- **Column C**: First Name
- **Column D**: Full Name — **HAS A FORMULA** (concatenates B+C), so it's never truly empty
- **Columns E-J**: Address, City, State, Zip, Phone, Email

### The problem:
The script needs to find the first row where **column A is a numeric buyer number** AND **columns B and C are both empty** (ignoring column D since it has a formula). It should write to columns B, C, E, F, G, H, I, J — leaving column D's formula untouched.

Currently the script keeps landing on rows in the 500s (the DV Auction section) instead of the first available row near the top (like buyer #103 in row 4). We've tried multiple iterations and the script claims to check B and C only, but something is still wrong. It may be:

1. Google Apps Script caching/deployment issues (old versions running despite redeploying)
2. Hidden content in B or C cells that looks empty but isn't (formulas, whitespace, data validation)
3. Something unexpected about how `getValues()` returns data for those cells

### The deployed Apps Script URL (hardcoded in server.js):
```
https://script.google.com/macros/s/AKfycbz8BjPxtIr_YlUQA9nOSKfMQxZnfvfT8y3T5r0wUuwXbJHyjeyQc0sM4jaLAAluL4lo/exec
```

### The Google Sheet:
```
https://docs.google.com/spreadsheets/d/1mdPikgaDz8d2Niol64ORMniDwhQTLuyEhbH6kUnyj_4
```

The Buyers tab is called "Buyers".

## What to Do

1. **Debug the Apps Script**: The current version (in `google-apps-script.js`) includes a `debug` field in the response that dumps what the script sees for the first 10 rows. Run a test check-in and examine the terminal output — the server logs the full Sheets response. This will tell you exactly why it's skipping the early rows. The response should include `"version": 5` — if it doesn't, the old deployment is still cached.

2. **Fix the row-finding logic**: Make sure it truly finds the first row where A is numeric and B+C are empty. Consider that B or C might have formulas, data validation, conditional formatting, or invisible characters. You may need to use `getDisplayValues()` instead of `getValues()`, or check the cells differently.

3. **When updating the Apps Script**: The user needs to paste code into Extensions → Apps Script in the Google Sheet, then Deploy → New deployment (not "Manage deployments") → Web app → Execute as: Me → Who has access: Anyone → Deploy. Each new deployment gets a new URL that needs to be hardcoded in `server.js` line 21.

## How to Run

```bash
cd ~/Desktop/High\ Point\ Genetics\ 2026\ Sale/bull-sale-checkin
node server.js
```

Then open `http://localhost:8000/operator.html` and `http://localhost:8000/customer.html` in two browser windows.

## Tech Stack
- Node.js + Express
- csv-parser + csv-writer (npm packages)
- Vanilla HTML/CSS/JS (no framework)
- BroadcastChannel API for cross-tab sync
- Google Apps Script as a Sheets write proxy
