// ===== Google Analytics 4 데이터 가져오기 =====
// GA4 Reporting API를 사용하여 실제 GA4 데이터를 가져옴

// GA4 데이터 가져오기 메인 함수
function importGA4Data() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // 설정 확인
    const propertyId = getSettingValue('GA4_PROPERTY_ID');
    if (!propertyId) {
      ui.alert('⚠️ 설정 필요', 'Settings 시트에 GA4_PROPERTY_ID를 설정해주세요.', ui.ButtonSet.OK);
      return;
    }
    
    // 날짜 범위 설정 (최근 30일)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // GA4 API 호출
    const response = AnalyticsData.Properties.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      }],
      dimensions: [
        { name: 'date' },
        { name: 'pagePath' },
        { name: 'sessionSource' },
        { name: 'sessionMedium' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' }
      ],
      orderBys: [{
        dimension: { dimensionName: 'date' },
        desc: false
      }]
    });
    
    // GA4_Data 시트에 데이터 기록
    updateGA4DataSheet(response);
    
    ui.alert('✅ 완료', 'GA4 데이터를 성공적으로 가져왔습니다.', ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('GA4 Import Error:', error);
    ui.alert('❌ 오류', 'GA4 데이터 가져오기 실패:\n' + error.toString(), ui.ButtonSet.OK);
  }
}

// GA4 데이터를 시트에 업데이트
function updateGA4DataSheet(response) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('GA4_Data');
  
  if (!sheet) {
    throw new Error('GA4_Data 시트를 찾을 수 없습니다.');
  }
  
  // 기존 데이터 삭제 (헤더 제외)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  
  // 새 데이터 추가
  const rows = [];
  
  if (response.rows) {
    response.rows.forEach(row => {
      const date = parseGA4Date(row.dimensionValues[0].value);
      const pagePath = row.dimensionValues[1].value;
      const source = row.dimensionValues[2].value || 'direct';
      const medium = row.dimensionValues[3].value || 'none';
      
      const sessions = parseInt(row.metricValues[0].value);
      const users = parseInt(row.metricValues[1].value);
      const pageViews = parseInt(row.metricValues[2].value);
      const avgDurationMinutes = parseFloat(row.metricValues[3].value) / 60; // 초를 분으로 변환
      const bounceRate = parseFloat(row.metricValues[4].value);
      
      rows.push([
        date,
        pagePath,
        sessions,
        users,
        pageViews,
        avgDurationMinutes,
        bounceRate,
        source,
        medium
      ]);
    });
    
    // 데이터 추가
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 9).setValues(rows);
    }
  }
  
  // 마지막 업데이트 시간 Settings에 기록
  updateSetting('GA4_LAST_IMPORT', new Date().toISOString());
}

// GA4 날짜 형식 파싱
function parseGA4Date(dateString) {
  // YYYYMMDD 형식을 Date 객체로 변환
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  return new Date(`${year}-${month}-${day}`);
}

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 설정값 가져오기
function getSettingValue(settingName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Settings');
  
  if (!sheet) return null;
  
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === settingName) {
      return values[i][1];
    }
  }
  
  return null;
}

// 설정값 업데이트
function updateSetting(settingName, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Settings');
  
  if (!sheet) return;
  
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === settingName) {
      sheet.getRange(i + 1, 2).setValue(value);
      sheet.getRange(i + 1, 4).setValue(new Date());
      return;
    }
  }
  
  // 설정이 없으면 새로 추가
  sheet.appendRow([settingName, value, 'Auto-generated setting', new Date()]);
}

// 자동 실행 트리거 설정
function setupGA4ImportTrigger() {
  const ui = SpreadsheetApp.getUi();
  
  // 기존 트리거 삭제
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'importGA4Data') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 새 트리거 생성 (매일 오전 2시)
  ScriptApp.newTrigger('importGA4Data')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
    
  ui.alert('✅ 설정 완료', 'GA4 데이터 자동 가져오기가 설정되었습니다.\n매일 오전 2시에 자동으로 실행됩니다.', ui.ButtonSet.OK);
}

// 메뉴에 추가할 함수
function addGA4MenuItems() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('📊 GA4 연동')
    .addItem('GA4 데이터 가져오기', 'importGA4Data')
    .addItem('자동 가져오기 설정', 'setupGA4ImportTrigger')
    .addSeparator()
    .addItem('API 권한 확인', 'checkGA4Permissions');
    
  return menu;
}

// GA4 API 권한 확인
function checkGA4Permissions() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // 간단한 API 호출로 권한 확인
    const propertyId = getSettingValue('GA4_PROPERTY_ID');
    if (!propertyId) {
      ui.alert('⚠️ 설정 필요', 'Settings 시트에 GA4_PROPERTY_ID를 설정해주세요.', ui.ButtonSet.OK);
      return;
    }
    
    AnalyticsData.Properties.getMetadata({
      name: `properties/${propertyId}/metadata`
    });
    
    ui.alert('✅ 권한 확인', 'GA4 API 접근 권한이 정상적으로 설정되어 있습니다.', ui.ButtonSet.OK);
    
  } catch (error) {
    ui.alert(
      '❌ 권한 오류', 
      'GA4 API 접근 권한이 없습니다.\n\n' +
      '해결 방법:\n' +
      '1. Google Cloud Console에서 Analytics Data API 활성화\n' +
      '2. GA4 속성에 대한 읽기 권한 확인\n' +
      '3. Apps Script에서 서비스 추가:\n' +
      '   - 서비스 추가 → Google Analytics Data API\n\n' +
      '오류: ' + error.toString(), 
      ui.ButtonSet.OK
    );
  }
}