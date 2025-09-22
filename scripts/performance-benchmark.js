#!/usr/bin/env node
/**
 * Performance Benchmark Suite
 * 測試 FastAPI 產品服務的性能基準
 * 測量響應時間、吞吐量、併發處理能力
 */

const fetch = require('node-fetch')
const { performance } = require('perf_hooks')

// 測試配置
const config = {
  baseUrl: 'http://localhost:8000/api/products',
  directUrl: 'http://localhost:3003/api/products',
  concurrency: [1, 5, 10, 20, 50],
  iterations: 100,
  timeout: 30000,
}

// 顏色輸出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

const log = {
  success: msg => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: msg => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: msg => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: msg => console.log(`${colors.bold}${colors.cyan}🚀 ${msg}${colors.reset}`),
  metric: (label, value, unit = '') =>
    console.log(
      `  ${colors.cyan}${label}:${colors.reset} ${colors.bold}${value}${unit}${colors.reset}`
    ),
}

/**
 * 執行單個 HTTP 請求並測量性能
 */
async function makeRequest(url) {
  const start = performance.now()
  try {
    const response = await fetch(url, { timeout: config.timeout })
    const end = performance.now()
    const responseTime = end - start

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}`, responseTime }
    }

    const data = await response.json()
    return {
      success: true,
      responseTime,
      status: response.status,
      dataSize: JSON.stringify(data).length,
    }
  } catch (error) {
    const end = performance.now()
    return {
      success: false,
      error: error.message,
      responseTime: end - start,
    }
  }
}

/**
 * 執行併發測試
 */
async function runConcurrentTest(url, description, concurrency, iterations) {
  log.header(`${description} (併發: ${concurrency}, 迭代: ${iterations})`)

  const results = []
  const batchSize = Math.ceil(iterations / concurrency)
  const startTime = performance.now()

  // 分批執行並發請求
  for (let batch = 0; batch < concurrency; batch++) {
    const batchPromises = []
    const actualBatchSize = Math.min(batchSize, iterations - batch * batchSize)

    for (let i = 0; i < actualBatchSize; i++) {
      batchPromises.push(makeRequest(url))
    }

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }

  const totalTime = performance.now() - startTime

  // 計算統計數據
  const successfulRequests = results.filter(r => r.success)
  const failedRequests = results.filter(r => !r.success)

  if (successfulRequests.length === 0) {
    log.error('所有請求都失敗了')
    return null
  }

  const responseTimes = successfulRequests.map(r => r.responseTime)
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
  const minResponseTime = Math.min(...responseTimes)
  const maxResponseTime = Math.max(...responseTimes)

  // 計算百分位數
  const sortedTimes = responseTimes.sort((a, b) => a - b)
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)]
  const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)]
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)]
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)]

  const successRate = (successfulRequests.length / results.length) * 100
  const requestsPerSecond = (results.length / totalTime) * 1000

  // 輸出統計結果
  log.metric('總請求數', results.length)
  log.metric('成功請求', successfulRequests.length)
  log.metric('失敗請求', failedRequests.length)
  log.metric('成功率', `${successRate.toFixed(2)}%`)
  log.metric('總耗時', `${totalTime.toFixed(2)}ms`)
  log.metric('QPS', requestsPerSecond.toFixed(2))

  console.log('')
  log.info('響應時間統計:')
  log.metric('  平均', `${avgResponseTime.toFixed(2)}ms`)
  log.metric('  最小', `${minResponseTime.toFixed(2)}ms`)
  log.metric('  最大', `${maxResponseTime.toFixed(2)}ms`)
  log.metric('  P50', `${p50.toFixed(2)}ms`)
  log.metric('  P90', `${p90.toFixed(2)}ms`)
  log.metric('  P95', `${p95.toFixed(2)}ms`)
  log.metric('  P99', `${p99.toFixed(2)}ms`)

  if (failedRequests.length > 0) {
    console.log('')
    log.warning('失敗請求錯誤統計:')
    const errorCounts = {}
    failedRequests.forEach(req => {
      errorCounts[req.error] = (errorCounts[req.error] || 0) + 1
    })
    Object.entries(errorCounts).forEach(([error, count]) => {
      log.metric(`  ${error}`, count)
    })
  }

  return {
    concurrency,
    iterations,
    totalTime,
    successRate,
    requestsPerSecond,
    avgResponseTime,
    p50,
    p90,
    p95,
    p99,
    minResponseTime,
    maxResponseTime,
  }
}

/**
 * 執行端點穩定性測試
 */
async function runStabilityTest(url, description, duration = 60000) {
  log.header(`${description} - 穩定性測試 (${duration / 1000}秒)`)

  const results = []
  const startTime = performance.now()
  let requestCount = 0

  while (performance.now() - startTime < duration) {
    const result = await makeRequest(url)
    results.push(result)
    requestCount++

    // 每10個請求報告一次進度
    if (requestCount % 10 === 0) {
      const elapsed = (performance.now() - startTime) / 1000
      const qps = requestCount / elapsed
      process.stdout.write(
        `\r  進度: ${requestCount} 請求, ${elapsed.toFixed(1)}s, QPS: ${qps.toFixed(2)}`
      )
    }

    // 短暫停頓避免過度負載
    await new Promise(resolve => setTimeout(resolve, 10))
  }

  console.log('\n')

  const successfulRequests = results.filter(r => r.success)
  const successRate = (successfulRequests.length / results.length) * 100
  const totalTime = performance.now() - startTime
  const avgQPS = (results.length / totalTime) * 1000

  log.metric('測試時長', `${(totalTime / 1000).toFixed(2)}s`)
  log.metric('總請求數', results.length)
  log.metric('成功率', `${successRate.toFixed(2)}%`)
  log.metric('平均 QPS', avgQPS.toFixed(2))

  if (successfulRequests.length > 0) {
    const avgResponseTime =
      successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length
    log.metric('平均響應時間', `${avgResponseTime.toFixed(2)}ms`)
  }

  return { successRate, avgQPS, totalRequests: results.length }
}

/**
 * 主基準測試函數
 */
async function runBenchmarks() {
  console.log(`${colors.bold}${colors.cyan}`)
  console.log('╔══════════════════════════════════════╗')
  console.log('║       FastAPI 性能基準測試           ║')
  console.log('║     響應時間、吞吐量、穩定性測試     ║')
  console.log('╚══════════════════════════════════════╝')
  console.log(colors.reset)

  const testEndpoints = [
    {
      name: 'API Gateway - 產品統計',
      url: `${config.baseUrl}/products/stats`,
    },
    {
      name: 'Direct FastAPI - 產品統計',
      url: `${config.directUrl}/products/stats`,
    },
    {
      name: 'API Gateway - 產品列表',
      url: `${config.baseUrl}/products?limit=10`,
    },
    {
      name: 'Direct FastAPI - 產品列表',
      url: `${config.directUrl}/products?limit=10`,
    },
  ]

  const benchmarkResults = []

  // 1. 併發性能測試
  for (const endpoint of testEndpoints) {
    console.log(`\n${colors.bold}=== ${endpoint.name} ===${colors.reset}\n`)

    for (const concurrency of config.concurrency) {
      const result = await runConcurrentTest(
        endpoint.url,
        endpoint.name,
        concurrency,
        Math.min(config.iterations, concurrency * 20)
      )

      if (result) {
        benchmarkResults.push({
          endpoint: endpoint.name,
          ...result,
        })
      }

      console.log('') // 空行分隔

      // 短暫停頓讓系統恢復
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // 2. 穩定性測試
  console.log(`\n${colors.bold}${colors.cyan}=== 穩定性測試 ===${colors.reset}\n`)

  for (const endpoint of testEndpoints.slice(0, 2)) {
    // 只測試統計端點的穩定性
    await runStabilityTest(endpoint.url, endpoint.name, 30000) // 30秒測試
    console.log('')
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // 3. 性能摘要報告
  console.log(`\n${colors.bold}${colors.cyan}=== 性能摘要報告 ===${colors.reset}\n`)

  const groupedResults = {}
  benchmarkResults.forEach(result => {
    if (!groupedResults[result.endpoint]) {
      groupedResults[result.endpoint] = []
    }
    groupedResults[result.endpoint].push(result)
  })

  Object.entries(groupedResults).forEach(([endpoint, results]) => {
    log.header(`${endpoint} 性能摘要`)

    const maxQPS = Math.max(...results.map(r => r.requestsPerSecond))
    const bestP95 = Math.min(...results.map(r => r.p95))
    const worstP95 = Math.max(...results.map(r => r.p95))

    log.metric('最大 QPS', maxQPS.toFixed(2))
    log.metric('最佳 P95', `${bestP95.toFixed(2)}ms`)
    log.metric('最差 P95', `${worstP95.toFixed(2)}ms`)

    // 性能評級
    if (maxQPS > 100 && bestP95 < 100) {
      log.success('性能等級: 優秀 🚀')
    } else if (maxQPS > 50 && bestP95 < 200) {
      log.info('性能等級: 良好 👍')
    } else if (maxQPS > 20 && bestP95 < 500) {
      log.warning('性能等級: 一般 ⚠️')
    } else {
      log.error('性能等級: 需要優化 ⚠️')
    }

    console.log('')
  })

  log.success('🎉 性能基準測試完成！')
}

// 錯誤處理並執行測試
process.on('unhandledRejection', (reason, promise) => {
  log.error(`未處理的Promise拒絕: ${reason}`)
  process.exit(1)
})

runBenchmarks().catch(error => {
  log.error(`基準測試執行失敗: ${error.message}`)
  console.error(error.stack)
  process.exit(1)
})
