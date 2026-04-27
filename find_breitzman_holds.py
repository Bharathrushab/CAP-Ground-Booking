"""Find all PRCs on list 4012 that were put on hold by Rick Breitzman."""

import json
import os
import re
from datetime import date
from generate_prc_report import MCPClient, load_config, _extract_records

cfg = load_config("report_config.json")
token = os.environ.get(cfg["auth_env_var"], "")
if not token:
    raise SystemExit("IL_API_TOKEN env var not set")

client = MCPClient(
    mcp_url=cfg["api_base_url"],
    auth_header=cfg["auth_header"],
    auth_token=token,
)
client.initialize()

# Step 1: Fetch ALL PRCs (any status) from list 4012
today_str = date.today().strftime("%m/%d/%Y")
result = client.filter_data(
    list_id="4012",
    field_list=["number", "issue", "status"],
    date_field="submit_date",
    date_gte="01/01/2015",
    date_lte=today_str,
    filter_field="status",
    filter_method="ContainsAnyOf",
    filter_pattern="open,hold,approved,closed,rescinded,moved,in-progress,pending",
    take_only=200,
)

records, take_url = _extract_records(result)
from urllib.parse import urlparse, parse_qs

while take_url:
    qs = parse_qs(urlparse(take_url).query)
    take_key = qs.get("TakeKey", [None])[0]
    if not take_key:
        break
    print(f"  Paginating... {len(records)} records so far")
    result = client.take_next_records(list_id="4012", take_key=take_key)
    page, take_url = _extract_records(result)
    records.extend(page)

print(f"Total PRCs fetched: {len(records)}")

# Step 2: Fetch worklist details in batches
numbers = [r["number"] for r in records]
all_details = {}
batch_size = 40
field_list = ["number", "issue", "status", "worklist", "update", "update_date"]

for i in range(0, len(numbers), batch_size):
    batch = numbers[i:i + batch_size]
    print(f"  Fetching worklist batch {i+1}-{min(i+batch_size, len(numbers))} of {len(numbers)}")
    result = client.get_issue_data(
        list_id="4012",
        issue_ids=batch,
        field_list=field_list,
    )
    if isinstance(result, dict):
        for key, val in result.items():
            if isinstance(val, dict) and ("number" in val or "worklist" in val):
                num = val.get("number", key)
                all_details[num] = val

print(f"Fetched worklist for {len(all_details)} PRCs")

# Step 3: Find holds by Rick Breitzman
def clean_name(raw):
    return re.sub(r"</a>.*$", "", raw).strip()

# --- Step A: Find ALL worklist entries where Breitzman appears (any action) ---
breitzman_prcs = {}  # prc_num -> list of worklist entries
for prc_num, prc in all_details.items():
    worklist = prc.get("worklist", [])
    for entry in worklist:
        name = clean_name(entry.get("WorkListItem", ""))
        assigned = (entry.get("WorkListAssigned") or "").strip()
        if "breitzman" in (name + " " + assigned).lower():
            if prc_num not in breitzman_prcs:
                breitzman_prcs[prc_num] = []
            breitzman_prcs[prc_num].append({
                "action": (entry.get("WorkListAction") or "").strip(),
                "date": entry.get("WorkListDate", ""),
                "step": entry.get("WorkListNumber", ""),
                "name": name,
                "assigned": assigned,
            })

print(f"\nPRCs where Breitzman is on the worklist (any action): {len(breitzman_prcs)}")
for prc_num, entries in sorted(breitzman_prcs.items()):
    prc = all_details[prc_num]
    for e in entries:
        action_display = e['action'] if e['action'] else '(pending/blank)'
        print(f"  PRC {prc_num} [{prc.get('status','')}] Step {e['step']}: {action_display} on {e['date']}")

# --- Step B: Also check update journal for hold + breitzman in ALL PRCs ---
hold_from_log = []
for prc_num, prc in all_details.items():
    update_html = prc.get("update", "") or ""
    if not update_html:
        continue
    # Split into log entries and search each
    entries = re.split(r"(?=<u>\d{2}[A-Z]{3}\d{4}:</u>)", update_html)
    for entry_text in entries:
        entry_lower = entry_text.lower()
        if "hold" in entry_lower and ("breitzman" in entry_lower or "breitrw" in entry_lower):
            date_match = re.search(r"<u>(\d{2}[A-Z]{3}\d{4}):</u>", entry_text)
            hold_date = date_match.group(1) if date_match else "unknown"
            hold_from_log.append({
                "PRC": prc_num,
                "Title": prc.get("issue", ""),
                "Status": prc.get("status", ""),
                "Hold Date (log)": hold_date,
            })
            break

if hold_from_log:
    print(f"\nAdditional PRCs with hold+breitzman in update journal: {len(hold_from_log)}")
    for h in hold_from_log:
        print(f"  PRC {h['PRC']}: {h['Title']} (Status: {h['Status']}, Log Date: {h['Hold Date (log)']})")
else:
    print(f"\nNo additional hold+breitzman entries found in update journals (note: journals are often truncated by the API)")

# --- Step C: Compile final list ---
breitzman_holds = []

# Current holds from worklist
for prc_num, entries in breitzman_prcs.items():
    for e in entries:
        if "hold" in e["action"].lower():
            prc = all_details[prc_num]
            breitzman_holds.append({
                "PRC": prc_num,
                "Title": prc.get("issue", ""),
                "Status": prc.get("status", ""),
                "Hold Date": e["date"],
                "Source": "Worklist (current hold)",
            })

# Historical holds from update journal (deduplicate)
already = {h["PRC"] for h in breitzman_holds}
for h in hold_from_log:
    if h["PRC"] not in already:
        breitzman_holds.append({
            "PRC": h["PRC"],
            "Title": h["Title"],
            "Status": h["Status"],
            "Hold Date": h["Hold Date (log)"],
            "Source": "Change Log (historical)",
        })

breitzman_holds.sort(key=lambda x: x["PRC"])

print(f"\n{'='*80}")
print(f"TOTAL PRCs put on hold by Rick Breitzman: {len(breitzman_holds)}")
print(f"{'='*80}")

if breitzman_holds:
    for h in breitzman_holds:
        print(f"\nPRC {h['PRC']}: {h['Title']}")
        print(f"  Current Status: {h['Status']}")
        print(f"  Hold Date: {h['Hold Date']}")
        print(f"  Found via: {h['Source']}")
else:
    print("No holds found by Rick Breitzman.")
