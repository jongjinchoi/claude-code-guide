// Google Analytics 4 Integration
export const Analytics = {
    // GA4 측정 ID
    GA_MEASUREMENT_ID: 'G-2XGK1CF366',
    
    // Google Apps Script 엔드포인트
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwkzkgowI4NVmszGF_bEtkxf82f1M8fRoMn2GYHSua6UT5Ead0vPdhUHFglZJ0S4jZu-A/exec',
    
    // Google Analytics에서 수집할 이벤트 목록
    GA_EVENTS_TO_SHEETS: [
        'page_view',
        'scroll_depth',
        'cta_click',
        'outbound_click'
    ],
    
    // 세션 ID (탭마다 고유)
    sessionId: null,
    
    // 초기화
    init() {
        // 세션 ID 생성
        this.sessionId = this.generateSessionId();
        
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
    },
    
    // 세션 ID 생성
    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `session_${timestamp}_${random}`;
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
        
        // Google Sheets에도 동시에 기록 (중요 이벤트만)
        if (this.isImportantEvent(eventName)) {
            this.sendToGoogleSheets(eventName, parameters);
        }
    },
    
    // 중요 이벤트 판단
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
    
    // Google Sheets로 데이터 전송
    sendToGoogleSheets(eventName, parameters) {
        // 실제 프로덕션 사이트가 아니면 전송하지 않음
        const hostname = window.location.hostname;
        const isProduction = hostname === 'claude-code-guide-sooty.vercel.app';
        const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
        
        // 프로덕션이 아니면 로그만 출력하고 전송하지 않음
        if (!isProduction) {
            console.log(`[Analytics ${isLocalDev ? 'Local' : 'Preview'}] Event:`, eventName, parameters);
            return;
        }
        
        // feedback_submitted 이벤트는 guide-manager에서 직접 처리하므로 여기서는 GA 트래킹만
        if (eventName === 'feedback_submitted') {
            console.log('Feedback tracking handled by guide-manager directly');
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
            pageTitle: document.title,  // Page_Title 추가
            os: this.getOS(),
            browser: this.getBrowser(),
            device: this.getDevice(),
            referrer: this.getReferrer()
        };
        
        // Apps Script 엔드포인트로 전송
        fetch(this.APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        }).catch(err => console.error('Failed to send to Google Sheets:', err));
    },
    
    // 사용자 ID 관리
    getUserId() {
        let userId = localStorage.getItem('claude_guide_user_id');
        if (!userId) {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 15);
            const browserFingerprint = this.generateFingerprint();
            userId = `user_${timestamp}_${random}_${browserFingerprint}`;
            localStorage.setItem('claude_guide_user_id', userId);
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
        document.querySelectorAll('.cta-btn, .btn-primary').forEach(btn => {
            btn.addEventListener('click', () => {
                this.trackEvent('cta_click', {
                    button_text: btn.textContent,
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
    }
};

// Export to window for debugging (development only)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    window.Analytics = Analytics;
    console.log('🔍 Analytics module exposed to window for debugging');
}