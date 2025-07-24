#!/usr/bin/env python3
"""
Supabase 피드백 데이터 상세 분석
"""

import pandas as pd
from datetime import datetime
from supabase import create_client, Client
import pytz

# Supabase 연결
supabase_url = 'https://nuzpotnrvwwysrwnqlyx.supabase.co'
supabase_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51enBvdG5ydnd3eXNyd25xbHl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTQ5OTAsImV4cCI6MjA2ODgzMDk5MH0.E89y_hPtddgc1BGBreZqjfXhw4gyl3QGexA-I0e6KW0'

supabase: Client = create_client(supabase_url, supabase_key)

print("📊 피드백 데이터 상세 분석...")

# 피드백 이벤트 가져오기
try:
    response = supabase.table('raw_events').select("*").eq('event_name', 'feedback_submitted').execute()
    feedback_data = response.data
    
    if not feedback_data:
        print("❌ 피드백 데이터가 없습니다.")
    else:
        print(f"✅ 총 {len(feedback_data)}개의 피드백 발견\n")
        
        # DataFrame 생성
        df = pd.DataFrame(feedback_data)
        
        # 각 피드백 상세 출력
        for idx, feedback in enumerate(feedback_data, 1):
            print(f"=== 피드백 #{idx} ===")
            print(f"📅 시간: {feedback.get('timestamp', 'N/A')}")
            print(f"👤 사용자: {feedback.get('user_id', 'N/A')}")
            print(f"📊 점수: {feedback.get('feedback_score', 'N/A')}")
            print(f"💬 텍스트: {feedback.get('feedback_text', 'N/A')}")
            print(f"📱 디바이스: {feedback.get('device_category', 'N/A')}")
            print(f"🌐 브라우저: {feedback.get('browser', 'N/A')}")
            print(f"🖥️ OS: {feedback.get('os', 'N/A')}")
            
            # action_value에 이모지가 있을 수 있음
            if feedback.get('action_value'):
                print(f"😊 이모지: {feedback.get('action_value')}")
            
            print()
    
    # 가이드 완료자 분석
    print("\n📈 가이드 완료자와 피드백 비교:")
    
    # 가이드 완료 이벤트 가져오기
    completed_response = supabase.table('raw_events').select("user_id, timestamp").eq('event_name', 'guide_completed').execute()
    completed_users = pd.DataFrame(completed_response.data)
    
    if not completed_users.empty:
        unique_completers = completed_users['user_id'].nunique()
        feedback_users = df['user_id'].unique() if not df.empty else []
        
        print(f"✅ 가이드 완료자: {unique_completers}명")
        print(f"💬 피드백 제출자: {len(feedback_users)}명")
        print(f"📊 피드백 비율: {len(feedback_users)/unique_completers*100:.1f}%")
        
        # 피드백을 제출한 완료자 확인
        if len(feedback_users) > 0:
            print("\n🔍 피드백 제출한 사용자:")
            for user in feedback_users:
                if user in completed_users['user_id'].values:
                    print(f"  ✅ {user} (가이드 완료자)")
                else:
                    print(f"  ❓ {user} (가이드 미완료)")
    
except Exception as e:
    print(f"❌ 오류 발생: {e}")