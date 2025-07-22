import csv
from datetime import datetime, timedelta

# Load the CSV file
file_path = "/Users/jongjinchoi/Desktop/Sheets_data/Claude Code Guide Analytics Dashboard v2.0 - Raw_Events.csv"

# Read all data
with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    data = list(reader)

# Set today's date
today = datetime(2025, 7, 22)
yesterday = today - timedelta(days=1)
seven_days_ago = today - timedelta(days=7)
thirty_days_ago = today - timedelta(days=30)

# Count button clicks and CTA clicks
counts = {
    'today_button': 0,
    'today_cta': 0,
    'yesterday_button': 0,
    'yesterday_cta': 0,
    'seven_days_button': 0,
    'seven_days_cta': 0,
    'thirty_days_button': 0,
    'thirty_days_cta': 0,
    'total_button': 0,
    'total_cta': 0
}

for row in data:
    if row['Event_Name'] == 'button_click':
        timestamp = datetime.strptime(row['Timestamp'], '%Y-%m-%d %H:%M:%S')
        is_cta = row.get('Action_Value', '') == 'cta'
        
        # Total
        counts['total_button'] += 1
        if is_cta:
            counts['total_cta'] += 1
        
        # Today
        if timestamp.date() == today.date():
            counts['today_button'] += 1
            if is_cta:
                counts['today_cta'] += 1
        
        # Yesterday
        if timestamp.date() == yesterday.date():
            counts['yesterday_button'] += 1
            if is_cta:
                counts['yesterday_cta'] += 1
        
        # Last 7 days
        if timestamp >= seven_days_ago:
            counts['seven_days_button'] += 1
            if is_cta:
                counts['seven_days_cta'] += 1
        
        # Last 30 days
        if timestamp >= thirty_days_ago:
            counts['thirty_days_button'] += 1
            if is_cta:
                counts['thirty_days_cta'] += 1

# Calculate conversion rates
print("=== CTA 전환율 계산 결과 ===\n")

print(f"오늘 (2025-07-22):")
print(f"  버튼 클릭: {counts['today_button']}회")
print(f"  CTA 클릭: {counts['today_cta']}회")
if counts['today_button'] > 0:
    print(f"  전환율: {counts['today_cta']/counts['today_button']*100:.0f}%")
else:
    print(f"  전환율: 0% (버튼 클릭 없음)")

print(f"\n어제 (2025-07-21):")
print(f"  버튼 클릭: {counts['yesterday_button']}회")
print(f"  CTA 클릭: {counts['yesterday_cta']}회")
if counts['yesterday_button'] > 0:
    print(f"  전환율: {counts['yesterday_cta']/counts['yesterday_button']*100:.0f}%")
else:
    print(f"  전환율: 0% (버튼 클릭 없음)")

print(f"\n최근 7일:")
print(f"  버튼 클릭: {counts['seven_days_button']}회")
print(f"  CTA 클릭: {counts['seven_days_cta']}회")
if counts['seven_days_button'] > 0:
    print(f"  전환율: {counts['seven_days_cta']/counts['seven_days_button']*100:.0f}%")
else:
    print(f"  전환율: 0%")

print(f"\n최근 30일:")
print(f"  버튼 클릭: {counts['thirty_days_button']}회")
print(f"  CTA 클릭: {counts['thirty_days_cta']}회")
if counts['thirty_days_button'] > 0:
    print(f"  전환율: {counts['thirty_days_cta']/counts['thirty_days_button']*100:.0f}%")
else:
    print(f"  전환율: 0%")

print(f"\n전체:")
print(f"  버튼 클릭: {counts['total_button']}회")
print(f"  CTA 클릭: {counts['total_cta']}회")
if counts['total_button'] > 0:
    print(f"  전환율: {counts['total_cta']/counts['total_button']*100:.0f}%")
else:
    print(f"  전환율: 0%")

# Check button types
print("\n=== 버튼 타입 분석 ===")
button_types = {}
for row in data:
    if row['Event_Name'] == 'button_click':
        action_value = row.get('Action_Value', 'empty')
        if action_value not in button_types:
            button_types[action_value] = 0
        button_types[action_value] += 1

print("Action_Value 분포:")
for value, count in sorted(button_types.items(), key=lambda x: x[1], reverse=True):
    print(f"  '{value}': {count}회")