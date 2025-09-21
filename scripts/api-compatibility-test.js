#!/usr/bin/env node
/**
 * API Functional Test Suite
 * 測試 FastAPI 產品服務的功能性和性能
 * 確保 API 端點正常運作
 */

const fetch = require('node-fetch');
const { performance } = require('perf_hooks');

// 測試配置
const config = {
  apiGateway: 'http://localhost:8000/api/products',
  directFastAPI: 'http://localhost:3003/api/products',
  timeout: 10000
};

// 顏色輸出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.blue}🔍 ${msg}${colors.reset}`)
};

/**
 * 測試 API 端點並測量性能
 */
async function testEndpoint(url, description) {
  try {
    const start = performance.now();
    const response = await fetch(url, { timeout: config.timeout });
    const end = performance.now();
    
    const responseTime = Math.round(end - start);
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      responseTime,
      data,
      headers: response.headers.raw ? response.headers.raw() : {}
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: 0
    };
  }
}

/**
 * 比較兩個對象的結構
 */
function compareStructure(obj1, obj2, path = '') {
  const differences = [];
  
  if (typeof obj1 !== typeof obj2) {
    differences.push(`${path}: Type mismatch - ${typeof obj1} vs ${typeof obj2}`);
    return differences;
  }
  
  if (obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      differences.push(`${path}: Null mismatch - ${obj1} vs ${obj2}`);
    }
    return differences;
  }
  
  if (typeof obj1 === 'object' && !Array.isArray(obj1)) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    // 檢查缺失的鍵
    for (const key of keys1) {
      if (!keys2.includes(key)) {
        differences.push(`${path}.${key}: Missing in second object`);
      }
    }
    
    for (const key of keys2) {
      if (!keys1.includes(key)) {
        differences.push(`${path}.${key}: Extra in second object`);
      }
    }
    
    // 遞歸比較共同的鍵
    for (const key of keys1) {
      if (keys2.includes(key)) {
        differences.push(...compareStructure(obj1[key], obj2[key], `${path}.${key}`));
      }
    }
  } else if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length > 0 && obj2.length > 0) {
      differences.push(...compareStructure(obj1[0], obj2[0], `${path}[0]`));
    }
  }
  
  return differences;
}

/**
 * 執行單個測試
 */
async function runSingleTest(testName, apiGatewayUrl, directUrl) {
  log.header(`測試: ${testName}`);
  
  // 並行測試兩個端點
  const [gatewayResult, directResult] = await Promise.all([
    testEndpoint(apiGatewayUrl, 'API Gateway'),
    testEndpoint(directUrl, 'Direct FastAPI')
  ]);
  
  // 檢查響應狀態
  if (!gatewayResult.success) {
    log.error(`API Gateway 端點失敗: ${gatewayResult.error}`);
    return false;
  }
  
  if (!directResult.success) {
    log.error(`Direct FastAPI 端點失敗: ${directResult.error}`);
    return false;
  }
  
  // 比較響應狀態碼
  if (gatewayResult.status !== directResult.status) {
    log.error(`狀態碼不匹配: Gateway(${gatewayResult.status}) vs Direct(${directResult.status})`);
    return false;
  }
  
  // 比較響應結構
  const structureDiffs = compareStructure(gatewayResult.data, directResult.data);
  if (structureDiffs.length > 0) {
    log.error('響應結構不匹配:');
    structureDiffs.forEach(diff => console.log(`  ${diff}`));
    return false;
  }
  
  // 性能比較
  const performanceRatio = gatewayResult.responseTime / directResult.responseTime;
  const performanceChange = ((gatewayResult.responseTime - directResult.responseTime) / directResult.responseTime * 100).toFixed(1);
  
  log.success(`結構完全匹配`);
  log.info(`性能比較: Gateway(${gatewayResult.responseTime}ms) vs Direct(${directResult.responseTime}ms)`);
  
  if (performanceRatio < 1.2) {
    log.success(`Gateway 性能良好 (額外延遲 ${Math.abs(performanceChange)}%)`);
  } else if (performanceRatio > 2.0) {
    log.warning(`Gateway 延遲過高 ${performanceChange}%`);
  } else {
    log.info(`Gateway 延遲可接受 (額外 ${performanceChange}%)`);
  }
  
  return true;
}

/**
 * 主測試函數
 */
async function runCompatibilityTests() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔══════════════════════════════════════╗');
  console.log('║       API 功能性測試套件             ║');
  console.log('║  Gateway vs Direct FastAPI 對比      ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(colors.reset);
  
  const tests = [
    {
      name: '產品統計資料',
      gateway: `${config.apiGateway}/products/stats`,
      direct: `${config.directFastAPI}/products/stats`
    },
    {
      name: '產品列表 (前5個)',
      gateway: `${config.apiGateway}/products?limit=5`,
      direct: `${config.directFastAPI}/products?limit=5`
    },
    {
      name: '產品搜尋 (蔬菜)',
      gateway: `${config.apiGateway}/products?search=${encodeURIComponent('蔬菜')}&limit=3`,
      direct: `${config.directFastAPI}/products?search=${encodeURIComponent('蔬菜')}&limit=3`
    },
    {
      name: '類別列表',
      gateway: `${config.apiGateway}/categories`,
      direct: `${config.directFastAPI}/categories`
    }
  ];
  
  let passedTests = 0;
  const totalTests = tests.length;
  
  for (const test of tests) {
    const result = await runSingleTest(test.name, test.gateway, test.direct);
    if (result) {
      passedTests++;
    }
    console.log(''); // 空行分隔
  }
  
  // 輸出總結
  console.log(`${colors.bold}${colors.blue}📊 測試總結:${colors.reset}`);
  console.log(`✅ 通過: ${passedTests}/${totalTests}`);
  console.log(`❌ 失敗: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    log.success('🎉 所有測試通過！API Gateway 和 FastAPI 服務正常運作');
    process.exit(0);
  } else {
    log.error('❌ 部分測試失敗，需要修復功能性問題');
    process.exit(1);
  }
}

// 執行測試
runCompatibilityTests().catch(error => {
  log.error(`測試執行失敗: ${error.message}`);
  process.exit(1);
});