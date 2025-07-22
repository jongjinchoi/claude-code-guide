import csv
from datetime import datetime
from collections import defaultdict

# CSV 파일들 경로
files = {
    'raw_events': "/Users/jongjinchoi/Desktop/Sheets_data/Claude Code Guide Analytics Dashboard v2.0 - Raw_Events.csv",
    'dashboard': "/Users/jongjinchoi/Desktop/Sheets_data/Claude Code Guide Analytics Dashboard v2.0 - Dashboard.csv",
    'content': "/Users/jongjinchoi/Desktop/Sheets_data/Claude Code Guide Analytics Dashboard v2.0 - Content_Performance.csv"
}

print("=== 최신 CSV 분석 및 수정 필요 사항 ===\n")

# 1. Raw_Events 분석
print("1. RAW_EVENTS 분석")
with open(files['raw_events'], 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    data = list(reader)

print(f"총 이벤트 수: {len(data)}")

# 고유 사용자 수
unique_users = set(r['User_ID'] for r in data)
print(f"고유 사용자 수: {len(unique_users)}")

# 가이드 관련 통계
guide_started = sum(1 for r in data if r['Event_Name'] == 'guide_started')
guide_completed = sum(1 for r in data if r['Event_Name'] == 'guide_completed')
step_6_completed = sum(1 for r in data if r['Event_Name'] == 'step_completed' and r.get('Guide_Step_Number') == '6')

print(f"가이드 시작: {guide_started}")
print(f"가이드 완료: {guide_completed}")
print(f"6단계 완료: {step_6_completed}")

# 버튼 클릭
button_clicks = sum(1 for r in data if r['Event_Name'] == 'button_click')
cta_clicks = sum(1 for r in data if r['Event_Name'] == 'button_click' and r.get('Action_Value') == 'cta')

print(f"버튼 클릭: {button_clicks}")
print(f"CTA 클릭: {cta_clicks}")

# 2. Dashboard 분석
print("\n\n2. DASHBOARD 분석")
with open(files['dashboard'], 'r', encoding='utf-8-sig') as f:
    dashboard_lines = f.readlines()

dashboard_issues = []

# Dashboard에서 주요 값 추출
for i, line in enumerate(dashboard_lines):
    if '현재 사용자' in line and '437' in line:
        dashboard_issues.append(f"라인 {i+1}: 현재 사용자 437 (실제: {len(unique_users)})")
    
    if '가이드 시작' in line and '244' in line:
        dashboard_issues.append(f"라인 {i+1}: 가이드 시작 전체 244 (실제: {guide_started})")
    
    if '가이드 완료' in line and '52' in line:
        dashboard_issues.append(f"라인 {i+1}: 가이드 완료 전체 52 (실제: {guide_completed})")
    
    if '사이트 방문' in line and '399' in line:
        dashboard_issues.append(f"라인 {i+1}: 사이트 방문 399 (실제: {len(unique_users)})")

print("Dashboard 불일치 사항:")
for issue in dashboard_issues:
    print(f"  - {issue}")

# 3. 주요 문제점 및 수정 필요 사항
print("\n\n3. 주요 수정 필요 사항:")

print("\n[실시간 사용자 카운터]")
print("- 현재 사용자: 437 → 실제 고유 사용자 수로 수정 필요")
print("- 수식: =COUNTUNIQUE(Raw_Events!D:D)")

print("\n[오늘의 핵심 지표]")
print("- 가이드 시작 전체: 244 → " + str(guide_started))
print("- 가이드 완료 전체: 52 → " + str(guide_completed))
print("- 6단계와 가이드 완료 일치 확인 필요")

print("\n[가이드 퍼널 분석]")
print("- 사이트 방문: 399 → " + str(len(unique_users)))
print("- 가이드 페이지 조회: 376 (재계산 필요)")
print("- 6단계 완료 = 가이드 완료로 통일 필요")

print("\n[페이지별 성과]")
print("- 평균 체류시간: 모두 0:00:00 (계산 로직 필요)")
print("- 상호작용률 100% 초과 문제 (재계산 필요)")

print("\n[버튼 상호작용 분석]")
print("- TOP 버튼들 텍스트 길이 조정 필요")
print("- 전체 버튼 클릭: 266 → " + str(button_clicks))

# 날짜 형식 확인
print("\n\n4. 날짜 형식 확인:")
date_formats = defaultdict(int)
for row in data[-50:]:  # 최근 50개만 확인
    ts = row['Timestamp']
    if '오전' in ts or '오후' in ts:
        date_formats['Korean'] += 1
    else:
        date_formats['ISO'] += 1

print(f"최근 50개 이벤트 날짜 형식:")
for fmt, count in date_formats.items():
    print(f"  {fmt}: {count}")

# 최신 이벤트 확인
print("\n\n5. 최신 이벤트:")
if data:
    last_event = data[-1]
    print(f"마지막 이벤트: {last_event['Timestamp']} - {last_event['Event_Name']}")
    print(f"총 행 수: {len(data) + 1} (헤더 포함)")