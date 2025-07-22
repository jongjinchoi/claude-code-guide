import csv
import re

# Load the CSV file
file_path = "/Users/jongjinchoi/Desktop/Sheets_data/Claude Code Guide Analytics Dashboard v2.0 - Raw_Events.csv"

print("=== DATA QUALITY CHECK ===\n")

# 1. Check for rows with incorrect number of fields
print("1. FIELD COUNT CHECK")
with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    print(f"Expected number of fields: {len(header)} ({len(header)} columns)")
    
    incorrect_rows = []
    for i, row in enumerate(reader):
        if len(row) != len(header):
            incorrect_rows.append((i+2, len(row), row))
    
    if incorrect_rows:
        print(f"\nFound {len(incorrect_rows)} rows with incorrect field count:")
        for row_num, field_count, content in incorrect_rows[:5]:
            print(f"  Row {row_num}: {field_count} fields")
            print(f"    First 3 fields: {content[:3]}")
    else:
        print("✓ All rows have correct number of fields")

# 2. Check Action_Target column for line breaks
print("\n\n2. ACTION_TARGET LINE BREAKS CHECK")
with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    line_break_issues = []
    
    for i, row in enumerate(reader):
        if 'Action_Target' in row and row['Action_Target']:
            if '\n' in row['Action_Target'] or '\r' in row['Action_Target']:
                line_break_issues.append((i+2, row['Action_Target'], row['Event_Name']))
    
    if line_break_issues:
        print(f"Found {len(line_break_issues)} entries with line breaks in Action_Target:")
        for row_num, target, event in line_break_issues[:5]:
            print(f"  Row {row_num} ({event}): {repr(target)}")
    else:
        print("✓ No line breaks found in Action_Target column")

# 3. Check Error_Message column for quote issues
print("\n\n3. ERROR_MESSAGE QUOTE ISSUES CHECK")
with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    quote_issues = []
    
    for i, row in enumerate(reader):
        if 'Error_Message' in row and row['Error_Message']:
            # Check for unescaped quotes that might cause issues
            if '""' in row['Error_Message'] or ('"' in row['Error_Message'] and not row['Error_Message'].startswith('"')):
                quote_issues.append((i+2, row['Error_Message'], row['Error_Type']))
    
    if quote_issues:
        print(f"Found {len(quote_issues)} entries with potential quote issues in Error_Message:")
        for row_num, message, error_type in quote_issues[:5]:
            print(f"  Row {row_num} ({error_type}): {repr(message)}")
    else:
        print("✓ No quote issues found in Error_Message column")

# 4. Check button_click events
print("\n\n4. BUTTON_CLICK EVENTS ANALYSIS")
with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    button_clicks = []
    
    for i, row in enumerate(reader):
        if row['Event_Name'] == 'button_click':
            button_clicks.append({
                'row': i+2,
                'category': row.get('Action_Value', ''),
                'target': row.get('Action_Target', ''),
                'device': row.get('Device_Category', '')
            })
    
    print(f"Total button_click events: {len(button_clicks)}")
    if button_clicks:
        print("\nFirst 10 button clicks:")
        for click in button_clicks[:10]:
            print(f"  Row {click['row']}: Category='{click['category']}', Target='{click['target']}', Device='{click['device']}'")
        
        # Check if Device_Category is being used as button name
        device_as_button = [c for c in button_clicks if c['target'] == c['device']]
        if device_as_button:
            print(f"\n⚠️  Found {len(device_as_button)} cases where Device_Category might be shown as button name")

# 5. Check for empty required fields
print("\n\n5. EMPTY REQUIRED FIELDS CHECK")
with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    empty_issues = {
        'User_ID': 0,
        'Session_ID': 0,
        'Event_Name': 0,
        'Timestamp': 0
    }
    
    for i, row in enumerate(reader):
        for field in empty_issues.keys():
            if not row.get(field, '').strip():
                empty_issues[field] += 1
    
    print("Empty fields in critical columns:")
    for field, count in empty_issues.items():
        if count > 0:
            print(f"  ⚠️  {field}: {count} empty values")
        else:
            print(f"  ✓ {field}: No empty values")

print("\n=== END OF DATA QUALITY CHECK ===")