// About page JavaScript
import { ThemeManager } from './modules/theme.js';
import { Analytics } from './modules/analytics.js';
import { MobileMenu } from './modules/mobile-menu.js';

// Initialize theme system
ThemeManager.init();

// Initialize mobile menu
new MobileMenu();

// Initialize FAQ accordion
document.addEventListener('DOMContentLoaded', () => {
    // Initialize analytics
    Analytics.init();
    
    // Expose Analytics to window for global access
    window.Analytics = Analytics;
    
    initializeFAQ();
});

// FAQ accordion functionality
function initializeFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const isActive = question.classList.contains('active');
            
            // Close all other FAQs
            faqQuestions.forEach(q => {
                q.classList.remove('active');
                q.nextElementSibling.classList.remove('active');
            });
            
            // Toggle current FAQ
            if (!isActive) {
                question.classList.add('active');
                answer.classList.add('active');
            }
        });
    });
}

