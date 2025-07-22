import csv
from datetime import datetime
from collections import defaultdict, Counter

# Load the CSV file
file_path = "/Users/jongjinchoi/Desktop/Sheets_data/Claude Code Guide Analytics Dashboard v2.0 - Raw_Events.csv"

print("=== COMPREHENSIVE RAW_EVENTS ANALYSIS ===\n")

# 1. Basic Statistics
print("1. BASIC STATISTICS")
with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    
print(f"Total rows: {len(rows)}")
print(f"Total columns: {len(rows[0].keys()) if rows else 0}")

# 2. Date Range and Format Analysis
print("\n2. DATE RANGE AND FORMAT ANALYSIS")
timestamps = []
date_formats = Counter()

for row in rows:
    ts = row['Timestamp']
    if ts:
        # Check format
        if '오전' in ts or '오후' in ts:
            date_formats['Korean Format'] += 1
        elif '-' in ts and ':' in ts:
            date_formats['ISO Format'] += 1
        else:
            date_formats['Other'] += 1
        
        # Try to parse
        try:
            if '오후' in ts:
                dt = datetime.strptime(ts, '%Y. %m. %d 오후 %I:%M:%S')
                if dt.hour != 12:
                    dt = dt.replace(hour=dt.hour + 12)
            elif '오전' in ts:
                dt = datetime.strptime(ts, '%Y. %m. %d 오전 %I:%M:%S')
                if dt.hour == 12:
                    dt = dt.replace(hour=0)
            else:
                dt = datetime.strptime(ts, '%Y-%m-%d %H:%M:%S')
            timestamps.append(dt)
        except:
            pass

print(f"Date format distribution:")
for fmt, count in date_formats.items():
    print(f"  {fmt}: {count} ({count/len(rows)*100:.1f}%)")

if timestamps:
    print(f"\nDate range: {min(timestamps)} to {max(timestamps)}")
    print(f"Days covered: {(max(timestamps) - min(timestamps)).days + 1}")

# 3. Event Analysis
print("\n3. EVENT ANALYSIS")
event_stats = defaultdict(int)
event_categories = defaultdict(int)

for row in rows:
    event_stats[row['Event_Name']] += 1
    event_categories[row['Event_Category']] += 1

print("Event Categories:")
for cat, count in sorted(event_categories.items(), key=lambda x: x[1], reverse=True):
    print(f"  {cat}: {count} ({count/len(rows)*100:.1f}%)")

print("\nTop 10 Event Names:")
for event, count in sorted(event_stats.items(), key=lambda x: x[1], reverse=True)[:10]:
    print(f"  {event}: {count}")

# 4. Guide Funnel Analysis
print("\n4. GUIDE FUNNEL ANALYSIS")
guide_events = {
    'guide_started': 0,
    'step_completed': defaultdict(int),
    'guide_completed': 0
}

unique_users_per_step = defaultdict(set)
guide_users = set()

for row in rows:
    if row['Event_Name'] == 'guide_started':
        guide_events['guide_started'] += 1
        guide_users.add(row['User_ID'])
    elif row['Event_Name'] == 'step_completed':
        step = row.get('Guide_Step_Number', '0')
        if step:
            guide_events['step_completed'][step] += 1
            unique_users_per_step[step].add(row['User_ID'])
    elif row['Event_Name'] == 'guide_completed':
        guide_events['guide_completed'] += 1

print(f"Guide starts: {guide_events['guide_started']}")
print(f"Unique users who started guide: {len(guide_users)}")
print("\nStep completions:")
for step in sorted(guide_events['step_completed'].keys(), key=lambda x: int(x) if x.isdigit() else 0):
    count = guide_events['step_completed'][step]
    unique = len(unique_users_per_step[step])
    print(f"  Step {step}: {count} completions by {unique} unique users")
print(f"Guide completions: {guide_events['guide_completed']}")

if guide_events['guide_started'] > 0:
    print(f"\nCompletion rate: {guide_events['guide_completed']/guide_events['guide_started']*100:.2f}%")

# 5. Button Analysis
print("\n5. BUTTON CLICK ANALYSIS")
button_clicks = []
button_categories = defaultdict(int)
button_targets = defaultdict(int)

for row in rows:
    if row['Event_Name'] == 'button_click':
        category = row.get('Action_Value', '')
        target = row.get('Action_Target', '').strip()
        button_clicks.append({
            'category': category,
            'target': target,
            'device': row.get('Device_Category', '')
        })
        button_categories[category] += 1
        if target:
            button_targets[target] += 1

print(f"Total button clicks: {len(button_clicks)}")
print("\nButton categories:")
for cat, count in sorted(button_categories.items(), key=lambda x: x[1], reverse=True):
    print(f"  {cat}: {count}")

print("\nTop 10 button targets:")
for target, count in sorted(button_targets.items(), key=lambda x: x[1], reverse=True)[:10]:
    clean_target = target.replace('\n', '\\n')[:50]
    print(f"  {clean_target}: {count}")

# 6. Data Quality Issues
print("\n6. DATA QUALITY ISSUES")

# Check for line breaks in Action_Target
line_break_count = 0
quote_issues = 0
empty_action_targets = 0

for i, row in enumerate(rows):
    # Line breaks
    if '\n' in row.get('Action_Target', ''):
        line_break_count += 1
    
    # Empty action targets for button clicks
    if row['Event_Name'] == 'button_click' and not row.get('Action_Target', '').strip():
        empty_action_targets += 1
    
    # Quote issues in error messages
    if row.get('Error_Message', '') and '""' in row['Error_Message']:
        quote_issues += 1

print(f"Action_Target with line breaks: {line_break_count}")
print(f"Button clicks with empty Action_Target: {empty_action_targets}")
print(f"Error messages with quote issues: {quote_issues}")

# 7. User and Session Analysis
print("\n7. USER AND SESSION ANALYSIS")
user_sessions = defaultdict(set)
user_events = defaultdict(int)

for row in rows:
    user_id = row['User_ID']
    session_id = row['Session_ID']
    user_sessions[user_id].add(session_id)
    user_events[user_id] += 1

print(f"Total unique users: {len(user_sessions)}")
print(f"Total unique sessions: {len(set(s for sessions in user_sessions.values() for s in sessions))}")
print(f"Average sessions per user: {sum(len(s) for s in user_sessions.values())/len(user_sessions):.2f}")
print(f"Average events per user: {sum(user_events.values())/len(user_events):.2f}")

# Users with most events
print("\nTop 5 most active users:")
for user, count in sorted(user_events.items(), key=lambda x: x[1], reverse=True)[:5]:
    sessions = len(user_sessions[user])
    print(f"  {user}: {count} events across {sessions} sessions")

# 8. Device and Browser Distribution
print("\n8. DEVICE AND BROWSER DISTRIBUTION")
devices = Counter()
browsers = Counter()
os_types = Counter()

for row in rows:
    devices[row.get('Device_Category', 'Unknown')] += 1
    browsers[row.get('Browser', 'Unknown')] += 1
    os_types[row.get('OS', 'Unknown')] += 1

print("Devices:")
for device, count in devices.most_common():
    print(f"  {device}: {count} ({count/len(rows)*100:.1f}%)")

print("\nTop 5 Browsers:")
for browser, count in browsers.most_common(5):
    print(f"  {browser}: {count} ({count/len(rows)*100:.1f}%)")

print("\nOperating Systems:")
for os, count in os_types.most_common():
    print(f"  {os}: {count} ({count/len(rows)*100:.1f}%)")

# 9. Page Performance
print("\n9. PAGE PERFORMANCE")
page_views = defaultdict(int)
page_interactions = defaultdict(int)

for row in rows:
    if row['Event_Name'] == 'page_view':
        page_views[row.get('Page_Path', '')] += 1
    
    # Count interactions per page
    page_path = row.get('Page_Path', '')
    if page_path and row['Event_Category'] == 'interaction':
        page_interactions[page_path] += 1

print("Page views:")
for page, count in sorted(page_views.items(), key=lambda x: x[1], reverse=True)[:10]:
    interactions = page_interactions.get(page, 0)
    rate = interactions/count*100 if count > 0 else 0
    print(f"  {page}: {count} views, {interactions} interactions ({rate:.1f}% interaction rate)")

# 10. Error Analysis
print("\n10. ERROR ANALYSIS")
errors = []
error_types = Counter()

for row in rows:
    if row['Event_Name'] == 'error_occurred' or row['Event_Category'] == 'error':
        errors.append(row)
        error_types[row.get('Error_Type', 'unknown')] += 1

print(f"Total errors: {len(errors)}")
if errors:
    print("Error types:")
    for error_type, count in error_types.most_common():
        print(f"  {error_type}: {count}")

print("\n=== END OF ANALYSIS ===")