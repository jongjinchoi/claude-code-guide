import csv
from datetime import datetime
from collections import defaultdict

print("=== 전체 CSV 파일 종합 분석 ===\n")

# 1. Funnel_Analysis.csv 분석
print("1. FUNNEL_ANALYSIS.CSV 문제점:")
print("- 2025-07-22: Guide_Page_Views가 1092로 과도하게 높음")
print("- 2025-07-19: Step_1_Complete(25)가 Guide_Starts(17)보다 많음")
print("- 2025-07-23부터: 모든 값이 0 (미래 날짜)")

# 2. Button_Analysis.csv 분석
print("\n2. BUTTON_ANALYSIS.CSV 문제점:")
print("- TOP 5 버튼에 Desktop(236), Tablet(22), Mobile(8) 표시")
print("- 이는 Device_Category이지 버튼 이름이 아님")
print("- 실제 버튼 이름이 표시되어야 함")

# 3. Settings.csv 분석
print("\n3. SETTINGS.CSV 확인사항:")
print("- GUIDE_TOTAL_STEPS: 6 (정상)")
print("- DEBUG_MODE: FALSE")
print("- COUNTER_START_VALUE: 105")
print("- 페이지 타이틀들이 설정되어 있음")

# 4. 종합 수정 필요 사항
print("\n\n=== 종합 수정 필요 사항 ===")

print("\n[Dashboard.csv]")
print("1. 실시간 사용자 카운터 (B7):")
print("   현재: 437 → 수정: =COUNTUNIQUE(Raw_Events!D:D)")
print("2. 사이트 방문 (B22):")
print("   현재: 399 → 수정: =COUNTUNIQUE(FILTER(Raw_Events!D:D,Raw_Events!D:D<>\"\"))")

print("\n[Button_Analysis.csv]")
print("1. TOP 5 버튼 쿼리 수정 필요")
print("   현재: Device_Category 표시")
print("   수정: Action_Target (버튼 텍스트) 표시")

print("\n[Funnel_Analysis.csv]")
print("1. Guide_Page_Views 계산 로직 점검")
print("2. Step 완료가 Guide Start보다 많은 이상 데이터 수정")

print("\n[Content_Performance.csv]")
print("1. 평균 체류시간: 모두 0:00:00")
print("2. 상호작용률 100% 초과 문제")

print("\n[가이드 완료 불일치]")
print("Raw_Events 분석:")
print("- step_completed (6단계): 49개")
print("- guide_completed: 52개")
print("- 3개 차이 발생 (일부 사용자가 6단계 없이 guide_completed)")

print("\n[날짜 관련]")
print("- Raw_Events: ISO 형식 사용 중 (정상)")
print("- Funnel_Analysis: 미래 날짜까지 포함 (2025-09-01까지)")

print("\n[권장 조치]")
print("1. Dashboard의 실시간 사용자 수 수식 수정")
print("2. Button_Analysis의 TOP 버튼 쿼리 수정")
print("3. 6단계 완료 = 가이드 완료로 통일")
print("4. 평균 체류시간 계산 로직 구현")
print("5. Funnel_Analysis의 미래 날짜 행 제거 고려")