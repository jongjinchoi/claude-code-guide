// ===== Web App 엔드포인트 =====
// 웹사이트에서 이벤트 데이터를 받아 처리하는 Web App

// GET 요청 처리
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;
    
    // 카운터 값 요청
    if (action === 'getCounter') {
      return getCounterValue(params.metric);
    }
    
    // 일반 이벤트 처리 (beacon API 지원)
    if (params.eventType) {
      processEvent(params);
      return ContentService.createTextOutput('OK')
        .setMimeType(ContentService.MimeType.TEXT);
    }
    
    return ContentService.createTextOutput('Invalid request')
      .setMimeType(ContentService.MimeType.TEXT);
      
  } catch (error) {
    console.error('doGet error:', error);
    return ContentService.createTextOutput('Error: ' + error.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// POST 요청 처리
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 이벤트 처리
    if (data.eventType) {
      processEvent(data);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Event recorded'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Invalid request'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('doPost error:', error);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 이벤트 처리 함수
function processEvent(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawEventsSheet = ss.getSheetByName('Raw_Events');
  
  if (!rawEventsSheet) {
    throw new Error('Raw_Events sheet not found');
  }
  
  // 타임스탬프 처리
  const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
  
  // 이벤트 데이터 변환
  const eventRow = convertEventToRow(data, timestamp);
  
  // Raw_Events 시트에 추가
  rawEventsSheet.appendRow(eventRow);
  
  // 특별 이벤트 처리
  handleSpecialEvents(data, timestamp);
  
  // 디버그 로깅
  logDebug('Event processed', { eventType: data.eventType, userId: data.userId });
}

// 이벤트 데이터를 시트 행 형식으로 변환
function convertEventToRow(data, timestamp) {
  // 기본값 설정
  const eventCategory = extractEventCategory(data.eventType);
  const eventName = data.eventType;
  const userId = data.userId || '';
  const sessionId = data.sessionId || '';
  const isNewUser = data.customData?.firstVisit === true || false;
  
  // 페이지 정보
  const pageUrl = data.pageUrl || '';
  const pagePath = extractPagePath(pageUrl);
  const pageTitle = data.pageTitle || data.page_title || '';
  
  // Referrer 정보 추출
  const referrerInfo = extractReferrerInfo(data.referrer || '');
  
  // 가이드 정보
  const guideInfo = extractGuideInfo(data);
  
  // 상호작용 정보
  const actionInfo = extractActionInfo(data);
  
  // 디바이스 정보
  const deviceInfo = {
    device: data.device || 'Unknown',
    os: data.os || 'Unknown',
    browser: data.browser || 'Unknown',
    screenResolution: data.screenResolution || '',
    connectionSpeed: data.connectionSpeed || ''
  };
  
  // 에러 정보
  const errorInfo = extractErrorInfo(data);
  
  // 피드백 정보
  const feedbackInfo = extractFeedbackInfo(data);
  
  // 시간 정보
  const timeOnStep = data.duration || 0;
  const totalTimeMinutes = data.eventType === 'guide_completed' ? 
    (data.total_duration || data.duration || 0) / 60 : 0;
  
  // 31개 컬럼 배열 생성
  return [
    timestamp,                           // A: Timestamp
    eventCategory,                       // B: Event_Category
    eventName,                          // C: Event_Name
    userId,                             // D: User_ID
    sessionId,                          // E: Session_ID
    isNewUser,                          // F: Is_New_User
    pagePath,                           // G: Page_Path
    pageTitle,                          // H: Page_Title
    referrerInfo.source,                // I: Referrer_Source
    referrerInfo.medium,                // J: Referrer_Medium
    guideInfo.guideId,                  // K: Guide_ID
    guideInfo.guideName,                // L: Guide_Name
    guideInfo.stepNumber,               // M: Guide_Step_Number
    guideInfo.stepName,                 // N: Guide_Step_Name
    guideInfo.progress,                 // O: Guide_Progress
    timeOnStep,                         // P: Time_on_Step
    actionInfo.type,                    // Q: Action_Type
    actionInfo.target,                  // R: Action_Target
    actionInfo.value,                   // S: Action_Value
    actionInfo.count,                   // T: Interaction_Count
    deviceInfo.device,                  // U: Device_Category
    deviceInfo.os,                      // V: OS
    deviceInfo.browser,                 // W: Browser
    deviceInfo.screenResolution,        // X: Screen_Resolution
    deviceInfo.connectionSpeed,         // Y: Connection_Speed
    errorInfo.isSuccess,                // Z: Is_Success
    errorInfo.type,                     // AA: Error_Type
    errorInfo.message,                  // AB: Error_Message
    feedbackInfo.score,                 // AC: Feedback_Score
    feedbackInfo.text,                  // AD: Feedback_Text
    totalTimeMinutes                    // AE: Total_Time_Minutes
  ];
}

// 이벤트 카테고리 추출
function extractEventCategory(eventType) {
  if (eventType.includes('guide')) return 'guide';
  if (eventType.includes('page')) return 'page';
  if (eventType.includes('error')) return 'error';
  if (eventType.includes('feedback')) return 'feedback';
  if (eventType.includes('session')) return 'session';
  if (['cta_click', 'button_click', 'code_copy', 'scroll_depth', 'outbound_click'].includes(eventType)) return 'interaction';
  return 'other';
}

// 페이지 경로 추출
function extractPagePath(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch (e) {
    return url;
  }
}

// Referrer 정보 추출
function extractReferrerInfo(referrer) {
  if (!referrer || referrer === 'Direct') {
    return { source: 'direct', medium: 'none' };
  }
  
  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();
    
    // 소스 판별
    if (hostname.includes('google')) {
      return { source: 'google', medium: 'organic' };
    } else if (hostname.includes('facebook') || hostname.includes('twitter') || hostname.includes('linkedin')) {
      return { source: hostname.split('.')[0], medium: 'social' };
    } else if (hostname.includes('github')) {
      return { source: 'github', medium: 'referral' };
    } else {
      return { source: hostname, medium: 'referral' };
    }
  } catch (e) {
    return { source: 'other', medium: 'unknown' };
  }
}

// 가이드 정보 추출
function extractGuideInfo(data) {
  const info = {
    guideId: data.guide_id || '',
    guideName: data.guide_name || '',
    stepNumber: data.step_number || 0,
    stepName: data.step_name || '',
    progress: 0
  };
  
  // 가이드 총 단계 수 가져오기 (기본값 6)
  const totalSteps = getSettingValue('GUIDE_TOTAL_STEPS') || 6;
  
  // 가이드 진행률 계산
  if (data.eventType === 'guide_started') {
    info.progress = 0;
  } else if (data.eventType === 'guide_completed') {
    info.progress = 1;
  } else if (data.eventType === 'step_completed' && data.step_number) {
    info.progress = data.step_number / totalSteps;
  } else if (data.pageUrl && data.pageUrl.includes('/guide')) {
    // URL에서 진행률 추출 시도
    const match = data.pageUrl.match(/[?&]step=(\d+)/);
    if (match) {
      info.stepNumber = parseInt(match[1]);
      info.progress = info.stepNumber / totalSteps;
    }
  }
  
  return info;
}

// 액션 정보 추출
function extractActionInfo(data) {
  const info = {
    type: '',
    target: '',
    value: '',
    count: 0
  };
  
  if (data.eventType === 'cta_click' || data.eventType === 'button_click') {
    info.type = 'button_click';
    info.target = data.button_text || data.button_id || '';
    info.value = data.button_location || '';
    info.count = 1;
  } else if (data.eventType === 'scroll_depth') {
    info.type = 'scroll';
    info.target = 'page';
    info.value = data.percent + '%';
    info.count = 1;
  } else if (data.eventType === 'code_copy') {
    info.type = 'code_copy';
    info.target = data.code_type || 'code';
    info.value = data.step_number || '';
    info.count = 1;
  } else if (data.eventType === 'outbound_click') {
    info.type = 'outbound_click';
    info.target = data.link_url || '';
    info.value = data.link_text || '';
    info.count = 1;
  }
  
  return info;
}

// 에러 정보 추출
function extractErrorInfo(data) {
  const info = {
    isSuccess: true,
    type: '',
    message: ''
  };
  
  if (data.eventType === 'error' || data.eventType === 'error_occurred') {
    info.isSuccess = false;
    info.type = data.error_type || 'unknown';
    info.message = data.error_message || data.error_details || '';
  }
  
  return info;
}

// 피드백 정보 추출
function extractFeedbackInfo(data) {
  const info = {
    score: 0,
    text: ''
  };
  
  if (data.eventType === 'feedback_submitted') {
    // 이모지를 점수로 변환
    const emojiScores = {
      '😡': 1,
      '😟': 2,
      '😐': 3,
      '😊': 4,
      '😍': 5
    };
    info.score = emojiScores[data.emoji] || 0;
    info.text = data.feedback || data.text || '';
  }
  
  return info;
}

// 특별 이벤트 처리
function handleSpecialEvents(data, timestamp) {
  // 새 사용자인 경우 카운터 업데이트
  if (data.customData?.firstVisit === true) {
    updateCounterData('users', 1, data);
  }
  
  // 가이드 완료인 경우 카운터 업데이트
  if (data.eventType === 'guide_completed') {
    updateCounterData('completions', 1, data);
  }
  
  // 페이지 이탈 시 세션 시간 기록
  if (data.eventType === 'page_exit' || data.eventType === 'session_end') {
    // 세션 시간은 Raw_Events에서 집계
    logDebug('Session ended', { 
      userId: data.userId, 
      duration: data.duration 
    });
  }
}

// CountAPI_Data 업데이트
function updateCounterData(metric, change, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const counterSheet = ss.getSheetByName('CountAPI_Data');
  
  if (!counterSheet) return;
  
  // 현재 값 가져오기
  const lastRow = counterSheet.getLastRow();
  const currentValue = lastRow > 1 ? 
    counterSheet.getRange(lastRow, 3).getValue() : 
    getInitialCounterValue();
  
  const newValue = currentValue + change;
  
  // 새 행 추가
  counterSheet.appendRow([
    new Date(),
    metric,
    newValue,
    change,
    data.pageUrl || 'API',
    data.browser || '',
    hashIP(data.userId || '')
  ]);
  
  logDebug('Counter updated', { 
    metric: metric, 
    oldValue: currentValue, 
    newValue: newValue 
  });
}

// 초기 카운터 값 가져오기
function getInitialCounterValue() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName('Settings');
  
  if (!settingsSheet) return 15238;
  
  const values = settingsSheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === 'COUNTER_START_VALUE') {
      return parseInt(values[i][1]) || 15238;
    }
  }
  
  return 15238;
}

// 카운터 값 반환
function getCounterValue(metric) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const counterSheet = ss.getSheetByName('CountAPI_Data');
  
  if (!counterSheet) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'CountAPI_Data sheet not found'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const lastRow = counterSheet.getLastRow();
  const value = lastRow > 1 ? 
    counterSheet.getRange(lastRow, 3).getValue() : 
    getInitialCounterValue();
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    value: value,
    metric: metric || 'users'
  })).setMimeType(ContentService.MimeType.JSON);
}

// 설정값 가져오기
function getSettingValue(settingName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName('Settings');
  
  if (!settingsSheet) return null;
  
  const values = settingsSheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === settingName) {
      return values[i][1];
    }
  }
  
  return null;
}

// IP 해시 생성 (프라이버시 보호)
function hashIP(userId) {
  if (!userId) return '';
  
  // 간단한 해시 함수
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36).substring(0, 8);
}

// 디버그 로깅
function logDebug(message, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName('Settings');
  
  if (!settingsSheet) return;
  
  // DEBUG_MODE 확인
  const values = settingsSheet.getDataRange().getValues();
  let debugMode = false;
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === 'DEBUG_MODE' && values[i][1] === 'TRUE') {
      debugMode = true;
      break;
    }
  }
  
  if (debugMode) {
    console.log(`[${new Date().toISOString()}] ${message}`, data);
  }
}

// ===== 테스트 함수 =====

// 이벤트 처리 테스트
function testEventProcessing() {
  const testData = {
    eventType: 'page_view',
    userId: 'test_user_' + new Date().getTime(),
    sessionId: 'test_session_' + new Date().getTime(),
    pageUrl: 'https://claude-code-guide.vercel.app/guide',
    pageTitle: 'Guide - Claude Code Guide',
    timestamp: new Date().toISOString(),
    device: 'Desktop',
    os: 'MacOS',
    browser: 'Chrome',
    referrer: 'https://www.google.com/search?q=claude+code'
  };
  
  console.log('Testing event processing...');
  processEvent(testData);
  console.log('Test event processed successfully');
  
  // Raw_Events 시트 확인
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Raw_Events');
  const lastRow = sheet.getLastRow();
  const lastRowData = sheet.getRange(lastRow, 1, 1, 31).getValues()[0];
  
  console.log('Last row data:', lastRowData);
}

// 가이드 완료 이벤트 테스트
function testGuideCompletion() {
  const testData = {
    eventType: 'guide_completed',
    userId: 'test_user_complete_' + new Date().getTime(),
    sessionId: 'test_session_complete_' + new Date().getTime(),
    guide_id: 'claude-code-setup',
    guide_name: 'Claude Code 설치 가이드',
    total_steps: 6,
    duration: 1800, // 30분 (초 단위)
    pageUrl: 'https://claude-code-guide.vercel.app/guide?step=complete',
    timestamp: new Date().toISOString()
  };
  
  console.log('Testing guide completion...');
  processEvent(testData);
  console.log('Guide completion event processed successfully');
}

// 디버그 모드 토글
function toggleDebugMode() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName('Settings');
  
  if (!settingsSheet) {
    SpreadsheetApp.getUi().alert('Settings 시트를 찾을 수 없습니다.');
    return;
  }
  
  const values = settingsSheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === 'DEBUG_MODE') {
      const currentValue = values[i][1];
      const newValue = currentValue === 'TRUE' ? 'FALSE' : 'TRUE';
      settingsSheet.getRange(i + 1, 2).setValue(newValue);
      settingsSheet.getRange(i + 1, 4).setValue(new Date());
      
      SpreadsheetApp.getUi().alert(
        '디버그 모드', 
        `디버그 모드가 ${newValue === 'TRUE' ? '활성화' : '비활성화'}되었습니다.`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
  }
}

// Web App URL 표시
function showWebAppUrl() {
  const url = ScriptApp.getService().getUrl();
  if (url) {
    SpreadsheetApp.getUi().alert(
      '📌 Web App URL',
      `현재 배포된 URL:\n${url}\n\n이 URL을 Settings 시트의 APPS_SCRIPT_URL에 입력하세요.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    SpreadsheetApp.getUi().alert(
      '⚠️ 배포 필요',
      '아직 Web App이 배포되지 않았습니다.\n\n배포 방법:\n1. 배포 → 새 배포\n2. 유형: 웹 앱\n3. 실행: 나\n4. 액세스: 모든 사용자',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}