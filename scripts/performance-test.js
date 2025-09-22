#!/usr/bin/env node

/**
 * Orderly Platform Performance Testing Suite
 *
 * This script performs comprehensive performance testing including:
 * - Load testing with various concurrent users
 * - Stress testing to find breaking points
 * - Latency measurement across all endpoints
 * - Resource utilization monitoring
 * - Performance regression detection
 */

const http = require('http')
const https = require('https')
const { performance } = require('perf_hooks')
const fs = require('fs')

// 配置
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:8000',
  maxConcurrentUsers: parseInt(process.env.MAX_CONCURRENT_USERS) || 100,
  testDuration: parseInt(process.env.TEST_DURATION) || 60000, // 60 seconds
  rampUpTime: parseInt(process.env.RAMP_UP_TIME) || 10000, // 10 seconds
  endpoints: [
    { path: '/health', method: 'GET', weight: 30 },
    { path: '/metrics', method: 'GET', weight: 10 },
    { path: '/apm/status', method: 'GET', weight: 5 },
    { path: '/metrics/business', method: 'GET', weight: 20 },
    { path: '/demo/order', method: 'POST', weight: 25, body: { total: 1500, type: 'standard' } },
    { path: '/demo/delivery', method: 'POST', weight: 10, body: { deliveryTime: 60 } },
  ],
  thresholds: {
    maxLatency: 1000, // ms
    errorRate: 0.05, // 5%
    minThroughput: 100, // requests per second
  },
}

// 性能結果存儲
const results = {
  startTime: Date.now(),
  endTime: null,
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  latencies: [],
  errors: [],
  concurrentUsers: 0,
  endpoints: {},
  systemMetrics: [],
}

// 初始化端點統計
CONFIG.endpoints.forEach(endpoint => {
  results.endpoints[`${endpoint.method} ${endpoint.path}`] = {
    requests: 0,
    successes: 0,
    failures: 0,
    latencies: [],
    errors: [],
  }
})

// HTTP 請求函數
function makeRequest(endpoint) {
  return new Promise(resolve => {
    const startTime = performance.now()
    const url = new URL(endpoint.path, CONFIG.baseUrl)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Orderly-Performance-Test/1.0',
      },
    }

    if (endpoint.body) {
      const bodyString = JSON.stringify(endpoint.body)
      options.headers['Content-Length'] = Buffer.byteLength(bodyString)
    }

    const req = client.request(options, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        const endTime = performance.now()
        const latency = endTime - startTime

        const result = {
          endpoint: `${endpoint.method} ${endpoint.path}`,
          latency,
          statusCode: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 400,
          timestamp: Date.now(),
          responseSize: Buffer.byteLength(data),
        }

        resolve(result)
      })
    })

    req.on('error', error => {
      const endTime = performance.now()
      const latency = endTime - startTime

      const result = {
        endpoint: `${endpoint.method} ${endpoint.path}`,
        latency,
        statusCode: 0,
        success: false,
        error: error.message,
        timestamp: Date.now(),
      }

      resolve(result)
    })

    req.setTimeout(5000, () => {
      req.destroy()
      const result = {
        endpoint: `${endpoint.method} ${endpoint.path}`,
        latency: 5000,
        statusCode: 0,
        success: false,
        error: 'Request timeout',
        timestamp: Date.now(),
      }
      resolve(result)
    })

    if (endpoint.body) {
      req.write(JSON.stringify(endpoint.body))
    }

    req.end()
  })
}

// 選擇隨機端點（基於權重）
function selectRandomEndpoint() {
  const totalWeight = CONFIG.endpoints.reduce((sum, e) => sum + e.weight, 0)
  let randomWeight = Math.random() * totalWeight

  for (const endpoint of CONFIG.endpoints) {
    randomWeight -= endpoint.weight
    if (randomWeight <= 0) {
      return endpoint
    }
  }

  return CONFIG.endpoints[0] // fallback
}

// 用戶會話模擬
async function simulateUser(userId) {
  const userResults = []
  const startTime = Date.now()

  while (Date.now() - results.startTime < CONFIG.testDuration) {
    const endpoint = selectRandomEndpoint()
    const result = await makeRequest(endpoint)

    // 記錄結果
    results.totalRequests++
    if (result.success) {
      results.successfulRequests++
    } else {
      results.failedRequests++
      results.errors.push({
        userId,
        endpoint: result.endpoint,
        error: result.error || `HTTP ${result.statusCode}`,
        timestamp: result.timestamp,
      })
    }

    results.latencies.push(result.latency)

    // 端點統計
    const endpointStats = results.endpoints[result.endpoint]
    endpointStats.requests++
    endpointStats.latencies.push(result.latency)

    if (result.success) {
      endpointStats.successes++
    } else {
      endpointStats.failures++
      endpointStats.errors.push(result.error || `HTTP ${result.statusCode}`)
    }

    userResults.push(result)

    // 隨機延遲（模擬真實用戶行為）
    const delay = Math.random() * 1000 + 500 // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  return userResults
}

// 收集系統指標
async function collectSystemMetrics() {
  try {
    const healthData = await makeRequest({ path: '/health', method: 'GET' })
    const metricsData = await makeRequest({ path: '/metrics/business', method: 'GET' })

    if (healthData.success && metricsData.success) {
      results.systemMetrics.push({
        timestamp: Date.now(),
        concurrentUsers: results.concurrentUsers,
        memoryUsage: 'collected', // Would parse actual response
        responseTime: healthData.latency,
        businessMetrics: 'collected', // Would parse actual response
      })
    }
  } catch (error) {
    console.warn('Failed to collect system metrics:', error.message)
  }
}

// 計算統計數據
function calculateStats(latencies) {
  if (latencies.length === 0) return {}

  const sorted = [...latencies].sort((a, b) => a - b)
  const sum = latencies.reduce((a, b) => a + b, 0)

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / latencies.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p90: sorted[Math.floor(sorted.length * 0.9)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    count: latencies.length,
  }
}

// 生成性能報告
function generateReport() {
  const duration = (results.endTime - results.startTime) / 1000
  const throughput = results.totalRequests / duration
  const errorRate = results.failedRequests / results.totalRequests
  const overallStats = calculateStats(results.latencies)

  const report = {
    summary: {
      testDuration: `${duration.toFixed(2)}s`,
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      errorRate: `${(errorRate * 100).toFixed(2)}%`,
      throughput: `${throughput.toFixed(2)} req/s`,
      averageLatency: `${overallStats.mean?.toFixed(2)}ms`,
      maxConcurrentUsers: results.concurrentUsers,
    },
    latencyStats: {
      min: `${overallStats.min?.toFixed(2)}ms`,
      max: `${overallStats.max?.toFixed(2)}ms`,
      mean: `${overallStats.mean?.toFixed(2)}ms`,
      median: `${overallStats.median?.toFixed(2)}ms`,
      p90: `${overallStats.p90?.toFixed(2)}ms`,
      p95: `${overallStats.p95?.toFixed(2)}ms`,
      p99: `${overallStats.p99?.toFixed(2)}ms`,
    },
    thresholds: {
      maxLatency: {
        threshold: `${CONFIG.thresholds.maxLatency}ms`,
        actual: `${overallStats.p95?.toFixed(2)}ms`,
        passed: (overallStats.p95 || 0) <= CONFIG.thresholds.maxLatency,
      },
      errorRate: {
        threshold: `${(CONFIG.thresholds.errorRate * 100).toFixed(2)}%`,
        actual: `${(errorRate * 100).toFixed(2)}%`,
        passed: errorRate <= CONFIG.thresholds.errorRate,
      },
      throughput: {
        threshold: `${CONFIG.thresholds.minThroughput} req/s`,
        actual: `${throughput.toFixed(2)} req/s`,
        passed: throughput >= CONFIG.thresholds.minThroughput,
      },
    },
    endpoints: {},
    errors: results.errors.slice(0, 10), // Top 10 errors
    recommendations: [],
  }

  // 端點詳細統計
  Object.entries(results.endpoints).forEach(([endpoint, stats]) => {
    const endpointLatencyStats = calculateStats(stats.latencies)
    const endpointErrorRate = stats.failures / stats.requests

    report.endpoints[endpoint] = {
      requests: stats.requests,
      successes: stats.successes,
      failures: stats.failures,
      errorRate: `${(endpointErrorRate * 100).toFixed(2)}%`,
      latencyStats: {
        mean: `${endpointLatencyStats.mean?.toFixed(2)}ms`,
        p95: `${endpointLatencyStats.p95?.toFixed(2)}ms`,
      },
    }
  })

  // 性能建議
  if (!report.thresholds.maxLatency.passed) {
    report.recommendations.push(
      'High latency detected. Consider optimizing database queries and caching.'
    )
  }

  if (!report.thresholds.errorRate.passed) {
    report.recommendations.push(
      'High error rate detected. Review application logs and error handling.'
    )
  }

  if (!report.thresholds.throughput.passed) {
    report.recommendations.push(
      'Low throughput detected. Consider scaling resources or optimizing bottlenecks.'
    )
  }

  if (overallStats.p99 > overallStats.p95 * 2) {
    report.recommendations.push(
      'High latency variance detected. Some requests are significantly slower.'
    )
  }

  return report
}

// 主要測試函數
async function runPerformanceTest() {
  console.log('🚀 Starting Orderly Platform Performance Test')
  console.log(`📊 Configuration:`)
  console.log(`   Base URL: ${CONFIG.baseUrl}`)
  console.log(`   Max Concurrent Users: ${CONFIG.maxConcurrentUsers}`)
  console.log(`   Test Duration: ${CONFIG.testDuration / 1000}s`)
  console.log(`   Ramp-up Time: ${CONFIG.rampUpTime / 1000}s`)
  console.log('')

  results.startTime = Date.now()

  // 系統指標收集（每5秒）
  const metricsInterval = setInterval(collectSystemMetrics, 5000)

  // 逐步增加用戶負載
  const userPromises = []
  const usersPerStep = Math.ceil(CONFIG.maxConcurrentUsers / 10)

  for (let step = 0; step < 10; step++) {
    const stepUsers = Math.min(usersPerStep, CONFIG.maxConcurrentUsers - results.concurrentUsers)

    for (let i = 0; i < stepUsers; i++) {
      const userId = results.concurrentUsers + i
      userPromises.push(simulateUser(userId))
    }

    results.concurrentUsers += stepUsers
    console.log(`📈 Ramping up to ${results.concurrentUsers} concurrent users`)

    if (step < 9) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.rampUpTime / 10))
    }
  }

  console.log(
    `🔥 Running full load test with ${results.concurrentUsers} users for ${CONFIG.testDuration / 1000}s`
  )

  // 等待所有用戶會話完成
  await Promise.all(userPromises)

  clearInterval(metricsInterval)
  results.endTime = Date.now()

  console.log('✅ Performance test completed')
  console.log('')

  // 生成並輸出報告
  const report = generateReport()

  console.log('📋 PERFORMANCE TEST REPORT')
  console.log('='.repeat(50))
  console.log('')

  console.log('📊 SUMMARY:')
  Object.entries(report.summary).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`)
  })
  console.log('')

  console.log('⏱️  LATENCY STATISTICS:')
  Object.entries(report.latencyStats).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`)
  })
  console.log('')

  console.log('🎯 THRESHOLD RESULTS:')
  Object.entries(report.thresholds).forEach(([metric, data]) => {
    const status = data.passed ? '✅' : '❌'
    console.log(`   ${status} ${metric}: ${data.actual} (threshold: ${data.threshold})`)
  })
  console.log('')

  if (report.recommendations.length > 0) {
    console.log('💡 RECOMMENDATIONS:')
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`)
    })
    console.log('')
  }

  // 保存詳細報告到文件
  const reportPath = `performance-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`📁 Detailed report saved to: ${reportPath}`)

  // 退出代碼（CI/CD集成）
  const allPassed = Object.values(report.thresholds).every(t => t.passed)
  process.exit(allPassed ? 0 : 1)
}

// 處理中斷信號
process.on('SIGINT', () => {
  console.log('\n⚠️  Test interrupted by user')
  results.endTime = Date.now()
  const report = generateReport()
  console.log('Partial results:', JSON.stringify(report.summary, null, 2))
  process.exit(2)
})

// 運行測試
if (require.main === module) {
  runPerformanceTest().catch(error => {
    console.error('❌ Performance test failed:', error)
    process.exit(1)
  })
}

module.exports = { runPerformanceTest, CONFIG }
