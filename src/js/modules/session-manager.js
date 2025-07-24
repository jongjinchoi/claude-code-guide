/**
 * Session Manager - 전역 세션 ID 관리
 * 모든 추적 모듈에서 일관된 세션 ID를 사용하도록 중앙화
 */

export const SessionManager = {
    SESSION_KEY: 'claude_guide_session_id',
    sessionId: null,
    
    /**
     * 현재 세션 ID를 가져옵니다.
     * 세션이 없으면 새로 생성합니다.
     */
    getSessionId() {
        // 메모리에 캐시된 값이 있으면 반환
        if (this.sessionId) {
            return this.sessionId;
        }
        
        // sessionStorage에서 확인
        this.sessionId = sessionStorage.getItem(this.SESSION_KEY);
        if (!this.sessionId) {
            this.sessionId = this.generateSessionId();
            sessionStorage.setItem(this.SESSION_KEY, this.sessionId);
        }
        
        return this.sessionId;
    },
    
    /**
     * 새로운 세션 ID를 생성합니다.
     * 형식: session_타임스탬프_랜덤문자열
     */
    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `session_${timestamp}_${random}`;
    },
    
    /**
     * 새로운 세션을 시작합니다.
     * 명시적으로 새 세션을 시작할 때 사용
     */
    startNewSession() {
        this.sessionId = this.generateSessionId();
        sessionStorage.setItem(this.SESSION_KEY, this.sessionId);
        return this.sessionId;
    },
    
    /**
     * 현재 세션을 종료합니다.
     */
    endSession() {
        this.sessionId = null;
        sessionStorage.removeItem(this.SESSION_KEY);
    }
};

// 전역으로 사용할 수 있도록 window에도 노출
if (typeof window !== 'undefined') {
    window.SessionManager = SessionManager;
}