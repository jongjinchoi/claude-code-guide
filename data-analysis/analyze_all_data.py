#!/usr/bin/env python3
"""
Supabase raw_events 전체 데이터 분석
"""

import pandas as pd
from datetime import datetime, timedelta
from supabase import create_client, Client
import pytz

# Supabase 연결
supabase_url = 'https://nuzpotnrvwwysrwnqlyx.supabase.co'
supabase_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51enBvdG5ydnd3eXNyd25xbHl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTQ5OTAsImV4cCI6MjA2ODgzMDk5MH0.E89y_hPtddgc1BGBreZqjfXhw4gyl3QGexA-I0e6KW0'

supabase: Client = create_client(supabase_url, supabase_key)

print("📊 Supabase raw_events 전체 데이터 분석 시작...")

# 전체 데이터 가져오기 (페이지네이션 처리)
all_data = []
batch_size = 1000
offset = 0

while True:
    try:
        response = supabase.table('raw_events').select("*").order('timestamp', desc=False).range(offset, offset + batch_size - 1).execute()
        data = response.data
        
        if not data:
            break
            
        all_data.extend(data)
        print(f"  {len(all_data)}개 로드됨...", end='\r')
        
        if len(data) < batch_size:
            break
            
        offset += batch_size
        
    except Exception as e:
        print(f"\n❌ 데이터 로드 중 오류: {e}")
        break

print(f"\n✅ 총 {len(all_data)}개 이벤트 로드 완료")

# DataFrame 생성
df = pd.DataFrame(all_data)
df['timestamp'] = pd.to_datetime(df['timestamp'], format='ISO8601')

# 한국 시간대 설정
kst = pytz.timezone('Asia/Seoul')
df['timestamp_kst'] = df['timestamp'].dt.tz_convert(kst)
df['date'] = df['timestamp_kst'].dt.date
df['hour'] = df['timestamp_kst'].dt.hour

print("\n" + "="*60)
print("📈 전체 데이터 요약")
print("="*60)

# 1. 기본 통계
print(f"\n🔢 기본 통계:")
print(f"  - 총 이벤트 수: {len(df):,}개")
print(f"  - 고유 사용자 수: {df['user_id'].nunique():,}명")
print(f"  - 고유 세션 수: {df['session_id'].nunique():,}개")
print(f"  - 데이터 수집 기간: {df['timestamp_kst'].min().strftime('%Y-%m-%d %H:%M')} ~ {df['timestamp_kst'].max().strftime('%Y-%m-%d %H:%M')}")

# 2. 일별 통계
daily_stats = df.groupby('date').agg({
    'user_id': 'nunique',
    'event_name': 'count'
}).rename(columns={'user_id': 'unique_users', 'event_name': 'total_events'})

print(f"\n📅 일별 활동 (최근 7일):")
for date, row in daily_stats.tail(7).iterrows():
    print(f"  {date}: 사용자 {row['unique_users']}명, 이벤트 {row['total_events']:,}개")

# 3. 이벤트 타입별 분석
print(f"\n🎯 이벤트 타입별 분포:")
event_counts = df['event_name'].value_counts()
total_events = len(df)
for event, count in event_counts.head(15).items():
    percentage = (count / total_events) * 100
    print(f"  {event:.<30} {count:>6,}개 ({percentage:>5.1f}%)")

# 4. 가이드 퍼널 분석
print(f"\n🎓 가이드 퍼널 분석:")
funnel_events = ['page_view', 'guide_started', 'step_completed', 'guide_completed']

# 가이드 페이지 방문자
guide_page_visitors = df[(df['event_name'] == 'page_view') & (df['page_path'].str.contains('guide', na=False))]['user_id'].nunique()
guide_starters = df[df['event_name'] == 'guide_started']['user_id'].nunique()
guide_completers = df[df['event_name'] == 'guide_completed']['user_id'].nunique()

print(f"  가이드 페이지 방문: {guide_page_visitors:,}명")
print(f"  가이드 시작: {guide_starters:,}명 ({guide_starters/guide_page_visitors*100:.1f}% 전환)")
print(f"  가이드 완료: {guide_completers:,}명 ({guide_completers/guide_starters*100:.1f}% 완료율)")

# 단계별 완료 분석
step_completed = df[df['event_name'] == 'step_completed']
if not step_completed.empty:
    print(f"\n  단계별 완료 현황:")
    for step in range(1, 7):
        step_users = step_completed[step_completed['guide_step_number'] == step]['user_id'].nunique()
        if step_users > 0:
            print(f"    {step}단계: {step_users}명")

# 5. 사용자 행동 패턴
print(f"\n👥 사용자 행동 패턴:")
user_events = df.groupby('user_id').agg({
    'event_name': 'count',
    'timestamp_kst': ['min', 'max']
}).round(2)

user_events.columns = ['event_count', 'first_visit', 'last_visit']
user_events['duration_minutes'] = (user_events['last_visit'] - user_events['first_visit']).dt.total_seconds() / 60

# 사용자 세그먼트
one_time_users = len(user_events[user_events['event_count'] == 1])
active_users = len(user_events[user_events['event_count'] > 10])
power_users = len(user_events[user_events['event_count'] > 50])

print(f"  일회성 방문자: {one_time_users:,}명 ({one_time_users/len(user_events)*100:.1f}%)")
print(f"  활성 사용자 (10+ 이벤트): {active_users:,}명 ({active_users/len(user_events)*100:.1f}%)")
print(f"  파워 사용자 (50+ 이벤트): {power_users:,}명 ({power_users/len(user_events)*100:.1f}%)")

# 6. 디바이스 및 브라우저 분석
print(f"\n📱 디바이스 분석:")
device_stats = df[df['device_category'] != 'Unknown']['device_category'].value_counts()
for device, count in device_stats.items():
    if pd.notna(device):
        print(f"  {device}: {count:,}개 ({count/len(df)*100:.1f}%)")

print(f"\n🌐 브라우저 분석:")
browser_stats = df[df['browser'] != 'Unknown']['browser'].value_counts()
for browser, count in browser_stats.head(5).items():
    if pd.notna(browser):
        print(f"  {browser}: {count:,}개 ({count/len(df)*100:.1f}%)")

# 7. 시간대별 활동
print(f"\n⏰ 시간대별 활동 패턴:")
hourly_activity = df.groupby('hour')['event_name'].count().sort_index()
peak_hours = hourly_activity.nlargest(3)
print("  피크 시간대:")
for hour, count in peak_hours.items():
    print(f"    {hour}시: {count:,}개 이벤트")

# 8. 버튼 클릭 분석
button_clicks = df[df['event_name'] == 'button_click']
if not button_clicks.empty:
    print(f"\n🔘 버튼 클릭 분석 (상위 10개):")
    button_stats = button_clicks['action_target'].value_counts()
    for button, count in button_stats.head(10).items():
        if pd.notna(button):
            print(f"  {button}: {count}회")

# 9. 코드 복사 분석
code_copies = df[df['event_name'] == 'code_copy']
if not code_copies.empty:
    print(f"\n📋 코드 복사 분석:")
    code_stats = code_copies['action_target'].value_counts()
    for code, count in code_stats.head(5).items():
        if pd.notna(code):
            print(f"  {code}: {count}회")

# 10. 에러 분석
errors = df[df['is_success'] == False]
if not errors.empty:
    print(f"\n⚠️ 에러 분석:")
    print(f"  총 에러 수: {len(errors)}개")
    error_types = errors['error_type'].value_counts()
    for error_type, count in error_types.items():
        if pd.notna(error_type):
            print(f"  {error_type}: {count}개")

# 11. 피드백 분석
feedback = df[df['event_name'] == 'feedback_submitted']
if not feedback.empty:
    print(f"\n💬 피드백 분석:")
    print(f"  총 피드백 수: {len(feedback)}개")
    feedback_scores = feedback['feedback_score'].value_counts()
    for score, count in feedback_scores.items():
        if pd.notna(score):
            print(f"  점수 {score}: {count}개")

print("\n" + "="*60)
print("✨ 분석 완료!")
print("="*60)

# CSV 저장 옵션
save_option = input("\n💾 분석 결과를 저장하시겠습니까? (1: 전체 데이터, 2: 요약 통계만, n: 저장 안함): ")
if save_option == '1':
    filename = f"supabase_full_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    df.to_csv(filename, index=False)
    print(f"✅ 전체 데이터가 {filename}에 저장되었습니다.")
elif save_option == '2':
    summary_filename = f"supabase_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    with open(summary_filename, 'w', encoding='utf-8') as f:
        f.write(f"Supabase Analytics Summary - {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        f.write("="*60 + "\n\n")
        f.write(f"총 이벤트 수: {len(df):,}개\n")
        f.write(f"고유 사용자 수: {df['user_id'].nunique():,}명\n")
        f.write(f"데이터 수집 기간: {df['timestamp_kst'].min().strftime('%Y-%m-%d')} ~ {df['timestamp_kst'].max().strftime('%Y-%m-%d')}\n")
        f.write(f"\n이벤트 타입별 분포:\n")
        for event, count in event_counts.head(10).items():
            f.write(f"  {event}: {count:,}개\n")
    print(f"✅ 요약 통계가 {summary_filename}에 저장되었습니다.")