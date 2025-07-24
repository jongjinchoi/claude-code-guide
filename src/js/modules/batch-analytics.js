// Batch Analytics System for Google Sheets
// 여러 이벤트를 모아서 한 번에 전송하여 API 요청 수를 줄입니다

import { AnalyticsAPI } from './supabase-client.js';

export class BatchAnalytics {
    constructor(appsScriptUrl, options = {}) {
        this.appsScriptUrl = appsScriptUrl;
        this.queue = [];
        this.batchSize = options.batchSize || 10;
        this.batchInterval = options.batchInterval || 5000; // 5초
        this.maxQueueSize = options.maxQueueSize || 50;
        this.isProcessing = false;
        this.useSupabase = options.useSupabase !== false; // 기본값 true
        
        // 중요 이벤트는 즉시 전송
        this.highPriorityEvents = [
            'guide_completed',
            'feedback_submitted',
            'error_occurred'
        ];
        
        // 배치 프로세서 시작
        this.startBatchProcessor();
        
        // 페이지 종료 시 남은 이벤트 전송
        this.setupUnloadHandler();
    }
    
    // 이벤트 추가
    addEvent(eventName, parameters) {
        const event = {
            eventName,
            parameters,
            timestamp: new Date().toISOString(),
            userId: this.getUserId(),
            sessionId: this.getSessionId()
        };
        
        this.queue.push(event);
        
        // 중요 이벤트는 즉시 전송
        if (this.isHighPriority(eventName)) {
            this.flush();
        }
        // 큐가 가득 차면 즉시 전송
        else if (this.queue.length >= this.maxQueueSize) {
            this.flush();
        }
    }
    
    // 높은 우선순위 이벤트 확인
    isHighPriority(eventName) {
        return this.highPriorityEvents.includes(eventName);
    }
    
    // 배치 프로세서 시작
    startBatchProcessor() {
        this.batchTimer = setInterval(() => {
            if (this.queue.length > 0 && !this.isProcessing) {
                this.flush();
            }
        }, this.batchInterval);
    }
    
    // 큐에 있는 이벤트 전송
    async flush() {
        if (this.queue.length === 0 || this.isProcessing) return;
        
        this.isProcessing = true;
        
        // 배치 크기만큼 가져오기
        const batch = this.queue.splice(0, Math.min(this.batchSize, this.queue.length));
        
        try {
            await this.sendBatch(batch);
            console.log(`Batch sent: ${batch.length} events`);
        } catch (error) {
            console.error('Batch send failed:', error);
            // 실패한 이벤트는 다시 큐에 추가
            this.queue.unshift(...batch);
        } finally {
            this.isProcessing = false;
        }
    }
    
    // 배치 전송
    async sendBatch(batch) {
        // Supabase 사용 시
        if (this.useSupabase) {
            try {
                // Supabase 형식으로 변환
                const supabaseEvents = batch.map(event => this.convertToSupabaseFormat(event));
                const result = await AnalyticsAPI.trackBatchEvents(supabaseEvents);
                
                if (result.success) {
                    console.log('Batch sent to Supabase:', batch.length, 'events');
                    return true;
                } else {
                    throw new Error('Supabase batch tracking failed');
                }
            } catch (error) {
                console.error('Supabase batch error, falling back to Google Sheets:', error);
                // 폴백: Google Apps Script로 전송
                return await this.sendBatchLegacy(batch);
            }
        } else {
            // Google Apps Script로 직접 전송
            return await this.sendBatchLegacy(batch);
        }
    }
    
    // 레거시 Google Sheets 배치 전송
    async sendBatchLegacy(batch) {
        const payload = {
            batch: batch,
            batchId: this.generateBatchId(),
            source: 'batch-analytics'
        };
        
        const response = await fetch(this.appsScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        // no-cors 모드에서는 응답을 읽을 수 없으므로 성공으로 간주
        return true;
    }
    
    // Supabase 형식으로 변환
    convertToSupabaseFormat(event) {
        const { eventName, parameters, timestamp, userId, sessionId } = event;
        
        return {
            timestamp: timestamp,
            event_category: this.extractEventCategory(eventName),
            event_name: eventName,
            user_id: userId,
            session_id: sessionId,
            is_new_user: parameters.customData?.firstVisit || false,
            page_path: parameters.page_path || window.location.pathname,
            referrer_source: this.extractReferrerSource(parameters.referrer),
            referrer_medium: this.extractReferrerMedium(parameters.referrer),
            guide_step_number: parameters.step_number || null,
            guide_step_name: parameters.step_name || null,
            guide_progress: parameters.progress || null,
            time_on_step: parameters.time_on_step || null,
            action_type: parameters.button_purpose || parameters.button_type || null,
            action_target: parameters.button_text || parameters.button_id || null,
            action_value: parameters.button_category || parameters.code_category || null,
            interaction_count: 1,
            device_category: parameters.device || this.getDevice(),
            os: parameters.os || this.getOS(),
            browser: parameters.browser || this.getBrowser(),
            is_success: !parameters.error_type,
            error_type: parameters.error_type || null,
            error_message: parameters.error_message || null,
            feedback_score: parameters.emoji ? this.emojiToScore(parameters.emoji) : null,
            feedback_text: parameters.feedback || null,
            total_time_minutes: parameters.completion_time_minutes || null
        };
    }
    
    // 헬퍼 메서드들 추가
    extractEventCategory(eventType) {
        if (eventType.includes('guide')) return 'guide';
        if (eventType.includes('page')) return 'page';
        if (eventType.includes('error')) return 'error';
        if (eventType.includes('feedback')) return 'feedback';
        if (eventType.includes('session')) return 'session';
        if (['cta_click', 'button_click', 'code_copy', 'scroll_depth', 'outbound_click'].includes(eventType)) return 'interaction';
        return 'other';
    }
    
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
    }
    
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
    }
    
    emojiToScore(emoji) {
        // UI에 실제로 있는 4개 옵션만 처리
        const textScores = { 
            'love': 5,      // 😍 최고예요
            'good': 4,      // 😊 좋아요
            'neutral': 3,   // 😐 보통이에요
            'sad': 2        // 😕 아쉬워요
        };
        
        return textScores[emoji] || 0;
    }
    
    getDevice() {
        const userAgent = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'Tablet';
        if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'Mobile';
        return 'Desktop';
    }
    
    getOS() {
        const userAgent = navigator.userAgent;
        if (userAgent.indexOf('Win') !== -1) return 'Windows';
        if (userAgent.indexOf('Mac') !== -1) return 'MacOS';
        if (userAgent.indexOf('Linux') !== -1) return 'Linux';
        if (userAgent.indexOf('Android') !== -1) return 'Android';
        if (userAgent.indexOf('iOS') !== -1) return 'iOS';
        return 'Unknown';
    }
    
    getBrowser() {
        const userAgent = navigator.userAgent;
        if (userAgent.indexOf('Chrome') !== -1 && userAgent.indexOf('Edg') === -1) return 'Chrome';
        if (userAgent.indexOf('Safari') !== -1 && userAgent.indexOf('Chrome') === -1) return 'Safari';
        if (userAgent.indexOf('Firefox') !== -1) return 'Firefox';
        if (userAgent.indexOf('Edg') !== -1) return 'Edge';
        return 'Other';
    }
    
    // 페이지 종료 시 처리
    setupUnloadHandler() {
        // 모던 브라우저용
        if ('sendBeacon' in navigator) {
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    this.sendBeacon();
                }
            });
        }
        
        // 폴백
        window.addEventListener('beforeunload', () => {
            this.sendBeacon();
        });
    }
    
    // sendBeacon을 사용한 안정적인 전송
    sendBeacon() {
        if (this.queue.length === 0) return;
        
        const payload = {
            batch: this.queue,
            batchId: this.generateBatchId(),
            source: 'beacon'
        };
        
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(this.appsScriptUrl, blob);
        
        // 큐 비우기
        this.queue = [];
    }
    
    // 배치 ID 생성
    generateBatchId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // 사용자 ID 가져오기
    getUserId() {
        let userId = localStorage.getItem('claude_guide_user_id');
        if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('claude_guide_user_id', userId);
        }
        return userId;
    }
    
    // 세션 ID 가져오기
    getSessionId() {
        let sessionId = sessionStorage.getItem('guide-session-id');
        if (!sessionId) {
            sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('guide-session-id', sessionId);
        }
        return sessionId;
    }
    
    // 정리
    destroy() {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
        }
        this.flush(); // 남은 이벤트 전송
    }
}