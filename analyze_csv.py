import pandas as pd
import numpy as np
from datetime import datetime
import re

# Load the CSV file
file_path = "/Users/jongjinchoi/Desktop/Sheets_data/Claude Code Guide Analytics Dashboard v2.0 - Raw_Events.csv"
df = pd.read_csv(file_path)

print("=== COMPREHENSIVE CSV ANALYSIS REPORT ===\n")

# 1. Basic Information
print("1. BASIC INFORMATION")
print(f"Total rows (excluding header): {len(df)}")
print(f"Total columns: {len(df.columns)}")
print(f"\nColumn names:")
for i, col in enumerate(df.columns):
    print(f"  {i}: {col}")

# 2. Date Range Analysis
print("\n\n2. DATE RANGE ANALYSIS")
# Check for different date formats
date_formats = []
sample_dates = df['Timestamp'].dropna().head(100).tolist() + df['Timestamp'].dropna().tail(100).tolist()

for date_str in sample_dates[:10]:
    print(f"Sample timestamp: '{date_str}'")

# Try to parse dates with different formats
parsed_dates = []
date_format_counts = {}

for idx, date_str in enumerate(df['Timestamp'].dropna()):
    if pd.isna(date_str):
        continue
        
    # Try different date formats
    formats_to_try = [
        '%Y-%m-%d %H:%M:%S',  # Standard format
        '%Y. %m. %d 오전 %I:%M:%S',  # Korean AM format
        '%Y. %m. %d 오후 %I:%M:%S',  # Korean PM format
        '%Y. %m. %d AM %I:%M:%S',  # English AM format
        '%Y. %m. %d PM %I:%M:%S',  # English PM format
    ]
    
    parsed = False
    for fmt in formats_to_try:
        try:
            # Special handling for Korean AM/PM
            date_str_clean = str(date_str).strip()
            if '오후' in date_str_clean:
                # Korean PM format - need to add 12 hours
                date_obj = datetime.strptime(date_str_clean, '%Y. %m. %d 오후 %I:%M:%S')
                if date_obj.hour != 12:  # Don't add 12 to 12 PM
                    date_obj = date_obj.replace(hour=date_obj.hour + 12)
            elif '오전' in date_str_clean:
                # Korean AM format
                date_obj = datetime.strptime(date_str_clean, '%Y. %m. %d 오전 %I:%M:%S')
                if date_obj.hour == 12:  # 12 AM should be 0
                    date_obj = date_obj.replace(hour=0)
            else:
                date_obj = datetime.strptime(date_str_clean, fmt)
            
            parsed_dates.append(date_obj)
            date_format_counts[fmt] = date_format_counts.get(fmt, 0) + 1
            parsed = True
            break
        except:
            continue
    
    if not parsed:
        print(f"Could not parse date at row {idx}: '{date_str}'")

print(f"\nDate format distribution:")
for fmt, count in date_format_counts.items():
    print(f"  {fmt}: {count} occurrences")

if parsed_dates:
    print(f"\nDate range: {min(parsed_dates)} to {max(parsed_dates)}")
    print(f"Total days covered: {(max(parsed_dates) - min(parsed_dates)).days + 1}")

# 3. Column Structure Analysis
print("\n\n3. COLUMN STRUCTURE ANALYSIS")
print("Columns after deletions (Guide_ID, Guide_Name, Page_Title removed):")
print(f"Current columns: {list(df.columns)}")

# Verify specific column mappings
print("\nColumn mapping verification:")
if len(df.columns) > 9:
    print(f"  Column J (index 9) - Expected: Guide_Step_Number, Actual: {df.columns[9]}")
if len(df.columns) > 10:
    print(f"  Column K (index 10) - Expected: Guide_Step_Name, Actual: {df.columns[10]}")
if len(df.columns) > 14:
    print(f"  Column O (index 14) - Expected: Action_Target, Actual: {df.columns[14]}")

# 4. Event Types Distribution
print("\n\n4. EVENT TYPES DISTRIBUTION")
event_categories = df['Event_Category'].value_counts()
print("Event Categories:")
for cat, count in event_categories.items():
    print(f"  {cat}: {count} ({count/len(df)*100:.2f}%)")

print("\nEvent Names by Category:")
for cat in df['Event_Category'].unique():
    if pd.notna(cat):
        event_names = df[df['Event_Category'] == cat]['Event_Name'].value_counts()
        print(f"\n  {cat}:")
        for name, count in event_names.items():
            print(f"    {name}: {count}")

# 5. Data Quality Issues
print("\n\n5. DATA QUALITY ISSUES")

# Check for empty cells in critical columns
critical_columns = ['Timestamp', 'Event_Category', 'Event_Name', 'User_ID', 'Session_ID']
print("Empty cells in critical columns:")
for col in critical_columns:
    if col in df.columns:
        empty_count = df[col].isna().sum()
        if empty_count > 0:
            print(f"  {col}: {empty_count} empty cells")
            # Show some examples
            empty_rows = df[df[col].isna()].head(3)
            if not empty_rows.empty:
                print(f"    Example rows: {empty_rows.index.tolist()[:3]}")

# Check Action_Target for line breaks
print("\nAction_Target line break analysis:")
if 'Action_Target' in df.columns:
    action_targets = df['Action_Target'].dropna()
    with_linebreaks = action_targets[action_targets.str.contains('\n', na=False)]
    print(f"  Entries with line breaks: {len(with_linebreaks)}")
    if len(with_linebreaks) > 0:
        print("  Examples:")
        for idx, val in with_linebreaks.head(3).items():
            print(f"    Row {idx}: '{repr(val)}'")

# Check for shifted data
print("\nPotential data shifting issues:")
# Look for numeric values in text columns
text_columns = ['Event_Category', 'Event_Name', 'Page_Path', 'Action_Target']
for col in text_columns:
    if col in df.columns:
        # Check if any values look like they might be from wrong column
        values = df[col].dropna().astype(str)
        numeric_pattern = values.str.match(r'^\d+\.?\d*$')
        if numeric_pattern.any():
            print(f"  {col} contains {numeric_pattern.sum()} purely numeric values")
            examples = df[col][numeric_pattern].head(3)
            for idx, val in examples.items():
                print(f"    Row {idx}: '{val}'")

# 6. Anomalies and Patterns
print("\n\n6. ANOMALIES AND PATTERNS")

# Check for duplicate events
print("Duplicate event analysis:")
dup_cols = ['Timestamp', 'User_ID', 'Event_Name']
if all(col in df.columns for col in dup_cols):
    duplicates = df[df.duplicated(subset=dup_cols, keep=False)]
    print(f"  Potential duplicate events: {len(duplicates)}")
    if len(duplicates) > 0:
        print("  First few duplicates:")
        print(duplicates[dup_cols].head(6))

# Check session patterns
print("\nSession patterns:")
if 'Session_ID' in df.columns:
    sessions_per_user = df.groupby('User_ID')['Session_ID'].nunique()
    print(f"  Average sessions per user: {sessions_per_user.mean():.2f}")
    print(f"  Max sessions by a single user: {sessions_per_user.max()}")
    print(f"  Users with only one session: {(sessions_per_user == 1).sum()}")

# Guide completion analysis
print("\nGuide completion patterns:")
guide_events = df[df['Event_Category'] == 'guide']
if not guide_events.empty:
    guide_starts = len(guide_events[guide_events['Event_Name'] == 'guide_started'])
    guide_completes = len(guide_events[guide_events['Event_Name'] == 'guide_completed'])
    print(f"  Guide starts: {guide_starts}")
    print(f"  Guide completions: {guide_completes}")
    if guide_starts > 0:
        print(f"  Completion rate: {guide_completes/guide_starts*100:.2f}%")

# Device and browser distribution
print("\nDevice and Browser distribution:")
if 'Device_Category' in df.columns:
    print("  Devices:")
    for device, count in df['Device_Category'].value_counts().items():
        print(f"    {device}: {count} ({count/len(df)*100:.2f}%)")

if 'Browser' in df.columns:
    print("  Browsers:")
    for browser, count in df['Browser'].value_counts().head(5).items():
        print(f"    {browser}: {count} ({count/len(df)*100:.2f}%)")

print("\n=== END OF REPORT ===")