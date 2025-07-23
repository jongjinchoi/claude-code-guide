// Cache Manager for Claude Code Guide
// 지능형 캐싱 시스템으로 API 요청을 줄이고 성능을 향상시킵니다

export class CacheManager {
    static CACHE_KEYS = {
        USER_COUNT: 'claude_guide_user_count',
        COMPLETION_COUNT: 'claude_guide_completion_count',
        DASHBOARD_STATS: 'claude_guide_dashboard_stats',
        GUIDE_STATS: 'claude_guide_stats'
    };
    
    static CACHE_DURATION = {
        COUNTER: 5 * 60 * 1000,        // 5분
        STATS: 30 * 60 * 1000,         // 30분
        DASHBOARD: 60 * 60 * 1000,     // 1시간
        DEFAULT: 10 * 60 * 1000        // 10분
    };
    
    // 캐시에서 데이터 가져오기
    static async get(key, fetcher, duration = this.CACHE_DURATION.DEFAULT) {
        const cacheKey = `cache_${key}`;
        const cacheTimeKey = `${cacheKey}_time`;
        const cacheVersionKey = `${cacheKey}_version`;
        
        try {
            // 캐시된 데이터 확인
            const cached = localStorage.getItem(cacheKey);
            const cacheTime = localStorage.getItem(cacheTimeKey);
            const cacheVersion = localStorage.getItem(cacheVersionKey);
            
            // 캐시 버전 확인 (캐시 무효화용)
            const currentVersion = '1.0.0';
            
            if (cached && cacheTime && cacheVersion === currentVersion) {
                const age = Date.now() - parseInt(cacheTime);
                
                // 캐시가 유효한 경우
                if (age < duration) {
                    console.log(`Cache hit for ${key}, age: ${Math.round(age/1000)}s`);
                    return JSON.parse(cached);
                }
            }
            
            // 캐시 미스 - 새로 가져오기
            console.log(`Cache miss for ${key}, fetching new data...`);
            
            // 백그라운드 업데이트 (stale-while-revalidate)
            if (cached && this.shouldBackgroundUpdate(key)) {
                // 기존 캐시 데이터 즉시 반환
                this.backgroundUpdate(key, fetcher, duration);
                return JSON.parse(cached);
            }
            
            // 새 데이터 가져오기
            const data = await fetcher();
            this.set(key, data, duration);
            return data;
            
        } catch (error) {
            console.error(`Cache error for ${key}:`, error);
            // 캐시 오류 시 직접 가져오기
            return await fetcher();
        }
    }
    
    // 캐시에 데이터 저장
    static set(key, data, duration = this.CACHE_DURATION.DEFAULT) {
        const cacheKey = `cache_${key}`;
        const cacheTimeKey = `${cacheKey}_time`;
        const cacheVersionKey = `${cacheKey}_version`;
        
        try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
            localStorage.setItem(cacheTimeKey, Date.now().toString());
            localStorage.setItem(cacheVersionKey, '1.0.0');
            
            // 캐시 만료 자동 정리 예약
            this.scheduleCleanup(key, duration);
            
        } catch (error) {
            console.error(`Failed to cache ${key}:`, error);
            // 스토리지 가득 찬 경우 오래된 캐시 정리
            if (error.name === 'QuotaExceededError') {
                this.clearOldCaches();
                // 재시도
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(data));
                    localStorage.setItem(cacheTimeKey, Date.now().toString());
                } catch (retryError) {
                    console.error('Cache retry failed:', retryError);
                }
            }
        }
    }
    
    // 캐시 무효화
    static invalidate(key) {
        const cacheKey = `cache_${key}`;
        const cacheTimeKey = `${cacheKey}_time`;
        const cacheVersionKey = `${cacheKey}_version`;
        
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(cacheTimeKey);
        localStorage.removeItem(cacheVersionKey);
    }
    
    // 패턴으로 캐시 무효화
    static invalidatePattern(pattern) {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_') && key.includes(pattern)) {
                const baseKey = key.replace('cache_', '').replace('_time', '').replace('_version', '');
                this.invalidate(baseKey);
            }
        });
    }
    
    // 백그라운드 업데이트 필요 여부
    static shouldBackgroundUpdate(key) {
        // 카운터는 항상 백그라운드 업데이트
        if (key.includes('count')) return true;
        // 통계는 5분 이상 된 경우
        if (key.includes('stats')) {
            const cacheTime = localStorage.getItem(`cache_${key}_time`);
            if (cacheTime) {
                const age = Date.now() - parseInt(cacheTime);
                return age > 5 * 60 * 1000;
            }
        }
        return false;
    }
    
    // 백그라운드에서 캐시 업데이트
    static async backgroundUpdate(key, fetcher, duration) {
        try {
            const data = await fetcher();
            this.set(key, data, duration);
            console.log(`Background update completed for ${key}`);
        } catch (error) {
            console.error(`Background update failed for ${key}:`, error);
        }
    }
    
    // 캐시 자동 정리 예약
    static scheduleCleanup(key, duration) {
        setTimeout(() => {
            const cacheTimeKey = `cache_${key}_time`;
            const cacheTime = localStorage.getItem(cacheTimeKey);
            if (cacheTime) {
                const age = Date.now() - parseInt(cacheTime);
                if (age >= duration) {
                    this.invalidate(key);
                    console.log(`Auto-cleaned expired cache: ${key}`);
                }
            }
        }, duration + 1000); // 만료 1초 후 정리
    }
    
    // 오래된 캐시 정리
    static clearOldCaches() {
        const keys = Object.keys(localStorage);
        const cacheItems = [];
        
        // 모든 캐시 항목 수집
        keys.forEach(key => {
            if (key.startsWith('cache_') && key.endsWith('_time')) {
                const baseKey = key.replace('cache_', '').replace('_time', '');
                const time = parseInt(localStorage.getItem(key));
                if (time) {
                    cacheItems.push({ key: baseKey, time });
                }
            }
        });
        
        // 시간순 정렬 (오래된 것부터)
        cacheItems.sort((a, b) => a.time - b.time);
        
        // 가장 오래된 30% 삭제
        const deleteCount = Math.ceil(cacheItems.length * 0.3);
        for (let i = 0; i < deleteCount; i++) {
            this.invalidate(cacheItems[i].key);
        }
        
        console.log(`Cleared ${deleteCount} old cache items`);
    }
    
    // 모든 캐시 정리
    static clearAll() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
        console.log('All caches cleared');
    }
    
    // 캐시 통계
    static getStats() {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter(key => key.startsWith('cache_') && !key.includes('_time') && !key.includes('_version'));
        let totalSize = 0;
        
        const stats = cacheKeys.map(key => {
            const data = localStorage.getItem(key);
            const size = data ? data.length : 0;
            totalSize += size;
            
            const timeKey = `${key}_time`;
            const time = localStorage.getItem(timeKey);
            const age = time ? Date.now() - parseInt(time) : null;
            
            return {
                key: key.replace('cache_', ''),
                size,
                age: age ? Math.round(age / 1000) : null
            };
        });
        
        return {
            count: cacheKeys.length,
            totalSize,
            items: stats
        };
    }
}