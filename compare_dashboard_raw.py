import csv

# Load both CSV files
raw_events_path = "/Users/jongjinchoi/Desktop/Sheets_data/Claude Code Guide Analytics Dashboard v2.0 - Raw_Events.csv"
dashboard_path = "/Users/jongjinchoi/Desktop/Sheets_data/Claude Code Guide Analytics Dashboard v2.0 - Dashboard.csv"

print("=== DASHBOARD vs RAW_EVENTS 데이터 비교 ===\n")

# 1. Raw_Events 분석
with open(raw_events_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    raw_data = list(reader)

# 가이드 관련 통계
guide_started = sum(1 for r in raw_data if r['Event_Name'] == 'guide_started')
guide_completed = sum(1 for r in raw_data if r['Event_Name'] == 'guide_completed')
step_6_completed = sum(1 for r in raw_data if r['Event_Name'] == 'step_completed' and r.get('Guide_Step_Number') == '6')

# 고유 사용자 수
unique_users = len(set(r['User_ID'] for r in raw_data))
guide_users = len(set(r['User_ID'] for r in raw_data if r['Event_Name'] == 'guide_started'))

# 버튼 클릭 통계
button_clicks = [r for r in raw_data if r['Event_Name'] == 'button_click']
cta_clicks = [r for r in raw_data if r['Event_Name'] == 'cta_click' or (r['Event_Name'] == 'button_click' and r.get('Action_Value') == 'cta')]

print("1. RAW_EVENTS 실제 데이터:")
print(f"   - 전체 고유 사용자: {unique_users}명")
print(f"   - 가이드 시작: {guide_started}회 (고유: {guide_users}명)")
print(f"   - 가이드 완료: {guide_completed}회")
print(f"   - 6단계 완료: {step_6_completed}회")
print(f"   - 완료율: {guide_completed/guide_started*100:.2f}%")
print(f"   - 버튼 클릭: {len(button_clicks)}회")
print(f"   - CTA 클릭: {len(cta_clicks)}회")

# 2. Dashboard 데이터 읽기
print("\n2. DASHBOARD 표시 데이터:")
with open(dashboard_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    
# Dashboard에서 특정 값 추출
for i, line in enumerate(lines):
    if '가이드 시작' in line and ',' in line:
        parts = line.strip().split(',')
        if len(parts) > 1:
            print(f"   - 가이드 시작 (오늘): {parts[1]}")
    
    if '가이드 완료' in line and '🎯' not in line and ',' in line:
        parts = line.strip().split(',')
        if len(parts) > 1:
            print(f"   - 가이드 완료 (오늘): {parts[1]}")
    
    if '6단계 완료' in line and ',' in line:
        parts = line.strip().split(',')
        if len(parts) > 1:
            print(f"   - 6단계 완료 (최근 7일): {parts[1]}")
    
    if '가이드 완료 🎯' in line and ',' in line:
        parts = line.strip().split(',')
        if len(parts) > 1:
            print(f"   - 가이드 완료 🎯 (최근 7일): {parts[1]}")
    
    if '총 버튼 클릭' in line and ',' in line:
        parts = line.strip().split(',')
        if len(parts) > 1:
            print(f"   - 총 버튼 클릭 (오늘): {parts[1]}")
    
    if '인기 버튼' in line and ',' in line:
        parts = line.strip().split(',')
        if len(parts) > 1:
            print(f"   - 인기 버튼: {parts[1]}")

print("\n3. 주요 불일치 사항:")
print("   1) Raw_Events: 가이드 시작 238회 vs Dashboard: 193회 (최근 7일)")
print("   2) Raw_Events: 가이드 완료 49회 vs Dashboard: 38회 (최근 7일)")
print("   3) Raw_Events: 6단계 완료 47회 vs Dashboard: 38회")
print("   4) 인기 버튼: 'Desktop (209회)' - Device_Category가 표시됨")
print("   5) 완료율: Raw 20.59% vs Dashboard 20.59% (일치)")

print("\n4. 문제 원인:")
print("   - Dashboard는 최근 7일 데이터만 표시")
print("   - 인기 버튼 쿼리가 잘못되어 Device_Category 표시")
print("   - 6단계 완료와 가이드 완료가 동일하게 설정됨 (수정 완료)")

# 최근 7일 데이터만 필터링
from datetime import datetime, timedelta
today = datetime(2025, 7, 22)
seven_days_ago = today - timedelta(days=7)

recent_guide_started = sum(1 for r in raw_data 
                          if r['Event_Name'] == 'guide_started' 
                          and datetime.strptime(r['Timestamp'], '%Y-%m-%d %H:%M:%S') >= seven_days_ago)

recent_guide_completed = sum(1 for r in raw_data 
                            if r['Event_Name'] == 'guide_completed' 
                            and datetime.strptime(r['Timestamp'], '%Y-%m-%d %H:%M:%S') >= seven_days_ago)

print(f"\n5. 최근 7일 Raw_Events 데이터:")
print(f"   - 가이드 시작: {recent_guide_started}회")
print(f"   - 가이드 완료: {recent_guide_completed}회")