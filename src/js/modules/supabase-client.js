// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 환경 변수가 없을 때 에러 메시지 (프로덕션에서는 Vercel이 제공)
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not found. Using fallback values for development.');
}

// 개발 환경용 폴백 값
const url = supabaseUrl || 'https://nuzpotnrvwwysrwnqlyx.supabase.co';
const key = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51enBvdG5ydnd3eXNyd25xbHl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTQ5OTAsImV4cCI6MjA2ODgzMDk5MH0.E89y_hPtddgc1BGBreZqjfXhw4gyl3QGexA-I0e6KW0';

// Initialize Supabase client
export const supabase = createClient(url, key, {
  auth: {
    persistSession: false // 익명 사용이므로 세션 유지 불필요
  }
});

// Counter API functions
export const CounterAPI = {
  // 카운터 값 가져오기
  async getCount() {
    try {
      const { data, error } = await supabase
        .from('counters')
        .select('value')
        .eq('name', 'visitors')
        .single();
        
      if (error) throw error;
      return data?.value || 0;
    } catch (error) {
      console.error('Error fetching counter:', error);
      return 0;
    }
  },
  
  // 카운터 증가
  async increment() {
    try {
      // Supabase RPC function 호출 (atomic increment)
      const { data, error } = await supabase
        .rpc('increment_counter', { counter_name: 'visitors' });
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error incrementing counter:', error);
      return null;
    }
  }
};

// Analytics API functions
export const AnalyticsAPI = {
  // 이벤트 전송
  async trackEvent(eventData) {
    try {
      const { data, error } = await supabase
        .from('raw_events')
        .insert([eventData]);
        
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error tracking event:', error);
      return { success: false, error };
    }
  },
  
  // 배치 이벤트 전송
  async trackBatchEvents(events) {
    try {
      const { data, error } = await supabase
        .from('raw_events')
        .insert(events);
        
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error tracking batch events:', error);
      return { success: false, error };
    }
  }
};

// Utility functions
export const SupabaseUtils = {
  // 연결 상태 확인
  async checkConnection() {
    try {
      const { data, error } = await supabase
        .from('counters')
        .select('name')
        .limit(1);
        
      return !error;
    } catch {
      return false;
    }
  },
  
  // 타임스탬프 포맷
  formatTimestamp(date = new Date()) {
    return date.toISOString();
  }
};