// Counter animation module - exactly like original
export const CounterAnimation = {
    animate(elementId, target, duration = 2000) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const start = 0;
        const startTime = performance.now();
        const increment = target / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current).toLocaleString();
        }, 16);
    },
    
    animateFromCurrent(elementId, target, duration = 2000) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // 현재 표시된 값에서 시작
        const currentText = element.textContent.replace(/[^0-9]/g, '');
        const start = parseInt(currentText) || 0;
        
        // 이미 목표값이면 스킵
        if (start === target) return;
        
        const startTime = performance.now();
        const difference = target - start;
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // easeOutQuad 이징
            const easeProgress = progress * (2 - progress);
            const current = start + (difference * easeProgress);
            
            element.textContent = Math.floor(current).toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target.toLocaleString();
            }
        };
        
        requestAnimationFrame(updateCounter);
    }
};