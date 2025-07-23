// Main JavaScript entry point
import { ThemeManager } from './modules/theme.js';
import { CounterAnimation } from './modules/counter.js';
import { initVersionUpdater } from './version-updater.js';
import { Analytics } from './modules/analytics.js';
import { GuideTracker } from './modules/guideTracker.js';
import { CacheManager } from './modules/cache-manager.js';

// Initialize theme system immediately
ThemeManager.init();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize analytics
  Analytics.init();
  
  // Check first visit
  GuideTracker.checkFirstVisit();
  
  // Initialize landing page counter
  initializeLandingCounter();
  
  // Initialize version updater for guide and FAQ pages
  initVersionUpdater();
  
  // Initialize theme toggle button
  initThemeToggle();
  
  // Initialize guide tracking if on guide page
  initGuideTracking();
});

// Initialize landing page counter
async function initializeLandingCounter() {
  const counterEl = document.getElementById('successCounter');
  if (!counterEl) return;
  
  // 1. 마지막 성공한 값을 세션스토리지에서 가져오기
  const lastKnownCount = sessionStorage.getItem('lastUserCount');
  
  if (lastKnownCount) {
    // 이전 값이 있으면 바로 표시 (✨ 안 보임)
    document.getElementById('counter').textContent = parseInt(lastKnownCount).toLocaleString();
    document.getElementById('counterText').textContent = '명이 여러분과 함께 하고 있어요';
  } else {
    // 첫 방문이면 ✨ 표시 (기존 HTML 그대로 유지)
    // document.getElementById('counter').textContent = '✨';
    // document.getElementById('counterText').textContent = '명이 여러분과 함께 하고 있어요';
  }
  
  // 2. 백그라운드에서 실제 값 가져오기
  await incrementUserCount();
  const actualUserCount = await fetchUserCount();
  
  // 3. 세션스토리지 업데이트 (API 성공 시에만)
  if (actualUserCount > 0) {
    sessionStorage.setItem('lastUserCount', actualUserCount);
  }
  
  // 4. 부드러운 전환
  if (lastKnownCount && parseInt(lastKnownCount) !== actualUserCount) {
    // 이전 값 → 새 값으로 애니메이션
    CounterAnimation.animateFromCurrent('counter', actualUserCount, 1000);
  } else if (!lastKnownCount) {
    // 첫 방문: 0 → 실제 값
    document.getElementById('counter').textContent = '0';
    document.getElementById('counterText').textContent = '명이 여러분과 함께 하고 있어요';
    setTimeout(() => {
      CounterAnimation.animate('counter', actualUserCount, 2000);
    }, 500);
  }
}

// 사용자 카운터 증가
async function incrementUserCount() {
  try {
    // 프로덕션 사이트가 아니면 카운터 증가하지 않음
    const hostname = window.location.hostname;
    if (hostname !== 'getclaudecode.com') {
      console.log('[Counter] Not production - skipping user count');
      return;
    }
    
    // 이미 방문했는지 확인 (세션 스토리지 사용)
    if (sessionStorage.getItem('userCounted')) {
      return; // 이미 카운트됨
    }
    
    // Google Analytics로 사용자 증가 추적 (CORS 없음)
    if (typeof gtag === 'function') {
      gtag('event', 'user_count_increment', {
        event_category: 'engagement',
        user_id: Analytics.userId || 'anonymous'
      });
    }
    
    // Apps Script 대신 간단한 이미지 요청 사용 (CORS 우회)
    const img = new Image();
    img.src = Analytics.APPS_SCRIPT_URL + '?action=incrementCounter&metric=users&t=' + Date.now();
    
    // 즉시 카운트 완료로 처리 (네트워크 상관없이)
    sessionStorage.setItem('userCounted', 'true');
    console.log('사용자 카운터 증가 요청 완료');
    
  } catch (error) {
    console.log('사용자 카운터 처리 중 오류 (무시됨):', error.message);
  }
}

// Apps Script에서 사용자 수 가져오기 (CORS 문제로 JSONP 사용)
async function fetchUserCount() {
  return await CacheManager.get(
    CacheManager.CACHE_KEYS.USER_COUNT,
    async () => {
      try {
        // JSONP를 사용하여 CORS 문제 우회
        const count = await fetchUserCountViaJSONP();
        
        if (count && count > 0) {
          sessionStorage.setItem('lastUserCount', count);
          return count;
        }
        
        throw new Error('Invalid count received');
        
      } catch (error) {
        console.error('사용자 수 가져오기 실패:', error);
        console.log('JSONP URL:', Analytics.APPS_SCRIPT_URL);
        
        // 에러 시에도 세션스토리지의 마지막 값 사용
        const lastKnownCount = sessionStorage.getItem('lastUserCount');
        if (lastKnownCount) {
          console.log('Using last known count from session:', lastKnownCount);
          return parseInt(lastKnownCount);
        }
        
        // 세션스토리지에도 없으면 로컬스토리지 확인
        const cachedData = localStorage.getItem('cache_claude_guide_user_count');
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            console.log('Using cached count:', parsed);
            return parsed;
          } catch (e) {
            console.error('Failed to parse cached data');
          }
        }
        
        return 0;
      }
    },
    CacheManager.CACHE_DURATION.COUNTER // 5분 캐싱
  );
}

// JSONP를 사용한 사용자 수 조회
function fetchUserCountViaJSONP() {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Math.random().toString(36).substr(2, 9);
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, 10000); // 10초 타임아웃
    
    // 전역 콜백 함수 생성
    window[callbackName] = (data) => {
      cleanup();
      if (data && data.success && data.value !== undefined) {
        resolve(data.value);
      } else if (data && data.value !== undefined) {
        // success 필드가 없어도 value가 있으면 사용
        resolve(data.value);
      } else {
        reject(new Error('Invalid JSONP response'));
      }
    };
    
    // script 태그로 요청 - getSheetCount 액션 사용
    const script = document.createElement('script');
    script.src = Analytics.APPS_SCRIPT_URL + 
                 '?action=getSheetCount&callback=' + callbackName + 
                 '&t=' + Date.now();
    
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP script load error'));
    };
    
    function cleanup() {
      clearTimeout(timeout);
      // 콜백 삭제를 약간 지연시켜 응답 처리 완료 보장
      setTimeout(() => {
        if (window[callbackName]) delete window[callbackName];
        if (script && script.parentNode) script.parentNode.removeChild(script);
      }, 100);
    }
    
    document.head.appendChild(script);
  });
}

// Theme toggle for landing page
function initThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      ThemeManager.toggle();
    });
  }
}

// Initialize guide tracking
function initGuideTracking() {
  // 가이드 페이지인지 확인
  if (window.location.pathname.includes('/guide')) {
    // 예시: 가이드 시작 버튼에 이벤트 리스너 추가
    const startButtons = document.querySelectorAll('.start-guide-btn');
    startButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const guideId = btn.dataset.guideId || 'setup-guide';
        const guideName = btn.dataset.guideName || 'Claude Code Setup Guide';
        GuideTracker.startGuide(guideId, guideName);
      });
    });
    
    // 단계 완료 버튼
    const stepButtons = document.querySelectorAll('.complete-step-btn');
    stepButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const stepNumber = parseInt(btn.dataset.stepNumber) || 1;
        const stepName = btn.dataset.stepName || 'Step ' + stepNumber;
        GuideTracker.completeStep(stepNumber, stepName);
      });
    });
    
    // 가이드 완료 버튼
    const completeButtons = document.querySelectorAll('.complete-guide-btn');
    completeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        GuideTracker.completeGuide();
      });
    });
  }
}

// Export for use in other modules
window.GuideTracker = GuideTracker;
window.Analytics = Analytics;
window.CacheManager = CacheManager;