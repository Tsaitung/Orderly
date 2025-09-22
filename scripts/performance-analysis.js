#!/usr/bin/env node

/**
 * Orderly Platform Performance Analysis Tool
 *
 * This script analyzes the current system performance and provides
 * optimization recommendations based on collected metrics.
 */

const http = require('http')
const { performance } = require('perf_hooks')

// 配置
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:8000',
  analysisEndpoints: [
    '/health',
    '/metrics',
    '/apm/status',
    '/metrics/business',
    '/metrics/business/health',
  ],
}

// 性能分析結果
const analysis = {
  timestamp: new Date().toISOString(),
  systemHealth: {},
  performanceMetrics: {},
  businessMetrics: {},
  apmStatus: {},
  recommendations: [],
  optimizationPriority: [],
}

// HTTP 請求函數
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now()
    const url = new URL(path, CONFIG.baseUrl)

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Orderly-Performance-Analysis/1.0',
      },
    }

    const req = http.request(options, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        const endTime = performance.now()
        const latency = endTime - startTime

        try {
          const parsedData = JSON.parse(data)
          resolve({
            statusCode: res.statusCode,
            latency,
            data: parsedData,
            success: res.statusCode >= 200 && res.statusCode < 400,
          })
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            latency,
            data: data,
            success: res.statusCode >= 200 && res.statusCode < 400,
            parseError: error.message,
          })
        }
      })
    })

    req.on('error', error => {
      reject(error)
    })

    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

// 分析系統健康狀況
function analyzeSystemHealth(healthData) {
  const health = healthData.data

  analysis.systemHealth = {
    status: health.status,
    uptime: health.uptime,
    memory: health.memory,
    environment: health.environment,
    responseTime: healthData.latency,
  }

  // 內存使用分析
  if (health.memory) {
    const heapUsed = health.memory.heapUsed
    const heapTotal = health.memory.heapTotal
    const memoryUsagePercent = (heapUsed / heapTotal) * 100

    if (memoryUsagePercent > 80) {
      analysis.recommendations.push({
        priority: 'high',
        category: 'memory',
        issue: 'High memory usage detected',
        description: `Memory usage at ${memoryUsagePercent.toFixed(1)}%`,
        solution: 'Consider implementing memory optimization strategies or scaling resources',
      })
    }
  }

  // 響應時間分析
  if (healthData.latency > 100) {
    analysis.recommendations.push({
      priority: 'medium',
      category: 'latency',
      issue: 'Slow health check response',
      description: `Health endpoint took ${healthData.latency.toFixed(1)}ms`,
      solution: 'Optimize health check operations and reduce dependency checks',
    })
  }

  return analysis.systemHealth
}

// 分析業務指標
function analyzeBusinessMetrics(businessData) {
  const business = businessData.data

  analysis.businessMetrics = {
    orders: business.orders,
    users: business.users,
    supplyChain: business.supplyChain,
    financial: business.financial,
    system: business.system,
    responseTime: businessData.latency,
  }

  // 訂單處理分析
  if (business.orders && business.orders.total > 0) {
    const completionRate = (business.orders.completed / business.orders.total) * 100

    if (completionRate < 80) {
      analysis.recommendations.push({
        priority: 'high',
        category: 'business',
        issue: 'Low order completion rate',
        description: `Only ${completionRate.toFixed(1)}% of orders are completed`,
        solution: 'Review order processing workflow and identify bottlenecks',
      })
    }

    if (business.orders.avgValue < 1000) {
      analysis.recommendations.push({
        priority: 'low',
        category: 'business',
        issue: 'Low average order value',
        description: `Average order value is ${business.orders.avgValue} TWD`,
        solution: 'Consider strategies to increase order values',
      })
    }
  }

  // 供應鏈分析
  if (business.supplyChain && business.supplyChain.avgQuality < 85) {
    analysis.recommendations.push({
      priority: 'medium',
      category: 'supply_chain',
      issue: 'Supply chain quality below target',
      description: `Average quality score is ${business.supplyChain.avgQuality}`,
      solution: 'Implement supplier quality improvement programs',
    })
  }

  // 系統性能分析
  if (business.system && business.system.avgResponseTime > 100) {
    analysis.recommendations.push({
      priority: 'high',
      category: 'performance',
      issue: 'High average response time',
      description: `System average response time is ${business.system.avgResponseTime}ms`,
      solution: 'Optimize database queries and implement caching strategies',
    })
  }

  return analysis.businessMetrics
}

// 分析 APM 狀態
function analyzeAPMStatus(apmData) {
  const apm = apmData.data

  analysis.apmStatus = {
    enabled: apm.enabled,
    initialized: apm.initialized,
    metrics: apm.metrics,
    traces: apm.traces,
    integrations: apm.integrations,
    responseTime: apmData.latency,
  }

  // APM 覆蓋分析
  if (!apm.integrations.datadog && !apm.integrations.newrelic) {
    analysis.recommendations.push({
      priority: 'low',
      category: 'monitoring',
      issue: 'No external APM integrations enabled',
      description: 'Both DataDog and New Relic integrations are disabled',
      solution: 'Enable APM integrations for better production monitoring',
    })
  }

  // 追蹤數據分析
  if (apm.traces && apm.traces.active > apm.traces.completed * 0.2) {
    analysis.recommendations.push({
      priority: 'medium',
      category: 'monitoring',
      issue: 'High number of active traces',
      description: `${apm.traces.active} active traces vs ${apm.traces.completed} completed`,
      solution: 'Review trace lifecycle management and cleanup processes',
    })
  }

  return analysis.apmStatus
}

// 分析性能指標
function analyzePerformanceMetrics(metricsData) {
  analysis.performanceMetrics = {
    responseTime: metricsData.latency,
    dataTransferred: metricsData.data.length || 0,
  }

  // Prometheus 指標響應時間
  if (metricsData.latency > 500) {
    analysis.recommendations.push({
      priority: 'medium',
      category: 'monitoring',
      issue: 'Slow metrics collection',
      description: `Metrics endpoint took ${metricsData.latency.toFixed(1)}ms`,
      solution: 'Optimize metrics collection and consider metric aggregation',
    })
  }

  return analysis.performanceMetrics
}

// 生成優化建議優先級
function generateOptimizationPriority() {
  const priorityOrder = { high: 3, medium: 2, low: 1 }

  const sortedRecommendations = analysis.recommendations.sort((a, b) => {
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })

  analysis.optimizationPriority = sortedRecommendations.map((rec, index) => ({
    rank: index + 1,
    priority: rec.priority,
    category: rec.category,
    issue: rec.issue,
    impact: rec.priority === 'high' ? 'Critical' : rec.priority === 'medium' ? 'Moderate' : 'Minor',
    effort: estimateEffort(rec.category),
  }))

  return analysis.optimizationPriority
}

// 估算優化工作量
function estimateEffort(category) {
  const effortMap = {
    memory: 'Medium',
    latency: 'High',
    business: 'Low',
    supply_chain: 'Medium',
    performance: 'High',
    monitoring: 'Low',
  }

  return effortMap[category] || 'Medium'
}

// 生成性能報告
function generatePerformanceReport() {
  const report = {
    summary: {
      analysisTime: analysis.timestamp,
      overallStatus: analysis.recommendations.length === 0 ? 'Optimal' : 'Needs Optimization',
      totalRecommendations: analysis.recommendations.length,
      highPriorityIssues: analysis.recommendations.filter(r => r.priority === 'high').length,
      systemResponseTime: analysis.systemHealth.responseTime,
    },
    healthCheck: {
      status: analysis.systemHealth.status,
      uptime: `${(analysis.systemHealth.uptime / 3600).toFixed(1)} hours`,
      memoryUsage: analysis.systemHealth.memory
        ? `${((analysis.systemHealth.memory.heapUsed / analysis.systemHealth.memory.heapTotal) * 100).toFixed(1)}%`
        : 'N/A',
      environment: analysis.systemHealth.environment,
    },
    performanceSnapshot: {
      avgResponseTime: analysis.businessMetrics.system?.avgResponseTime || 'N/A',
      orderCompletionRate: analysis.businessMetrics.orders
        ? `${((analysis.businessMetrics.orders.completed / analysis.businessMetrics.orders.total) * 100).toFixed(1)}%`
        : 'N/A',
      supplyChainQuality: analysis.businessMetrics.supplyChain?.avgQuality || 'N/A',
      apmStatus: analysis.apmStatus.enabled ? 'Active' : 'Disabled',
    },
    recommendations: analysis.recommendations,
    optimizationRoadmap: analysis.optimizationPriority.slice(0, 5), // Top 5 priorities
  }

  return report
}

// 主要分析函數
async function runPerformanceAnalysis() {
  console.log('🔍 Starting Orderly Platform Performance Analysis')
  console.log(`📊 Analyzing system at: ${CONFIG.baseUrl}`)
  console.log('')

  try {
    // 收集所有端點數據
    console.log('📡 Collecting system metrics...')

    const [healthResponse, metricsResponse, apmResponse, businessResponse] = await Promise.all([
      makeRequest('/health'),
      makeRequest('/metrics'),
      makeRequest('/apm/status'),
      makeRequest('/metrics/business'),
    ])

    console.log('✅ Metrics collected successfully')
    console.log('')

    // 執行分析
    console.log('🧮 Analyzing performance data...')

    analyzeSystemHealth(healthResponse)
    analyzePerformanceMetrics(metricsResponse)
    analyzeAPMStatus(apmResponse)
    analyzeBusinessMetrics(businessResponse)

    generateOptimizationPriority()

    console.log('✅ Analysis completed')
    console.log('')

    // 生成報告
    const report = generatePerformanceReport()

    console.log('📋 PERFORMANCE ANALYSIS REPORT')
    console.log('='.repeat(50))
    console.log('')

    console.log('📊 SUMMARY:')
    Object.entries(report.summary).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`)
    })
    console.log('')

    console.log('🏥 HEALTH CHECK:')
    Object.entries(report.healthCheck).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`)
    })
    console.log('')

    console.log('⚡ PERFORMANCE SNAPSHOT:')
    Object.entries(report.performanceSnapshot).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`)
    })
    console.log('')

    if (report.recommendations.length > 0) {
      console.log('💡 OPTIMIZATION RECOMMENDATIONS:')
      report.recommendations.forEach((rec, index) => {
        const priorityIcon =
          rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'
        console.log(`   ${priorityIcon} [${rec.priority.toUpperCase()}] ${rec.issue}`)
        console.log(`      ${rec.description}`)
        console.log(`      Solution: ${rec.solution}`)
        console.log('')
      })
    } else {
      console.log('🎉 No optimization recommendations - system is performing well!')
      console.log('')
    }

    if (report.optimizationRoadmap.length > 0) {
      console.log('🗺️  OPTIMIZATION ROADMAP (Top 5):')
      report.optimizationRoadmap.forEach(item => {
        console.log(`   ${item.rank}. ${item.issue} (${item.impact} impact, ${item.effort} effort)`)
      })
      console.log('')
    }

    // 保存詳細報告
    const fs = require('fs')
    const reportPath = `performance-analysis-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    fs.writeFileSync(reportPath, JSON.stringify({ analysis, report }, null, 2))
    console.log(`📁 Detailed analysis saved to: ${reportPath}`)

    return report
  } catch (error) {
    console.error('❌ Performance analysis failed:', error.message)
    throw error
  }
}

// 運行分析
if (require.main === module) {
  runPerformanceAnalysis().catch(error => {
    console.error('❌ Analysis failed:', error)
    process.exit(1)
  })
}

module.exports = { runPerformanceAnalysis, CONFIG }
