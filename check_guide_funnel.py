import csv
from datetime import datetime, timedelta

# Load the CSV file
file_path = "/Users/jongjinchoi/Desktop/Sheets_data/Claude Code Guide Analytics Dashboard v2.0 - Raw_Events.csv"

with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    data = list(reader)

# Calculate funnel metrics
metrics = {
    'unique_users': set(),
    'guide_page_views': set(),
    'guide_started': set(),
    'step_1': set(),
    'step_2': set(),
    'step_3': set(),
    'step_4': set(),
    'step_5': set(),
    'step_6': set(),
    'guide_completed': set()
}

# Count events
for row in data:
    user_id = row['User_ID']
    event_name = row['Event_Name']
    
    # All unique users
    metrics['unique_users'].add(user_id)
    
    # Guide page views
    if event_name == 'page_view' and 'guide' in row.get('Page_Path', '').lower():
        metrics['guide_page_views'].add(user_id)
    
    # Guide started
    if event_name == 'guide_started':
        metrics['guide_started'].add(user_id)
    
    # Step completions
    if event_name == 'step_completed':
        step_num = row.get('Guide_Step_Number', '0')
        if step_num == '1':
            metrics['step_1'].add(user_id)
        elif step_num == '2':
            metrics['step_2'].add(user_id)
        elif step_num == '3':
            metrics['step_3'].add(user_id)
        elif step_num == '4':
            metrics['step_4'].add(user_id)
        elif step_num == '5':
            metrics['step_5'].add(user_id)
        elif step_num == '6':
            metrics['step_6'].add(user_id)
    
    # Guide completed
    if event_name == 'guide_completed':
        metrics['guide_completed'].add(user_id)

# Print results
print("=== 가이드 퍼널 분석 (고유 사용자 기준) ===\n")
print(f"전체 고유 사용자: {len(metrics['unique_users'])}명")
print(f"가이드 페이지 조회: {len(metrics['guide_page_views'])}명")
print(f"가이드 시작: {len(metrics['guide_started'])}명")
print(f"1단계 완료: {len(metrics['step_1'])}명")
print(f"2단계 완료: {len(metrics['step_2'])}명")
print(f"3단계 완료: {len(metrics['step_3'])}명")
print(f"4단계 완료: {len(metrics['step_4'])}명")
print(f"5단계 완료: {len(metrics['step_5'])}명")
print(f"6단계 완료: {len(metrics['step_6'])}명")
print(f"가이드 완료: {len(metrics['guide_completed'])}명")

print("\n=== 전환율 계산 ===")
if len(metrics['unique_users']) > 0:
    print(f"사이트 방문 → 가이드 페이지: {len(metrics['guide_page_views'])/len(metrics['unique_users'])*100:.1f}%")

if len(metrics['guide_page_views']) > 0:
    print(f"가이드 페이지 → 가이드 시작: {len(metrics['guide_started'])/len(metrics['guide_page_views'])*100:.1f}%")

if len(metrics['guide_started']) > 0:
    print(f"가이드 시작 → 1단계 완료: {len(metrics['step_1'])/len(metrics['guide_started'])*100:.1f}%")

# Step-to-step conversion
steps = ['step_1', 'step_2', 'step_3', 'step_4', 'step_5', 'step_6']
for i in range(len(steps)-1):
    if len(metrics[steps[i]]) > 0:
        print(f"{i+1}단계 → {i+2}단계: {len(metrics[steps[i+1]])/len(metrics[steps[i]])*100:.1f}%")

if len(metrics['step_5']) > 0:
    print(f"5단계 → 6단계: {len(metrics['step_6'])/len(metrics['step_5'])*100:.1f}%")

if len(metrics['step_6']) > 0:
    print(f"6단계 → 가이드 완료: {len(metrics['guide_completed'])/len(metrics['step_6'])*100:.1f}%")

# Check discrepancy
print(f"\n=== 6단계와 가이드 완료 차이 확인 ===")
print(f"6단계 완료자: {metrics['step_6']}")
print(f"가이드 완료자: {metrics['guide_completed']}")
print(f"6단계만 완료 (가이드 미완료): {metrics['step_6'] - metrics['guide_completed']}")
print(f"가이드만 완료 (6단계 미완료): {metrics['guide_completed'] - metrics['step_6']}")