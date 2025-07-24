// Google Analytics 4 Integration
import { BatchAnalytics } from './batch-analytics.js';
import { CacheManager } from './cache-manager.js';
import { AnalyticsAPI } from './supabase-client.js';
import { SessionManager } from './session-manager.js';

export const Analytics = {
    // GA4 측정 ID
    GA_MEASUREMENT_ID: 'G-2XGK1CF366',
    
    // Google Apps Script 엔드포인트 (백업용)
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwkzkgowI4NVmszGF_bEtkxf82f1M8fRoMn2GYHSua6UT5Ead0vPdhUHFglZJ0S4jZu-A/exec',
    
    // Supabase 사용 여부
    USE_SUPABASE: true,
    
    // 배치 분석 시스템
    batchAnalytics: null,
    
    // Google Analytics에서 수집할 이벤트 목록
    GA_EVENTS_TO_SHEETS: [
        'page_view',
        'scroll_depth',
        'cta_click',
        'outbound_click',
        'button_click',    // 버튼 추적 데이터
        'code_copy'        // 코드 복사 추적 데이터
    ],
    
    // 세션 ID (탭마다 고유)
    sessionId: null,
    
    // 신규 사용자 여부 (세션 단위)
    isNewUserSession: null,
    
    // 초기화
    init() {
        // 배치 분석 시스템 초기화
        this.batchAnalytics = new BatchAnalytics(this.APPS_SCRIPT_URL, {
            batchSize: 10,
            batchInterval: 5000,  // 5초
            maxQueueSize: 50,
            useSupabase: this.USE_SUPABASE
        });
        
        // 세션 ID 가져오기 (SessionManager 사용)
        this.sessionId = SessionManager.getSessionId();
        
        // 페이지 로드 시간 기록
        this.pageLoadTime = Date.now();
        
        // GA4 스크립트 동적 로드
        this.loadGoogleAnalytics();
        
        // 페이지뷰 추적
        this.trackPageView();
        
        // 커스텀 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 세션 시간 추적 시작
        this.trackSessionTime();
        
        // Duration 추적 설정
        this.setupDurationTracking();
        
        // 온라인 상태 모니터링 및 실패한 이벤트 재전송
        this.setupOnlineStatusMonitoring();
    },
    
    // Duration 추적 설정
    setupDurationTracking() {
        // 페이지 이탈 시 체류 시간 기록
        window.addEventListener('beforeunload', () => {
            const duration = Math.round((Date.now() - this.pageLoadTime) / 1000); // 초 단위
            
            // beacon API를 사용하여 확실히 전송
            const data = {
                eventType: 'page_exit',
                userId: this.getUserId(),
                sessionId: this.sessionId,
                duration: duration,
                pageUrl: window.location.href,
                timestamp: new Date().toISOString()
            };
            
            const params = new URLSearchParams(data);
            const url = `${this.APPS_SCRIPT_URL}?${params.toString()}`;
            
            // beacon API 사용 (브라우저 종료 시에도 전송 보장)
            if (navigator.sendBeacon) {
                navigator.sendBeacon(url);
            } else {
                // fallback: 동기 요청
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                xhr.send();
            }
        });
    },
    
    // Google Analytics 스크립트 로드
    loadGoogleAnalytics() {
        // gtag 스크립트 추가
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${this.GA_MEASUREMENT_ID}`;
        document.head.appendChild(script);
        
        // gtag 초기화
        window.dataLayer = window.dataLayer || [];
        window.gtag = function() {
            window.dataLayer.push(arguments);
        };
        window.gtag('js', new Date());
        window.gtag('config', this.GA_MEASUREMENT_ID, {
            // 개인정보 보호 설정
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
        });
    },
    
    // 페이지뷰 추적
    trackPageView() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_view', {
                page_title: document.title,
                page_location: window.location.href,
                page_path: window.location.pathname
            });
        }
        
        // Google Sheets에도 페이지뷰 기록
        this.sendToGoogleSheets('page_view', {
            page_title: document.title,
            page_path: window.location.pathname
        });
    },
    
    // 이벤트 추적
    trackEvent(eventName, parameters = {}) {
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, parameters);
        }
        
        // Supabase/Google Sheets로 전송할 이벤트 판단
        if (this.shouldSendToBackend(eventName)) {
            // 배치 시스템을 통해 전송
            if (this.batchAnalytics) {
                this.batchAnalytics.addEvent(eventName, parameters);
            } else {
                // 폴백: 직접 전송
                this.sendToGoogleSheets(eventName, parameters);
            }
        }
    },
    
    // 백엔드(Supabase/Google Sheets)로 전송할 이벤트 판단
    shouldSendToBackend(eventName) {
        // GA_EVENTS_TO_SHEETS와 중요 이벤트를 모두 포함
        const allBackendEvents = [
            // GA_EVENTS_TO_SHEETS 배열의 이벤트들
            ...this.GA_EVENTS_TO_SHEETS,
            // 추가 중요 이벤트들
            'guide_started',
            'guide_completed',
            'step_completed',
            'error_occurred',
            'feedback_submitted',
            'session_end',
            'page_exit'
        ];
        
        // 중복 제거
        const uniqueEvents = [...new Set(allBackendEvents)];
        return uniqueEvents.includes(eventName);
    },
    
    // 중요 이벤트 판단 (레거시 호환성을 위해 유지)
    isImportantEvent(eventName) {
        const importantEvents = [
            'guide_started',
            'guide_completed',
            'step_completed',
            'error_occurred',
            'feedback_submitted'
        ];
        return importantEvents.includes(eventName);
    },
    
    // Google Sheets로 데이터 전송 (Supabase로 마이그레이션)
    async sendToGoogleSheets(eventName, parameters) {
        // 실제 프로덕션 사이트가 아니면 전송하지 않음
        const hostname = window.location.hostname;
        const isProduction = hostname === 'getclaudecode.com';
        const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
        
        // 프로덕션이 아니면 로그만 출력하고 전송하지 않음
        if (!isProduction) {
            console.log(`[Analytics ${isLocalDev ? 'Local' : 'Preview'}] Event:`, eventName, parameters);
            return;
        }
        
        // 일반 이벤트의 경우 기존 방식대로 처리
        const userId = this.getUserId();
        
        const data = {
            eventType: eventName,
            userId: userId,
            sessionId: this.sessionId,
            ...parameters,
            timestamp: new Date().toISOString(),
            pageUrl: window.location.href,
            page_path: window.location.pathname,
            pageTitle: document.title,
            os: this.getOS(),
            browser: this.getBrowser(),
            device: this.getDevice(),
            referrer: this.getReferrer()
        };
        
        // Supabase로 전송 시도
        if (this.USE_SUPABASE) {
            try {
                // Supabase 형식에 맞게 데이터 변환
                const supabaseData = this.convertToSupabaseFormat(eventName, data);
                const result = await this.trackEventWithRetry(supabaseData, eventName);
                
                if (!result.success) {
                    throw new Error('Supabase tracking failed after retries');
                }
            } catch (error) {
                console.error('Supabase error, falling back to Google Sheets:', error);
                // 폴백: Google Apps Script로 전송
                this.sendToGoogleSheetsLegacy(data);
            }
        } else {
            // Google Apps Script로 직접 전송
            this.sendToGoogleSheetsLegacy(data);
        }
    },
    
    // 재시도 메커니즘을 포함한 이벤트 전송
    async trackEventWithRetry(eventData, eventName, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const result = await AnalyticsAPI.trackEvent(eventData);
                if (result.success) {
                    console.log(`Event sent to Supabase (attempt ${i + 1}):`, eventName);
                    return result;
                }
            } catch (error) {
                console.warn(`Supabase attempt ${i + 1} failed:`, error);
            }
            
            // 마지막 시도가 아닌 경우 지수 백오프로 대기
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
        
        // 모든 재시도 실패 시 로컬에 저장
        this.saveToFailedQueue(eventData);
        return { success: false, error: 'All retries failed' };
    },
    
    // 실패한 이벤트를 로컬 스토리지에 저장
    saveToFailedQueue(event) {
        try {
            const failedEvents = JSON.parse(localStorage.getItem('failed_supabase_events') || '[]');
            // 최대 100개까지만 저장 (메모리 제한)
            if (failedEvents.length >= 100) {
                failedEvents.shift(); // 가장 오래된 이벤트 제거
            }
            failedEvents.push({
                ...event,
                failed_at: new Date().toISOString(),
                retry_count: 0
            });
            localStorage.setItem('failed_supabase_events', JSON.stringify(failedEvents));
            console.log('Event saved to failed queue:', event.event_name);
        } catch (error) {
            console.error('Failed to save event to local storage:', error);
        }
    },
    
    // 레거시 Google Sheets 전송 메서드
    sendToGoogleSheetsLegacy(data) {
        fetch(this.APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(() => console.log('Event sent to Google Sheets:', data.eventType))
        .catch(err => console.error('Failed to send to Google Sheets:', err));
    },
    
    // Supabase 형식으로 데이터 변환
    convertToSupabaseFormat(eventName, data) {
        // 세션 단위로 일관된 신규 사용자 여부 사용
        const isNewUser = this.isNewUserSession || false;
        
        const supabaseData = {
            timestamp: data.timestamp,
            event_category: this.extractEventCategory(eventName),
            event_name: eventName,
            user_id: data.userId,
            session_id: data.sessionId,
            is_new_user: isNewUser,
            page_path: data.page_path,
            referrer_source: this.extractReferrerSource(data.referrer),
            referrer_medium: this.extractReferrerMedium(data.referrer),
            guide_step_number: data.step_number || null,
            guide_step_name: data.step_name || null,
            guide_progress: data.progress || null,
            time_on_step: data.time_on_step || null,
            action_type: data.button_purpose || data.button_type || null,
            action_target: data.button_text || data.button_id || data.button_location || null,
            action_value: data.button_category || data.code_category || null,
            interaction_count: 1,
            device_category: data.device,
            os: data.os,
            browser: data.browser,
            is_success: data.error_type ? false : true,
            error_type: data.error_type || null,
            error_message: data.error_message || null,
            feedback_score: data.emoji ? this.emojiToScore(data.emoji) : null,
            feedback_text: data.feedback || null,
            total_time_minutes: data.completion_time_minutes || data.total_duration || null
        };
        
        return this.validateSupabaseData(supabaseData);
    },
    
    // Supabase 데이터 검증 및 정리
    validateSupabaseData(data) {
        // 필수 필드 확인 및 기본값 설정
        data.timestamp = data.timestamp || new Date().toISOString();
        data.guide_progress = data.guide_progress === undefined ? null : 
                             (data.guide_progress === null ? null : Number(data.guide_progress));
        data.interaction_count = 1;
        
        // 문자열 길이 제한 (PostgreSQL VARCHAR 제한 고려)
        const stringFields = [
            { field: 'event_category', maxLength: 50 },
            { field: 'event_name', maxLength: 100 },
            { field: 'user_id', maxLength: 50 },
            { field: 'session_id', maxLength: 50 },
            { field: 'page_path', maxLength: 255 },
            { field: 'referrer_source', maxLength: 100 },
            { field: 'referrer_medium', maxLength: 50 },
            { field: 'guide_step_name', maxLength: 100 },
            { field: 'action_type', maxLength: 50 },
            { field: 'action_target', maxLength: 255 },
            { field: 'action_value', maxLength: 100 },
            { field: 'device_category', maxLength: 50 },
            { field: 'os', maxLength: 50 },
            { field: 'browser', maxLength: 50 },
            { field: 'error_type', maxLength: 100 },
            { field: 'error_message', maxLength: 255 },
            { field: 'feedback_text', maxLength: 1000 }
        ];
        
        stringFields.forEach(({ field, maxLength }) => {
            if (data[field] && typeof data[field] === 'string' && data[field].length > maxLength) {
                data[field] = data[field].substring(0, maxLength);
            }
        });
        
        // 숫자 필드 검증
        if (data.guide_step_number !== null && data.guide_step_number !== undefined) {
            data.guide_step_number = parseInt(data.guide_step_number) || null;
        }
        if (data.time_on_step !== null && data.time_on_step !== undefined) {
            data.time_on_step = parseInt(data.time_on_step) || null;
        }
        if (data.feedback_score !== null && data.feedback_score !== undefined) {
            data.feedback_score = parseInt(data.feedback_score) || null;
        }
        if (data.total_time_minutes !== null && data.total_time_minutes !== undefined) {
            data.total_time_minutes = parseFloat(data.total_time_minutes) || null;
        }
        
        // Boolean 필드 확인
        data.is_new_user = Boolean(data.is_new_user);
        data.is_success = Boolean(data.is_success);
        
        return data;
    },
    
    // 이벤트 카테고리 추출
    extractEventCategory(eventType) {
        if (eventType.includes('guide')) return 'guide';
        if (eventType.includes('page')) return 'page';
        if (eventType.includes('error')) return 'error';
        if (eventType.includes('feedback')) return 'feedback';
        if (eventType.includes('session')) return 'session';
        if (['cta_click', 'button_click', 'code_copy', 'scroll_depth', 'outbound_click'].includes(eventType)) return 'interaction';
        return 'other';
    },
    
    // Referrer 소스 추출
    extractReferrerSource(referrer) {
        if (!referrer || referrer === 'Direct') return 'direct';
        try {
            const url = new URL(referrer);
            const hostname = url.hostname.toLowerCase();
            if (hostname.includes('google')) return 'google';
            if (hostname.includes('facebook')) return 'facebook';
            if (hostname.includes('twitter')) return 'twitter';
            if (hostname.includes('github')) return 'github';
            return hostname;
        } catch {
            return 'other';
        }
    },
    
    // Referrer 매체 추출
    extractReferrerMedium(referrer) {
        if (!referrer || referrer === 'Direct') return 'none';
        try {
            const url = new URL(referrer);
            const hostname = url.hostname.toLowerCase();
            if (hostname.includes('google')) return 'organic';
            if (hostname.includes('facebook') || hostname.includes('twitter') || hostname.includes('linkedin')) return 'social';
            if (hostname.includes('github')) return 'referral';
            return 'referral';
        } catch {
            return 'unknown';
        }
    },
    
    // 이모지를 점수로 변환
    emojiToScore(emoji) {
        // UI에 실제로 있는 4개 옵션만 처리
        const textScores = { 
            'love': 5,      // 😍 최고예요
            'good': 4,      // 😊 좋아요
            'neutral': 3,   // 😐 보통이에요
            'sad': 2        // 😕 아쉬워요
        };
        
        return textScores[emoji] || null;
    },
    
    // 사용자 ID 관리
    getUserId() {
        let userId = localStorage.getItem('claude_guide_user_id');
        if (!userId) {
            // 신규 사용자인 경우
            if (this.isNewUserSession === null) {
                this.isNewUserSession = true;
                sessionStorage.setItem('is_new_user_session', 'true');
            }
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 15);
            const browserFingerprint = this.generateFingerprint();
            userId = `user_${timestamp}_${random}_${browserFingerprint}`;
            localStorage.setItem('claude_guide_user_id', userId);
        } else {
            // 기존 사용자인 경우
            if (this.isNewUserSession === null) {
                this.isNewUserSession = sessionStorage.getItem('is_new_user_session') === 'true';
            }
        }
        return userId;
    },
    
    // 브라우저 핑거프린트 생성 (고유성 높이기)
    generateFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            new Date().getTimezoneOffset(),
            screen.width + 'x' + screen.height,
            screen.colorDepth
        ];
        
        // 간단한 해시 함수
        let hash = 0;
        const str = components.join('|');
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36).substring(0, 8);
    },
    
    // OS 감지
    getOS() {
        const userAgent = navigator.userAgent;
        if (userAgent.indexOf("Win") !== -1) return "Windows";
        if (userAgent.indexOf("Mac") !== -1) return "MacOS";
        if (userAgent.indexOf("Linux") !== -1) return "Linux";
        if (userAgent.indexOf("Android") !== -1) return "Android";
        if (userAgent.indexOf("iPhone") !== -1 || userAgent.indexOf("iPad") !== -1) return "iOS";
        return "Unknown";
    },
    
    // 브라우저 감지
    getBrowser() {
        const userAgent = navigator.userAgent;
        if (userAgent.indexOf("Chrome") !== -1) return "Chrome";
        if (userAgent.indexOf("Safari") !== -1 && userAgent.indexOf("Chrome") === -1) return "Safari";
        if (userAgent.indexOf("Firefox") !== -1) return "Firefox";
        if (userAgent.indexOf("Edge") !== -1) return "Edge";
        return "Unknown";
    },
    
    // 디바이스 감지
    getDevice() {
        const userAgent = navigator.userAgent;
        
        // 모바일 기기 검사
        if (/iPhone|iPad|iPod/.test(userAgent)) return "Mobile";
        if (/Android/.test(userAgent)) {
            if (/Mobile/.test(userAgent)) return "Mobile";
            return "Tablet";
        }
        if (/Tablet|iPad/.test(userAgent)) return "Tablet";
        
        // 화면 크기 기반 감지
        if (window.innerWidth < 768) return "Mobile";
        if (window.innerWidth < 1024) return "Tablet";
        
        return "Desktop";
    },
    
    // Referrer 정보 가져오기
    getReferrer() {
        return document.referrer || "Direct";
    },
    
    // 이벤트 리스너 설정
    setupEventListeners() {
        // CTA 버튼 클릭 추적
        document.querySelectorAll('.cta-button, .cta-btn, .btn-primary, .btn-hero, .btn-hero-primary, .btn-hero-secondary').forEach(btn => {
            btn.addEventListener('click', () => {
                // 버튼 클릭 이벤트를 button_click으로 통일하고 카테고리로 분류
                this.trackEvent('button_click', {
                    button_category: 'cta',
                    button_purpose: 'start_guide',
                    button_text: btn.textContent.trim().replace(/\s+/g, ' '),
                    button_location: btn.closest('section')?.className || 'unknown',
                    button_type: btn.classList.contains('btn-hero-primary') ? 'primary' : 'secondary',
                    is_useful: true,
                    page_path: window.location.pathname
                });
                
                // 기존 cta_click 이벤트도 호환성을 위해 유지
                this.trackEvent('cta_click', {
                    button_text: btn.textContent.trim().replace(/\s+/g, ' '),
                    button_location: btn.closest('section')?.className || 'unknown'
                });
            });
        });
        
        // 외부 링크 클릭 추적
        document.querySelectorAll('a[href^="http"]').forEach(link => {
            link.addEventListener('click', () => {
                this.trackEvent('outbound_click', {
                    link_url: link.href,
                    link_text: link.textContent
                });
            });
        });
        
        // 버튼 종류별 클릭 추적
        document.querySelectorAll('button, .btn, [role="button"]').forEach(btn => {
            // CTA 버튼은 이미 추적되므로 제외
            if (!btn.classList.contains('cta-button') && !btn.classList.contains('cta-btn') && 
                !btn.classList.contains('btn-primary') && !btn.classList.contains('btn-hero') &&
                !btn.classList.contains('btn-hero-primary') && !btn.classList.contains('btn-hero-secondary')) {
                
                btn.addEventListener('click', (e) => {
                    // result-btn은 guide-manager.js에서 처리하므로 제외
                    if (btn.classList.contains('result-btn')) {
                        return;
                    }
                    
                    // 버튼 종류 분류 - 사용자 가치 중심으로 분류
                    let buttonCategory = 'other';
                    let buttonPurpose = 'unknown';
                    let isUseful = false; // 핵심 기능인지 여부
                    
                    if (btn.classList.contains('copy-btn')) {
                        // 코드 복사 버튼은 별도로 처리됨
                        return;
                    } else if (btn.classList.contains('complete-step-btn')) {
                        buttonCategory = 'guide_progress';
                        buttonPurpose = 'mark_step_complete';
                        isUseful = true; // 가이드 진행의 핵심
                    } else if (btn.classList.contains('os-toggle')) {
                        buttonCategory = 'personalization';
                        buttonPurpose = 'switch_os_instructions';
                        isUseful = true; // OS별 명령어 보기
                    } else if (btn.classList.contains('theme-toggle')) {
                        buttonCategory = 'personalization';
                        buttonPurpose = 'toggle_dark_mode';
                        isUseful = false; // 부가 기능
                    } else if (btn.classList.contains('font-size-btn')) {
                        buttonCategory = 'accessibility';
                        buttonPurpose = btn.id === 'increaseFont' ? 'increase_font' : 'decrease_font';
                        isUseful = true; // 접근성 향상
                    } else if (btn.classList.contains('nav-hamburger')) {
                        buttonCategory = 'navigation';
                        buttonPurpose = 'open_mobile_menu';
                        isUseful = false; // 모바일에서만 필요
                    } else if (btn.classList.contains('mobile-menu-close')) {
                        buttonCategory = 'navigation';
                        buttonPurpose = 'close_mobile_menu';
                        isUseful = false;
                    } else if (btn.classList.contains('faq-question')) {
                        buttonCategory = 'content_discovery';
                        buttonPurpose = 'expand_faq';
                        isUseful = true; // 정보 탐색
                    }
                    
                    // 현재 상태 추가 (예: 다크모드 on/off)
                    let currentState = '';
                    if (buttonPurpose === 'toggle_dark_mode') {
                        currentState = document.documentElement.dataset.theme === 'dark' ? 'to_light' : 'to_dark';
                    } else if (buttonPurpose === 'switch_os_instructions') {
                        currentState = document.querySelector('.guide-content')?.dataset.os || 'unknown';
                    }
                    
                    this.trackEvent('button_click', {
                        button_category: buttonCategory,
                        button_purpose: buttonPurpose,
                        is_useful: isUseful,
                        current_state: currentState,
                        button_text: btn.textContent.trim().replace(/\s+/g, ' ').substring(0, 50),
                        button_id: btn.id || '',
                        page_path: window.location.pathname,
                        user_context: this.getUserContext() // 사용자가 어떤 상황에서 클릭했는지
                    });
                });
            }
        });
        
        // 스크롤 깊이 추적
        this.trackScrollDepth();
    },
    
    // 스크롤 깊이 추적
    trackScrollDepth() {
        let maxScroll = 0;
        const thresholds = [25, 50, 75, 90, 100];
        const trackedThresholds = new Set();
        
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round(
                (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100
            );
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                
                thresholds.forEach(threshold => {
                    if (scrollPercent >= threshold && !trackedThresholds.has(threshold)) {
                        trackedThresholds.add(threshold);
                        this.trackEvent('scroll_depth', {
                            percent: threshold,
                            page: window.location.pathname
                        });
                    }
                });
            }
        });
    },
    
    // 가이드 관련 이벤트 추적
    trackGuideEvent(action, label, value = null) {
        const parameters = {
            event_category: 'guide',
            event_action: action,
            event_label: label
        };
        
        if (value !== null) {
            parameters.value = value;
        }
        
        this.trackEvent('guide_interaction', parameters);
    },
    
    // 에러 추적
    trackError(errorMessage, errorSource) {
        this.trackEvent('error', {
            error_message: errorMessage,
            error_source: errorSource,
            page: window.location.pathname
        });
    },
    
    // 사용자 컨텍스트 파악
    getUserContext() {
        const context = {
            // 가이드 페이지에서의 진행 상황
            guide_progress: 'not_in_guide',
            // 페이지 체류 시간
            time_on_page: Math.round((Date.now() - this.pageLoadTime) / 1000),
            // 스크롤 위치
            scroll_position: Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100),
            // 디바이스 타입
            device_type: window.innerWidth <= 768 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop'
        };
        
        // 가이드 페이지인 경우
        if (window.location.pathname.includes('guide')) {
            const currentStep = document.querySelector('.guide-step.active');
            if (currentStep) {
                context.guide_progress = currentStep.dataset.step || 'unknown';
                context.guide_step_id = currentStep.id || 'unknown';
            }
            
            // 완료한 단계 수
            const completedSteps = document.querySelectorAll('.guide-step.completed').length;
            context.completed_steps = completedSteps;
        }
        
        return context;
    },
    
    // 세션 시간 추적
    trackSessionTime() {
        const startTime = Date.now();
        
        window.addEventListener('beforeunload', () => {
            const sessionDuration = Math.round((Date.now() - startTime) / 1000);
            
            // Beacon API 사용하여 페이지 떠날 때도 전송 보장
            if (navigator.sendBeacon) {
                const data = new FormData();
                data.append('eventType', 'session_end');
                data.append('userId', this.getUserId());
                data.append('sessionId', this.sessionId);
                data.append('duration', sessionDuration);
                data.append('pageUrl', window.location.href);
                data.append('timestamp', new Date().toISOString());
                
                navigator.sendBeacon(this.APPS_SCRIPT_URL, data);
            }
        });
    },
    
    // 온라인 상태 모니터링 설정
    setupOnlineStatusMonitoring() {
        // 온라인 복귀 시 실패한 이벤트 재전송
        window.addEventListener('online', () => {
            console.log('Network connection restored, retrying failed events...');
            this.retryFailedEvents();
        });
        
        // 페이지 로드 시 실패한 이벤트가 있다면 재시도
        if (navigator.onLine) {
            setTimeout(() => this.retryFailedEvents(), 5000); // 5초 후 재시도
        }
    },
    
    // 실패한 이벤트 재전송
    async retryFailedEvents() {
        if (!this.USE_SUPABASE) return;
        
        try {
            const failedEvents = JSON.parse(localStorage.getItem('failed_supabase_events') || '[]');
            if (failedEvents.length === 0) return;
            
            console.log(`Retrying ${failedEvents.length} failed events...`);
            const retryResults = [];
            
            // 배치로 재전송 (최대 10개씩)
            const batchSize = 10;
            for (let i = 0; i < failedEvents.length; i += batchSize) {
                const batch = failedEvents.slice(i, i + batchSize);
                
                for (const failedEvent of batch) {
                    try {
                        // retry_count 증가
                        failedEvent.retry_count = (failedEvent.retry_count || 0) + 1;
                        
                        // 최대 재시도 횟수 초과 시 스킵
                        if (failedEvent.retry_count > 5) {
                            console.log('Max retries exceeded for event:', failedEvent.event_name);
                            continue;
                        }
                        
                        // failed_at과 retry_count 제거하고 전송
                        const { failed_at, retry_count, ...eventData } = failedEvent;
                        
                        const result = await AnalyticsAPI.trackEvent(eventData);
                        if (result.success) {
                            retryResults.push({ success: true, event: failedEvent });
                        } else {
                            retryResults.push({ success: false, event: failedEvent });
                        }
                    } catch (error) {
                        console.error('Failed to retry event:', error);
                        retryResults.push({ success: false, event: failedEvent });
                    }
                    
                    // 각 요청 사이에 짧은 대기
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            // 성공한 이벤트 제거, 실패한 이벤트는 유지
            const remainingFailedEvents = failedEvents.filter((event, index) => {
                const result = retryResults.find(r => r.event === event);
                return !result || !result.success;
            });
            
            // 업데이트된 실패 큐 저장
            localStorage.setItem('failed_supabase_events', JSON.stringify(remainingFailedEvents));
            
            const successCount = retryResults.filter(r => r.success).length;
            console.log(`Retry complete: ${successCount}/${failedEvents.length} events sent successfully`);
            
        } catch (error) {
            console.error('Error retrying failed events:', error);
        }
    }
};

// Export to window for debugging (development only)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    window.Analytics = Analytics;
    console.log('🔍 Analytics module exposed to window for debugging');
}