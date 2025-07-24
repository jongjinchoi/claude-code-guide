#!/usr/bin/env python3
"""
Supabase raw_events 테이블 분석 스크립트
"""

import pandas as pd
import os
from datetime import datetime, timedelta
from supabase import create_client, Client

# 환경 변수 설정
supabase_url = 'https://nuzpotnrvwwysrwnqlyx.supabase.co'
supabase_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51enBvdG5ydnd3eXNyd25xbHl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTQ5OTAsImV4cCI6MjA2ODgzMDk5MH0.E89y_hPtddgc1BGBreZqjfXhw4gyl3QGexA-I0e6KW0'

# Supabase 클라이언트 생성
supabase: Client = create_client(supabase_url, supabase_key)

print("📊 Supabase raw_events 데이터 분석 시작...")

# 데이터 가져오기
try:
    # 최근 1000개 가져오기 (더 많이 필요하면 조정)
    response = supabase.table('raw_events').select("*").order('timestamp', desc=True).limit(1000).execute()
    data = response.data
    
    if not data:
        print("❌ 데이터가 없습니다.")
        exit(1)
    
    # DataFrame으로 변환
    df = pd.DataFrame(data)
    print(f"✅ 총 {len(df)}개 이벤트 로드 완료")
    
    # 타임스탬프 변환
    df['timestamp'] = pd.to_datetime(df['timestamp'], format='ISO8601')
    
    # 기본 통계
    print("\n📈 기본 통계:")
    print(f"- 총 이벤트 수: {len(df)}")
    print(f"- 고유 사용자 수: {df['user_id'].nunique()}")
    print(f"- 기간: {df['timestamp'].min()} ~ {df['timestamp'].max()}")
    
    # 이벤트 타입별 분석
    print("\n🎯 이벤트 타입별 분포:")
    event_counts = df['event_name'].value_counts()
    for event, count in event_counts.head(10).items():
        print(f"  {event}: {count}개 ({count/len(df)*100:.1f}%)")
    
    # 일별 이벤트 추이
    df['date'] = df['timestamp'].dt.date
    daily_events = df.groupby('date').size()
    
    print("\n📅 일별 이벤트 수:")
    for date, count in daily_events.tail(7).items():
        print(f"  {date}: {count}개")
    
    # 가이드 완료율 분석
    guide_started = df[df['event_name'] == 'guide_started']['user_id'].nunique()
    guide_completed = df[df['event_name'] == 'guide_completed']['user_id'].nunique()
    
    if guide_started > 0:
        completion_rate = (guide_completed / guide_started) * 100
        print(f"\n🎓 가이드 완료율:")
        print(f"  시작: {guide_started}명")
        print(f"  완료: {guide_completed}명")
        print(f"  완료율: {completion_rate:.1f}%")
    
    # 디바이스 분석
    print("\n📱 디바이스 분포:")
    device_counts = df['device_category'].value_counts()
    for device, count in device_counts.items():
        if pd.notna(device):
            print(f"  {device}: {count}개 ({count/len(df)*100:.1f}%)")
    
    # 브라우저 분석
    print("\n🌐 브라우저 분포:")
    browser_counts = df['browser'].value_counts()
    for browser, count in browser_counts.head(5).items():
        if pd.notna(browser):
            print(f"  {browser}: {count}개 ({count/len(df)*100:.1f}%)")
    
    # 페이지별 조회수
    print("\n📄 페이지별 조회수:")
    page_views = df[df['event_name'] == 'page_view']['page_path'].value_counts()
    for page, count in page_views.items():
        if pd.notna(page):
            print(f"  {page}: {count}회")
    
    # 에러 분석
    errors = df[df['is_success'] == False]
    if len(errors) > 0:
        print(f"\n⚠️ 에러 발생: {len(errors)}건")
        error_types = errors['error_type'].value_counts()
        for error_type, count in error_types.items():
            if pd.notna(error_type):
                print(f"  {error_type}: {count}건")
    
    # CSV로 저장 (선택사항)
    save_csv = input("\n💾 분석 결과를 CSV로 저장하시겠습니까? (y/n): ")
    if save_csv.lower() == 'y':
        filename = f"supabase_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        df.to_csv(filename, index=False)
        print(f"✅ {filename}에 저장되었습니다.")
    
except Exception as e:
    print(f"❌ 오류 발생: {e}")