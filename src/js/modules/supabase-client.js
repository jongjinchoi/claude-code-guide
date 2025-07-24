// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 환경 변수 검증
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are required. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
  // Supabase 기능을 비활성화하고 Google Apps Script로 폴백
  console.warn('Falling back to Google Apps Script for analytics.');
}

// Initialize Supabase client only if environment variables are present
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false // 익명 사용이므로 세션 유지 불필요
      }
    })
  : null;

// Counter API functions
export const CounterAPI = {
  // 카운터 값 가져오기
  async getCount() {
    if (!supabase) {
      console.warn('Supabase not initialized. Counter functionality disabled.');
      return 0;
    }
    
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
    if (!supabase) {
      console.warn('Supabase not initialized. Counter increment disabled.');
      return null;
    }
    
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
    if (!supabase) {
      console.warn('Supabase not initialized. Event tracking disabled.');
      return { success: false, error: 'Supabase not initialized' };
    }
    
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
    if (!supabase) {
      console.warn('Supabase not initialized. Batch event tracking disabled.');
      return { success: false, error: 'Supabase not initialized' };
    }
    
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