/**
 * Mobile Detection and Blocking System
 * Detects mobile devices and displays a desktop-only message
 */

class MobileDetector {
    constructor() {
        this.isDirectAccessModal = false;
        this.init();
    }

    /**
     * Initialize mobile detection
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.checkAndBlock();
            });
        } else {
            this.checkAndBlock();
        }
        
        // ESC 키 이벤트 리스너
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.isDirectAccessModal) {
                this.closeMobileWarningModal();
            }
        });
    }

    /**
     * Check if device is mobile and apply blocking if needed
     */
    checkAndBlock() {
        if (this.isMobileDevice()) {
            // Check if current page is allowed for mobile
            const currentPath = window.location.pathname;
            const allowedPages = ['/', '/index.html', '/about.html'];
            const isAllowedPage = allowedPages.some(page => currentPath.endsWith(page));
            
            if (!isAllowedPage) {
                // Show modal instead of full overlay
                setTimeout(() => {
                    this.showMobileWarningModal(currentPath, true); // true = direct access
                }, 500); // Small delay to let page load
            } else {
                // Set up mobile link interceptors for restricted pages
                this.setupMobileLinkInterceptors();
            }
        }
    }

    /**
     * Comprehensive mobile device detection
     * @returns {boolean} True if mobile device detected
     */
    isMobileDevice() {
        // Method 1: User Agent detection
        const userAgent = navigator.userAgent.toLowerCase();
        const mobilePatterns = [
            /mobile/i,
            /android/i,
            /iphone/i,
            /ipad/i,
            /ipod/i,
            /blackberry/i,
            /windows phone/i,
            /webos/i,
            /bada/i,
            /tizen/i,
            /kindle/i,
            /silk/i,
            /mobile safari/i,
            /opera mini/i,
            /opera mobi/i
        ];

        const isMobileUserAgent = mobilePatterns.some(pattern => pattern.test(userAgent));

        // Method 2: Screen size detection (as backup)
        const isMobileScreen = window.innerWidth <= 768 && window.innerHeight <= 1024;

        // Method 3: Touch support detection
        const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Method 4: Orientation support (mobile specific)
        const hasOrientationSupport = typeof window.orientation !== 'undefined';

        // Combine multiple detection methods for better accuracy
        // Primary: User Agent + Screen Size
        // Secondary: Touch + Orientation as supporting evidence
        return isMobileUserAgent || (isMobileScreen && (hasTouchSupport || hasOrientationSupport));
    }


    /**
     * Setup interceptors for links to restricted pages on mobile
     */
    setupMobileLinkInterceptors() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a');
            if (!target) return;
            
            const href = target.getAttribute('href');
            if (!href) return;
            
            // Check if link points to restricted pages
            const restrictedPages = ['/guide.html', '/faq.html', 'guide.html', 'faq.html'];
            const isRestrictedLink = restrictedPages.some(page => href.includes(page));
            
            // Also check for guide start button
            const isGuideStartButton = target.classList.contains('cta-button') && 
                                     (target.textContent.includes('가이드 시작') || 
                                      target.textContent.includes('설치 가이드'));
            
            if (isRestrictedLink || isGuideStartButton) {
                e.preventDefault();
                // Convert relative URL to absolute if needed
                const absoluteUrl = href.startsWith('/') ? href : '/' + href;
                this.showMobileWarningModal(absoluteUrl);
            }
        });
    }

    /**
     * Show warning modal for mobile users trying to access restricted pages
     */
    showMobileWarningModal(targetUrl, isDirectAccess = false) {
        // Remove existing modal if any
        const existingModal = document.getElementById('mobile-warning-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'mobile-warning-modal';
        modal.className = 'mobile-warning-modal';
        
        // 직접 접근인 경우 오버레이 클릭 비활성화
        const overlayClick = isDirectAccess ? '' : 'id="mobile-overlay"';
        
        // 버튼 설정
        const secondButton = isDirectAccess 
            ? `<button class="mobile-warning-button primary" id="mobile-home-btn">
                   <i class="fas fa-home"></i>
                   <span>홈으로</span>
               </button>`
            : `<button class="mobile-warning-button close" id="mobile-close-btn">
                   <i class="fas fa-times"></i>
                   <span>닫기</span>
               </button>`;
        
        modal.innerHTML = `
            <div class="mobile-warning-overlay" ${overlayClick}></div>
            <div class="mobile-warning-content">
                <div class="mobile-warning-icon">
                    <i class="fas fa-desktop"></i>
                </div>
                <h3 class="mobile-warning-title">데스크톱이 필요합니다</h3>
                <p class="mobile-warning-message">
                    Claude Code는 터미널 명령어를 실행해야 합니다.<br>
                    데스크톱 이용을 추천합니다.
                </p>
                <div class="mobile-warning-email-section">
                    <input type="email" 
                           id="email-input" 
                           class="mobile-warning-email-input" 
                           placeholder="이메일 주소 입력"
                           autocomplete="email">
                    <button class="mobile-warning-button email-send" onclick="mobileDetector.sendEmail('${window.location.origin}${targetUrl}')">
                        <i class="fas fa-envelope"></i>
                        <span>이메일로 보내기</span>
                    </button>
                </div>
                <div class="mobile-warning-actions">
                    <button class="mobile-warning-button copy-link" onclick="mobileDetector.copyLinkToClipboard('${window.location.origin}${targetUrl}')">
                        <i class="fas fa-link"></i>
                        <span>링크 복사</span>
                    </button>
                    ${secondButton}
                </div>
                <p class="mobile-warning-hint">
                    링크를 복사하여 데스크톱 브라우저에서 열어보세요
                </p>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);
        
        // 버튼 이벤트 리스너 추가
        setTimeout(() => {
            // 홈으로 버튼
            const homeBtn = document.getElementById('mobile-home-btn');
            if (homeBtn) {
                homeBtn.addEventListener('click', () => {
                    if (window.Analytics) {
                        Analytics.trackEvent('button_click', {
                            button_category: 'mobile_modal',
                            button_purpose: 'go_to_home',
                            button_type: 'home_button',
                            is_useful: true,
                            page_path: window.location.pathname
                        });
                    }
                    window.location.href = '/';
                });
            }
            
            // 닫기 버튼
            const closeBtn = document.getElementById('mobile-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    if (window.Analytics) {
                        Analytics.trackEvent('button_click', {
                            button_category: 'mobile_modal',
                            button_purpose: 'close_modal',
                            button_type: 'close_button',
                            is_useful: false,
                            page_path: window.location.pathname
                        });
                    }
                    this.closeMobileWarningModal();
                });
            }
            
            // 오버레이 클릭 (모달 닫기)
            const overlay = document.getElementById('mobile-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => {
                    if (window.Analytics) {
                        Analytics.trackEvent('button_click', {
                            button_category: 'mobile_modal',
                            button_purpose: 'close_modal_overlay',
                            button_type: 'overlay_click',
                            is_useful: false,
                            page_path: window.location.pathname
                        });
                    }
                    this.closeMobileWarningModal();
                });
            }
        }, 50);
        
        // 직접 접근인 경우 ESC 키 이벤트 핸들러 추가
        if (isDirectAccess) {
            this.isDirectAccessModal = true;
        }
    }

    /**
     * Close mobile warning modal
     */
    closeMobileWarningModal() {
        // 직접 접근 모달인 경우 닫지 않음
        if (this.isDirectAccessModal) {
            return;
        }
        
        const modal = document.getElementById('mobile-warning-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    }

    /**
     * Copy link to clipboard
     */
    copyLinkToClipboard(url) {
        // Track button click
        if (window.Analytics) {
            Analytics.trackEvent('button_click', {
                button_category: 'mobile_modal',
                button_purpose: 'copy_desktop_link',
                button_type: 'copy_link',
                target_url: url,
                is_useful: true,
                page_path: window.location.pathname
            });
        }
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                // Update button text
                const copyButton = document.querySelector('.mobile-warning-button.copy-link');
                if (copyButton) {
                    const originalHTML = copyButton.innerHTML;
                    copyButton.innerHTML = '<i class="fas fa-check"></i> 복사됨!';
                    copyButton.classList.add('copied');
                    setTimeout(() => {
                        copyButton.innerHTML = originalHTML;
                        copyButton.classList.remove('copied');
                    }, 2000);
                }
            }).catch(() => {
                // Fallback for older browsers
                this.fallbackCopyToClipboard(url);
            });
        } else {
            this.fallbackCopyToClipboard(url);
        }
    }

    /**
     * Fallback copy method for older browsers
     */
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            const copyButton = document.querySelector('.mobile-warning-button.copy-link');
            if (copyButton) {
                const originalHTML = copyButton.innerHTML;
                copyButton.innerHTML = '<i class="fas fa-check"></i><span>복사됨!</span>';
                copyButton.classList.add('copied');
                setTimeout(() => {
                    copyButton.innerHTML = originalHTML;
                    copyButton.classList.remove('copied');
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
        }
        document.body.removeChild(textArea);
    }

    /**
     * Send email with link
     */
    sendEmail(url) {
        const emailInput = document.getElementById('email-input');
        const email = emailInput ? emailInput.value.trim() : '';
        
        if (!email) {
            emailInput.classList.add('error');
            emailInput.focus();
            setTimeout(() => emailInput.classList.remove('error'), 2000);
            return;
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            emailInput.classList.add('error');
            emailInput.focus();
            setTimeout(() => emailInput.classList.remove('error'), 2000);
            return;
        }
        
        // Track button click
        if (window.Analytics) {
            Analytics.trackEvent('button_click', {
                button_category: 'mobile_modal',
                button_purpose: 'send_desktop_link_email',
                button_type: 'email_send',
                target_url: url,
                is_useful: true,
                page_path: window.location.pathname
            });
        }
        
        const subject = encodeURIComponent('Claude Code 설치 가이드');
        const body = encodeURIComponent(`안녕하세요!\n\nClaude Code 설치 가이드를 공유합니다.\n\n데스크톱에서 아래 링크를 열어주세요:\n${url}\n\n- AI 코딩 도구 Claude Code 설치 가이드\n- 6단계로 쉽게 따라하기`);
        
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        
        // Show success feedback
        const sendButton = document.querySelector('.mobile-warning-button.email-send');
        if (sendButton) {
            const originalHTML = sendButton.innerHTML;
            sendButton.innerHTML = '<i class="fas fa-check"></i><span>이메일 열림!</span>';
            sendButton.classList.add('sent');
            setTimeout(() => {
                sendButton.innerHTML = originalHTML;
                sendButton.classList.remove('sent');
            }, 2000);
        }
    }
}

// Initialize mobile detector when script loads
const mobileDetector = new MobileDetector();

// Expose to global scope for debugging
window.mobileDetector = mobileDetector;