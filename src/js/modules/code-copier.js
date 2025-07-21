// Code Copy Functionality
export const CodeCopier = {
    init() {
        this.setupCopyButtons();
    },
    
    setupCopyButtons() {
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.copy-btn')) {
                const button = e.target.closest('.copy-btn');
                const codeBlock = button.closest('.code-block');
                const code = codeBlock.querySelector('code');
                
                if (code) {
                    await this.copyCode(code.textContent, button);
                }
            }
        });
    },
    
    async copyCode(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i><span>복사됨!</span>';
            button.classList.add('copied');
            
            // Reset after 2 seconds
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
            
            // Track analytics event with user value focus
            if (window.Analytics) {
                // 현재 가이드 단계 확인
                const guideStep = button.closest('.guide-step');
                let stepInfo = {};
                let codeImportance = 'optional'; // 코드의 중요도
                
                if (guideStep) {
                    stepInfo.step_id = guideStep.id || '';
                    stepInfo.step_number = guideStep.dataset.step || '';
                    stepInfo.step_title = guideStep.querySelector('h2')?.textContent || '';
                    
                    // 필수 명령어인지 판단
                    const isRequired = guideStep.classList.contains('required') || 
                                     text.includes('npm install') || 
                                     text.includes('claude auth') ||
                                     text.includes('brew install');
                    codeImportance = isRequired ? 'required' : 'optional';
                }
                
                // 코드 유형 상세 분류
                let codeCategory = 'other';
                let codeAction = 'unknown';
                
                if (text.startsWith('npm install')) {
                    codeCategory = 'installation';
                    codeAction = 'install_claude_cli';
                } else if (text.startsWith('brew')) {
                    codeCategory = 'installation';
                    codeAction = 'install_homebrew_package';
                } else if (text.startsWith('claude auth')) {
                    codeCategory = 'authentication';
                    codeAction = 'authenticate_claude';
                } else if (text.includes('claude')) {
                    codeCategory = 'claude_command';
                    codeAction = text.includes('--version') ? 'check_version' : 'run_claude';
                } else if (text.includes('git')) {
                    codeCategory = 'version_control';
                    codeAction = 'git_operation';
                } else if (text.includes('mkdir') || text.includes('cd')) {
                    codeCategory = 'file_system';
                    codeAction = 'directory_operation';
                }
                
                Analytics.trackEvent('code_copy', {
                    // 사용자 가치 중심 데이터
                    code_category: codeCategory,
                    code_action: codeAction,
                    code_importance: codeImportance,
                    
                    // 기본 정보
                    code_snippet: text.substring(0, 50), // 줄임
                    code_length: text.length,
                    
                    // 컨텍스트
                    page_path: window.location.pathname,
                    user_context: Analytics.getUserContext ? Analytics.getUserContext() : {},
                    
                    // 가이드 정보
                    ...stepInfo
                });
            }
            
            // Show toast notification
            if (window.showToast) {
                window.showToast('명령어가 복사되었습니다!', 'success');
            }
        } catch (err) {
            console.error('Copy failed:', err);
            
            // Fallback for older browsers
            this.fallbackCopy(text, button);
        }
    },
    
    fallbackCopy(text, button) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            
            // Visual feedback
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i><span>복사됨!</span>';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
            
            if (window.showToast) {
                window.showToast('명령어가 복사되었습니다!', 'success');
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
            if (window.showToast) {
                window.showToast('복사에 실패했습니다.', 'error');
            }
        }
        
        document.body.removeChild(textArea);
    }
};

// Global function for HTML onclick (원본 호환성)
window.copyCode = function(button) {
    const codeBlock = button.closest('.code-block');
    const code = codeBlock.querySelector('code');
    
    if (code) {
        CodeCopier.copyCode(code.textContent, button);
    }
};