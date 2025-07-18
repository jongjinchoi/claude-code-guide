// Main JavaScript entry point
import { ThemeManager } from './modules/theme.js';
import { CounterAnimation } from './modules/counter.js';
import { initVersionUpdater } from './version-updater.js';
import { Analytics } from './modules/analytics.js';
import { GuideTracker } from './modules/guideTracker.js';

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
  
  // 사용자 카운터 증가
  await incrementUserCount();
  
  // Google Sheets에서 실제 사용자 수 가져오기
  const actualUserCount = await fetchUserCount();
  
  // 항상 숫자 카운터 표시 (특별한 스타일 유지)
  // counterEl.removeAttribute('data-special'); // 주석 처리 - 스타일 유지
  document.getElementById('counter').textContent = '0';
  document.getElementById('counterText').textContent = '명이 여러분과 함께 하고 있어요';
  
  // 0부터 올라가는 애니메이션
  setTimeout(() => {
    CounterAnimation.animate('counter', actualUserCount, 2000);
  }, 1200);
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

// Apps Script에서 사용자 수 가져오기
async function fetchUserCount() {
  try {
    const response = await fetch(Analytics.APPS_SCRIPT_URL + '?action=getCounter&metric=users');
    const data = await response.json();
    return data.value || 62; // 기본값 62 (현재 사용자 수)
  } catch (error) {
    console.error('사용자 수 가져오기 실패:', error);
    return 62; // 실패 시 현재 사용자 수 반환
  }
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