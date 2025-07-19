// Guide page JavaScript - complete implementation
import { ThemeManager } from './modules/theme.js';
import { GuideManager } from './modules/guide-manager.js';
import { OSDetector } from './modules/os-detector.js';
import { FontController } from './modules/font-controller.js';
import { CodeCopier } from './modules/code-copier.js';
import { showToast } from './modules/toast.js';
import { Analytics } from './modules/analytics.js';
import { GuideTracker } from './modules/guideTracker.js';
import { MobileMenu } from './modules/mobile-menu.js';

// Initialize theme system
ThemeManager.init();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize analytics
    Analytics.init();
    
    // Check first visit
    GuideTracker.checkFirstVisit();
    
    // Initialize all guide systems
    OSDetector.init();
    FontController.init();
    CodeCopier.init();
    GuideManager.init();
    
    // Initialize mobile menu
    new MobileMenu();
    
    // Make GuideTracker available globally
    window.GuideTracker = GuideTracker;
    
    // Setup theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            ThemeManager.toggle();
        });
    }
    
    // Update FAQ link with current progress
    const faqLink = document.querySelector('.nav-items a[href="faq.html"]');
    if (faqLink) {
        faqLink.addEventListener('click', (e) => {
            e.preventDefault();
            const currentUrl = window.location.href;
            const returnUrl = encodeURIComponent(currentUrl);
            window.location.href = `faq.html?from=guide&return=${returnUrl}`;
        });
    }
});