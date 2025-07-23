// Batch Analytics System for Google Sheets
// 여러 이벤트를 모아서 한 번에 전송하여 API 요청 수를 줄입니다

export class BatchAnalytics {
    constructor(appsScriptUrl, options = {}) {
        this.appsScriptUrl = appsScriptUrl;
        this.queue = [];
        this.batchSize = options.batchSize || 10;
        this.batchInterval = options.batchInterval || 5000; // 5초
        this.maxQueueSize = options.maxQueueSize || 50;
        this.isProcessing = false;
        
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