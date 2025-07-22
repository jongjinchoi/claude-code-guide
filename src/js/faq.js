// FAQ Page JavaScript
import { ThemeManager } from './modules/theme.js';
import { OSDetector } from './modules/os-detector.js';
import { FontController } from './modules/font-controller.js';
import { Analytics } from './modules/analytics.js';
import { MobileMenu } from './modules/mobile-menu.js';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme manager
    ThemeManager.init();
    
    // Initialize analytics
    Analytics.init();
    
    // Expose Analytics to window for global access
    window.Analytics = Analytics;
    
    // Initialize OS detector
    OSDetector.init();
    
    // Initialize font controller
    FontController.init();
    
    // Initialize mobile menu
    new MobileMenu();
    
    // Initialize FAQ functionality
    initFAQ();
    
    // Initialize theme toggle button
    initThemeToggle();
    
    // Check if user came from guide page and create return button
    handleReturnFromGuide();
});

function initFAQ() {
    // Add click event listeners to FAQ questions
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.closest('.faq-item');
            const isActive = faqItem.classList.contains('active');
            
            // Close all other FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Toggle current FAQ item
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });
    
    // Add keyboard navigation
    document.querySelectorAll('.faq-question').forEach(question => {
        question.setAttribute('tabindex', '0');
        question.setAttribute('role', 'button');
        question.setAttribute('aria-expanded', 'false');
        
        question.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
    
    // Update aria-expanded when FAQ items are toggled
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const faqItem = mutation.target;
                const question = faqItem.querySelector('.faq-question');
                const isActive = faqItem.classList.contains('active');
                
                if (question) {
                    question.setAttribute('aria-expanded', isActive ? 'true' : 'false');
                }
            }
        });
    });
    
    // Observe all FAQ items for class changes
    document.querySelectorAll('.faq-item').forEach(item => {
        observer.observe(item, { attributes: true, attributeFilter: ['class'] });
    });
}

// Add smooth scrolling to FAQ items if coming from a hash link
if (window.location.hash && window.location.hash.startsWith('#faq-')) {
    window.addEventListener('load', function() {
        const faqNumber = window.location.hash.replace('#faq-', '');
        const faqItem = document.querySelector(`[data-faq="${faqNumber}"]`)?.closest('.faq-item');
        
        if (faqItem) {
            // Open the FAQ item
            faqItem.classList.add('active');
            
            // Scroll to it after a brief delay to ensure rendering
            setTimeout(() => {
                faqItem.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 100);
        }
    });
}

// Handle return from guide page
function handleReturnFromGuide() {
    const urlParams = new URLSearchParams(window.location.search);
    const fromGuide = urlParams.get('from') === 'guide';
    const returnUrl = urlParams.get('return');
    
    if (fromGuide && returnUrl) {
        // Create return button
        const returnButton = createReturnButton(returnUrl);
        document.body.appendChild(returnButton);
    }
}

function createReturnButton(returnUrl) {
    const decodedUrl = decodeURIComponent(returnUrl);
    const url = new URL(decodedUrl);
    const params = new URLSearchParams(url.search);
    
    // Get current step from URL params
    const currentStep = params.get('current');
    const stepText = currentStep ? `${currentStep}단계 진행 중` : '가이드 진행 중';
    
    // Create button element
    const button = document.createElement('a');
    button.href = decodedUrl;
    button.className = 'return-to-guide';
    button.innerHTML = `
        <i class="fas fa-arrow-left"></i>
        <div class="return-to-guide-text">
            <span class="return-to-guide-main">가이드로 돌아가기</span>
            <span class="return-to-guide-sub">${stepText}</span>
        </div>
    `;
    
    return button;
}

function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            ThemeManager.toggle();
        });
    }
}