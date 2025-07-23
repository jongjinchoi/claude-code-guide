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
    if (hostname !== 'claude-code-guide-sooty.vercel.app') {
      console.log('[Counter] Not production - skipping user count');
      return;
    }
    
    // 이미 방문했는지 확인 (세션 스토리지 사용)
    if (sessionStorage.getItem('userCounted')) {
      return; // 이미 카운트됨
    }
    
    // Apps Script로 카운터 증가 요청
    const response = await fetch(Analytics.APPS_SCRIPT_URL + '?action=incrementCounter&metric=users');
    const data = await response.json();
    
    if (data.success) {
      sessionStorage.setItem('userCounted', 'true');
      console.log('사용자 카운터 증가:', data.value);
    }
  } catch (error) {
    console.error('사용자 카운터 증가 실패:', error);
  }
}

// Apps Script에서 사용자 수 가져오기 (캐싱 적용)
async function fetchUserCount() {
  // 캐싱 시스템을 통해 데이터 가져오기
  return await CacheManager.get(
    CacheManager.CACHE_KEYS.USER_COUNT,
    async () => {
      try {
        const response = await fetch(Analytics.APPS_SCRIPT_URL + '?action=getCounter&metric=users');
        const data = await response.json();
        
        // API가 유효한 값을 반환했는지 확인
        if (data.value && data.value > 0) {
          // 세션스토리지에도 저장 (빠른 접근용)
          sessionStorage.setItem('lastUserCount', data.value);
          return data.value;
        }
        
        // API가 실패하면 세션스토리지의 마지막 값 사용
        const lastKnownCount = sessionStorage.getItem('lastUserCount');
        return lastKnownCount ? parseInt(lastKnownCount) : 0;
      } catch (error) {
        console.error('사용자 수 가져오기 실패:', error);
        // 에러 시에도 세션스토리지의 마지막 값 사용
        const lastKnownCount = sessionStorage.getItem('lastUserCount');
        return lastKnownCount ? parseInt(lastKnownCount) : 0;
      }
    },
    CacheManager.CACHE_DURATION.COUNTER // 5분 캐싱
  );
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