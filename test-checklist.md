# 버튼 추적 테스트 체크리스트

## 테스트 환경
- URL: http://localhost:5174/
- 테스트 페이지: http://localhost:5174/test-tracking.html

## 1. CTA 버튼 테스트
- [ ] 메인 페이지 "지금 시작하기" 버튼 클릭
- [ ] 콘솔에서 이벤트 확인:
  ```javascript
  eventType: 'button_click'
  button_category: 'cta'
  button_purpose: 'start_guide'
  is_useful: true
  ```

## 2. OS 토글 버튼 테스트
- [ ] macOS/Windows 버튼 클릭
- [ ] 콘솔에서 이벤트 확인:
  ```javascript
  button_category: 'personalization'
  button_purpose: 'switch_os_instructions'
  is_useful: true
  ```

## 3. 가이드 진행 버튼 테스트
- [ ] "성공했어요!" 버튼 클릭
- [ ] 콘솔에서 이벤트 확인:
  ```javascript
  button_category: 'guide_progress'
  button_purpose: 'confirm_step_success'
  result_type: 'success'
  is_useful: true
  ```

- [ ] "문제가 생겼어요" 버튼 클릭
- [ ] 콘솔에서 이벤트 확인:
  ```javascript
  button_category: 'guide_progress'
  button_purpose: 'report_step_error'
  result_type: 'error'
  is_useful: true
  ```

- [ ] "해결 완료" 버튼 클릭
- [ ] 콘솔에서 이벤트 확인:
  ```javascript
  button_category: 'guide_progress'
  button_purpose: 'confirm_problem_resolved'
  is_useful: true
  ```

## 4. 코드 복사 버튼 테스트
- [ ] 코드 블록의 복사 버튼 클릭
- [ ] 콘솔에서 이벤트 확인:
  ```javascript
  eventType: 'code_copy'
  code_category: 'installation'
  code_action: 'install_claude_cli'
  code_importance: 'required'
  ```

## 5. 모바일 모달 버튼 테스트 (시뮬레이션)
- [ ] 각 버튼 클릭 후 이벤트 확인:
  - 링크 복사: `button_purpose: 'copy_desktop_link'`, `is_useful: true`
  - 이메일로 보내기: `button_purpose: 'send_desktop_link_email'`, `is_useful: true`
  - 홈으로: `button_purpose: 'go_to_home'`, `is_useful: true`
  - 닫기: `button_purpose: 'close_modal'`, `is_useful: false`

## 6. 실제 Analytics 전송 확인
- [ ] Network 탭에서 Google Analytics 요청 확인
- [ ] Apps Script Web App 요청 확인 (sendBeacon)

## 7. 데이터 매핑 확인
Raw_Events 시트의 컬럼 매핑:
- Q (Action_Type): button_click, code_copy 등
- R (Action_Target): 버튼 텍스트 또는 ID
- S (Action_Value): 버튼 카테고리 또는 추가 정보

## 테스트 결과
- 테스트 일시: 
- 테스트 수행자: 
- 모든 이벤트 정상 추적: [ ] 확인
- 문제 발견 사항: 

## 주의사항
1. 브라우저 콘솔(F12)을 열어두고 테스트
2. Network 탭에서 analytics 요청 확인
3. 각 버튼 클릭 후 2-3초 대기 (이벤트 전송 확인)