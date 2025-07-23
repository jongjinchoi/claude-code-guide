# Supabase Setup Guide for Claude Code Guide

## Overview
이 가이드는 Claude Code Guide의 분석 시스템을 Google Sheets에서 Supabase로 마이그레이션하는 방법을 설명합니다.

## 1. Supabase 프로젝트 정보
- **Project URL**: https://nuzpotnrvwwysrwnqlyx.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51enBvdG5ydnd3eXNyd25xbHl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTQ5OTAsImV4cCI6MjA2ODgzMDk5MH0.E89y_hPtddgc1BGBreZqjfXhw4gyl3QGexA-I0e6KW0

## 2. 데이터베이스 설정

### 2.1 SQL Editor에서 실행
1. Supabase Dashboard에 로그인
2. SQL Editor로 이동
3. `supabase-setup.sql` 파일의 내용을 복사하여 실행

### 2.2 생성되는 테이블
- **counters**: 방문자 카운터 관리
- **raw_events**: 모든 이벤트 데이터 저장

### 2.3 생성되는 함수
- **increment_counter**: 카운터를 원자적으로 증가

## 3. 환경 변수 설정

### 3.1 로컬 개발 (.env.local)
```env
VITE_SUPABASE_URL=https://nuzpotnrvwwysrwnqlyx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.2 프로덕션 (Vercel)
1. Vercel Dashboard > Settings > Environment Variables
2. 다음 변수 추가:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 4. 코드 통합

### 4.1 주요 모듈
- **supabase-client.js**: Supabase 클라이언트 및 API 함수
- **analytics.js**: Supabase 통합 (폴백 지원)
- **batch-analytics.js**: 배치 이벤트 처리
- **main.js**: 카운터 표시 및 증가

### 4.2 폴백 메커니즘
Supabase 연결 실패 시 자동으로 Google Apps Script로 폴백:
- 카운터 조회: Supabase → JSONP (Google Apps Script)
- 이벤트 전송: Supabase → Google Apps Script

## 5. 데이터 마이그레이션

### 5.1 카운터 초기값
SQL 실행 시 현재 카운터 값(502)으로 초기화됨

### 5.2 기존 이벤트 데이터
필요 시 Google Sheets에서 export하여 Supabase로 import 가능

## 6. 모니터링

### 6.1 Supabase Dashboard
- Table Editor: 실시간 데이터 확인
- SQL Editor: 쿼리 실행
- Logs: API 요청 로그

### 6.2 Views
- **daily_summary**: 일별 요약 통계
- **funnel_analysis**: 가이드 퍼널 분석

## 7. 장점

### 7.1 성능 개선
- 카운터 응답 시간: 92초 → <100ms
- 실시간 업데이트 가능
- 확장 가능한 아키텍처

### 7.2 기능 확장
- PostgreSQL의 강력한 쿼리 기능
- 실시간 구독 가능
- REST API 자동 생성

## 8. 주의사항

### 8.1 보안
- RLS(Row Level Security) 정책 적용
- 익명 사용자는 읽기/카운터 증가만 가능
- 이벤트 삽입은 허용, 수정/삭제 불가

### 8.2 비용
- 무료 플랜: 500MB 스토리지, 2GB 전송
- 현재 사용량으로는 무료 플랜으로 충분

## 9. 테스트

### 9.1 로컬 테스트
```bash
npm run dev
# http://localhost:5173 접속
# 콘솔에서 Supabase 연결 확인
```

### 9.2 프로덕션 테스트
- 카운터가 정상적으로 표시되는지 확인
- 이벤트가 Supabase에 기록되는지 확인

## 10. 문제 해결

### 10.1 CORS 에러
- Supabase는 CORS를 자동 처리
- 문제 발생 시 프로젝트 설정 확인

### 10.2 연결 실패
- 네트워크 연결 확인
- API 키 정확성 확인
- Supabase 프로젝트 상태 확인

## 11. 롤백 방법

### 11.1 Google Sheets로 복귀
```javascript
// analytics.js
USE_SUPABASE: false, // true → false 변경
```

### 11.2 하이브리드 운영
현재 설정은 Supabase 실패 시 자동으로 Google Sheets 사용

---

작성일: 2025년 1월 23일
작성자: Claude Assistant with Jongjin Choi