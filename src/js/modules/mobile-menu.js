// 모바일 메뉴 관리 모듈
export class MobileMenu {
    constructor() {
        this.hamburger = document.querySelector('.nav-hamburger');
        this.mobileMenu = document.querySelector('.mobile-menu');
        this.mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
        this.closeButton = document.querySelector('.mobile-menu-close');
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        if (!this.hamburger || !this.mobileMenu) return;
        
        // 햄버거 버튼 클릭
        this.hamburger.addEventListener('click', () => this.toggle());
        
        // 닫기 버튼 클릭
        this.closeButton?.addEventListener('click', () => this.close());
        
        // 오버레이 클릭으로 닫기
        this.mobileMenuOverlay?.addEventListener('click', () => this.close());
        
        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
        
        // 메뉴 링크 클릭 시 닫기
        const menuLinks = this.mobileMenu.querySelectorAll('.mobile-menu-items a');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.close();
            });
        });
        
        // 화면 크기 변경 시 메뉴 닫기
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isOpen) {
                this.close();
            }
        });
    }
    
    toggle() {
        this.isOpen ? this.close() : this.open();
    }
    
    open() {
        this.isOpen = true;
        this.mobileMenu.classList.add('active');
        this.mobileMenuOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden'; // 스크롤 방지
        
        // 접근성
        this.hamburger.setAttribute('aria-expanded', 'true');
        this.hamburger.setAttribute('aria-label', '메뉴 닫기');
    }
    
    close() {
        this.isOpen = false;
        this.mobileMenu.classList.remove('active');
        this.mobileMenuOverlay?.classList.remove('active');
        document.body.style.overflow = ''; // 스크롤 복원
        
        // 접근성
        this.hamburger.setAttribute('aria-expanded', 'false');
        this.hamburger.setAttribute('aria-label', '메뉴 열기');
    }
}