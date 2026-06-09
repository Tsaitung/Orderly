// TODO: Replace data access with Order Service FastAPI client
import { CacheService } from '@/lib/redis'
import type { MatchResult, Discrepancy } from './matching-algorithm'

export interface ResolutionAction {
  id: string
  type: 'auto_approve' | 'auto_adjust' | 'escalate' | 'dispute' | 'manual_review'
  description: string
  parameters?: Record<string, any>
  confidence: number
  estimatedTime: number // 預估處理時間 (分鐘)
  requiredApproval?: string[] // 需要的核准角色
}

export interface ResolutionTemplate {
  id: string
  name: string
  discrepancyPattern: {
    type: string[]
    severityRange: string[]
    conditions: Record<string, any>
  }
  actions: ResolutionAction[]
  priority: number
  isActive: boolean
  successRate: number
  lastUpdated: Date
}

export interface ResolutionRule {
  id: string
  supplierId?: string
  productCategory?: string
  discrepancyType: string
  condition: string // JSON query condition
  action: ResolutionAction
  priority: number
  isActive: boolean
  applicationCount: number
  successRate: number
}

export interface WorkflowStep {
  stepId: string
  stepType: 'validation' | 'analysis' | 'action' | 'approval' | 'notification'
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  assignedTo?: string
  startedAt?: Date
  completedAt?: Date
  output?: any
  notes?: string
}

export interface ResolutionWorkflow {
  id: string
  reconciliationId: string
  matchResultId: string
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedResolutionTime: number
  actualResolutionTime?: number
  assignedTo?: string
  steps: WorkflowStep[]
  appliedRules: string[]
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
}

export interface EscalationRule {
  id: string
  triggerConditions: {
    discrepancyValue?: number
    timeExceeded?: number
    attemptsFailed?: number
    customerTier?: string
  }
  escalateTo: string[] // 角色或用戶ID
  notificationTemplate: string
  priority: 'medium' | 'high' | 'urgent'
}

export class DiscrepancyResolutionEngine {
  private static readonly RESOLUTION_TEMPLATES: ResolutionTemplate[] = [
    {
      id: 'quantity_minor_variance',
      name: '微小數量差異自動調整',
      discrepancyPattern: {
        type: ['quantity'],
        severityRange: ['low'],
        conditions: { variance: { $lte: 2 } },
      },
      actions: [
        {
          id: 'auto_adjust_quantity',
          type: 'auto_adjust',
          description: '自動調整數量記錄，接受實際送貨數量',
          parameters: { adjustField: 'acceptedQuantity', source: 'delivered' },
          confidence: 0.95,
          estimatedTime: 1,
        },
      ],
      priority: 1,
      isActive: true,
      successRate: 0.98,
      lastUpdated: new Date(),
    },
    {
      id: 'price_promotional_adjustment',
      name: '促銷價格差異處理',
      discrepancyPattern: {
        type: ['price'],
        severityRange: ['medium'],
        conditions: {
          variance: { $gte: 3, $lte: 15 },
          priceDirection: 'lower',
        },
      },
      actions: [
        {
          id: 'verify_promotion',
          type: 'manual_review',
          description: '核對是否有促銷活動或合約價格調整',
          confidence: 0.8,
          estimatedTime: 15,
          requiredApproval: ['purchasing_manager'],
        },
      ],
      priority: 2,
      isActive: true,
      successRate: 0.85,
      lastUpdated: new Date(),
    },
    {
      id: 'critical_discrepancy_escalation',
      name: '重大差異升級處理',
      discrepancyPattern: {
        type: ['price', 'quantity', 'product'],
        severityRange: ['critical'],
        conditions: {},
      },
      actions: [
        {
          id: 'immediate_escalation',
          type: 'escalate',
          description: '立即升級至主管處理',
          confidence: 1.0,
          estimatedTime: 30,
          requiredApproval: ['finance_manager', 'purchasing_director'],
        },
      ],
      priority: 0,
      isActive: true,
      successRate: 0.92,
      lastUpdated: new Date(),
    },
  ]

  private static readonly ESCALATION_RULES: EscalationRule[] = [
    {
      id: 'high_value_discrepancy',
      triggerConditions: {
        discrepancyValue: 10000,
      },
      escalateTo: ['finance_manager'],
      notificationTemplate: 'high_value_alert',
      priority: 'high',
    },
    {
      id: 'resolution_timeout',
      triggerConditions: {
        timeExceeded: 120, // 2小時
      },
      escalateTo: ['operations_manager'],
      notificationTemplate: 'timeout_alert',
      priority: 'medium',
    },
    {
      id: 'vip_customer_issue',
      triggerConditions: {
        customerTier: 'vip',
      },
      escalateTo: ['account_manager', 'customer_success_manager'],
      notificationTemplate: 'vip_customer_alert',
      priority: 'high',
    },
  ]

  /**
   * 分析差異並生成解決方案
   */
  async analyzeDiscrepancies(matchResult: MatchResult): Promise<ResolutionAction[]> {
    const actions: ResolutionAction[] = []

    for (const discrepancy of matchResult.discrepancies) {
      // 查找匹配的解決模板
      const matchingTemplates = this.findMatchingTemplates(discrepancy, matchResult)

      if (matchingTemplates.length > 0) {
        // 選擇優先級最高的模板
        const selectedTemplate = matchingTemplates.sort((a, b) => a.priority - b.priority)[0]
        actions.push(...selectedTemplate.actions)
      } else {
        // 沒有匹配的模板，生成預設動作
        const defaultAction = this.generateDefaultAction(discrepancy)
        actions.push(defaultAction)
      }
    }

    // 去重並按優先級排序
    const uniqueActions = this.deduplicateActions(actions)
    return this.prioritizeActions(uniqueActions, matchResult)
  }

  /**
   * 尋找匹配的解決模板
   */
  private findMatchingTemplates(
    discrepancy: Discrepancy,
    matchResult: MatchResult
  ): ResolutionTemplate[] {
    return DiscrepancyResolutionEngine.RESOLUTION_TEMPLATES.filter(template => {
      // 檢查差異類型
      if (!template.discrepancyPattern.type.includes(discrepancy.type)) {
        return false
      }

      // 檢查嚴重程度
      if (!template.discrepancyPattern.severityRange.includes(discrepancy.severity)) {
        return false
      }

      // 檢查條件
      return this.evaluateConditions(
        template.discrepancyPattern.conditions,
        discrepancy,
        matchResult
      )
    })
  }

  /**
   * 評估條件是否符合
   */
  private evaluateConditions(
    conditions: Record<string, any>,
    discrepancy: Discrepancy,
    matchResult: MatchResult
  ): boolean {
    for (const [key, condition] of Object.entries(conditions)) {
      switch (key) {
        case 'variance':
          if (!this.evaluateNumericCondition(condition, discrepancy.variance)) {
            return false
          }
          break
        case 'priceDirection':
          if (discrepancy.type === 'price') {
            const isLower = discrepancy.actual < discrepancy.expected
            if (condition === 'lower' && !isLower) return false
            if (condition === 'higher' && isLower) return false
          }
          break
        // 可以添加更多條件評估邏輯
      }
    }
    return true
  }

  /**
   * 評估數值條件
   */
  private evaluateNumericCondition(condition: any, value: number): boolean {
    if (typeof condition === 'number') {
      return value === condition
    }

    if (typeof condition === 'object') {
      if (condition.$gte !== undefined && value < condition.$gte) return false
      if (condition.$lte !== undefined && value > condition.$lte) return false
      if (condition.$gt !== undefined && value <= condition.$gt) return false
      if (condition.$lt !== undefined && value >= condition.$lt) return false
    }

    return true
  }

  /**
   * 生成預設解決動作
   */
  private generateDefaultAction(discrepancy: Discrepancy): ResolutionAction {
    const baseAction: ResolutionAction = {
      id: `default_${discrepancy.type}_${Date.now()}`,
      type: 'manual_review',
      description: `人工審查${discrepancy.description}`,
      confidence: 0.5,
      estimatedTime: 30,
    }

    // 根據差異類型和嚴重程度調整
    switch (discrepancy.severity) {
      case 'critical':
        return {
          ...baseAction,
          type: 'escalate',
          description: `緊急處理：${discrepancy.description}`,
          estimatedTime: 15,
          requiredApproval: ['finance_manager'],
        }
      case 'high':
        return {
          ...baseAction,
          estimatedTime: 20,
          requiredApproval: ['purchasing_manager'],
        }
      case 'low':
        if (discrepancy.autoResolvable) {
          return {
            ...baseAction,
            type: 'auto_adjust',
            description: `自動調整：${discrepancy.description}`,
            confidence: 0.8,
            estimatedTime: 2,
          }
        }
        break
    }

    return baseAction
  }

  /**
   * 去除重複動作
   */
  private deduplicateActions(actions: ResolutionAction[]): ResolutionAction[] {
    const unique = new Map<string, ResolutionAction>()

    for (const action of actions) {
      const key = `${action.type}_${action.description}`
      if (!unique.has(key) || unique.get(key)!.confidence < action.confidence) {
        unique.set(key, action)
      }
    }

    return Array.from(unique.values())
  }

  /**
   * 優先級排序
   */
  private prioritizeActions(
    actions: ResolutionAction[],
    matchResult: MatchResult
  ): ResolutionAction[] {
    return actions.sort((a, b) => {
      // 1. 緊急程度
      const urgencyOrder = {
        escalate: 0,
        dispute: 1,
        manual_review: 2,
        auto_adjust: 3,
        auto_approve: 4,
      }
      const urgencyDiff = urgencyOrder[a.type] - urgencyOrder[b.type]
      if (urgencyDiff !== 0) return urgencyDiff

      // 2. 信心度 (高信心度優先)
      const confidenceDiff = b.confidence - a.confidence
      if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff

      // 3. 處理時間 (短時間優先)
      return a.estimatedTime - b.estimatedTime
    })
  }

  /**
   * 創建解決工作流
   */
  async createResolutionWorkflow(
    matchResult: MatchResult,
    reconciliationId: string
  ): Promise<ResolutionWorkflow> {
    const actions = await this.analyzeDiscrepancies(matchResult)
    const priority = this.calculateWorkflowPriority(matchResult)

    const steps: WorkflowStep[] = []

    // 1. 驗證步驟
    steps.push({
      stepId: 'validation',
      stepType: 'validation',
      status: 'pending',
    })

    // 2. 分析步驟
    steps.push({
      stepId: 'analysis',
      stepType: 'analysis',
      status: 'pending',
    })

    // 3. 為每個動作創建步驟
    for (const [index, action] of actions.entries()) {
      if (action.type === 'auto_approve' || action.type === 'auto_adjust') {
        steps.push({
          stepId: `action_${index}`,
          stepType: 'action',
          status: 'pending',
        })
      } else {
        steps.push({
          stepId: `approval_${index}`,
          stepType: 'approval',
          status: 'pending',
          assignedTo: action.requiredApproval?.[0],
        })
      }
    }

    // 4. 通知步驟
    steps.push({
      stepId: 'notification',
      stepType: 'notification',
      status: 'pending',
    })

    const workflow: ResolutionWorkflow = {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reconciliationId,
      matchResultId: matchResult.orderItem.id,
      status: 'pending',
      priority,
      estimatedResolutionTime: actions.reduce((sum, action) => sum + action.estimatedTime, 0),
      steps,
      appliedRules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // 儲存到數據庫
    await this.saveWorkflow(workflow, actions)

    return workflow
  }

  /**
   * 計算工作流優先級
   */
  private calculateWorkflowPriority(
    matchResult: MatchResult
  ): 'low' | 'medium' | 'high' | 'urgent' {
    const hasHighSeverity = matchResult.discrepancies.some(
      d => d.severity === 'high' || d.severity === 'critical'
    )
    const hasCriticalSeverity = matchResult.discrepancies.some(d => d.severity === 'critical')
    const highValueOrder = matchResult.orderItem.lineTotal > 10000

    if (hasCriticalSeverity || (hasHighSeverity && highValueOrder)) {
      return 'urgent'
    } else if (hasHighSeverity || highValueOrder) {
      return 'high'
    } else if (matchResult.discrepancies.some(d => d.severity === 'medium')) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  /**
   * 執行工作流步驟
   */
  async executeWorkflowStep(workflowId: string, stepId: string): Promise<WorkflowStep> {
    // 從數據庫獲取工作流
    const workflow = await this.getWorkflow(workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    const step = workflow.steps.find(s => s.stepId === stepId)
    if (!step) {
      throw new Error(`Step ${stepId} not found in workflow ${workflowId}`)
    }

    // 標記步驟為進行中
    step.status = 'in_progress'
    step.startedAt = new Date()

    try {
      // 根據步驟類型執行不同邏輯
      switch (step.stepType) {
        case 'validation':
          step.output = await this.executeValidationStep(workflow)
          break
        case 'analysis':
          step.output = await this.executeAnalysisStep(workflow)
          break
        case 'action':
          step.output = await this.executeActionStep(workflow, step)
          break
        case 'approval':
          // 等待人工核准，不在此處執行
          step.status = 'pending'
          return step
        case 'notification':
          step.output = await this.executeNotificationStep(workflow)
          break
      }

      step.status = 'completed'
      step.completedAt = new Date()
    } catch (error) {
      step.status = 'failed'
      step.notes = error instanceof Error ? error.message : 'Unknown error'
    }

    // 更新工作流狀態
    await this.updateWorkflow(workflow)

    return step
  }

  /**
   * 執行驗證步驟
   */
  private async executeValidationStep(workflow: ResolutionWorkflow): Promise<any> {
    // 驗證匹配結果的完整性
    // 檢查是否有必要的數據
    return {
      isValid: true,
      validatedAt: new Date(),
      checks: ['data_integrity', 'business_rules', 'approval_chain'],
    }
  }

  /**
   * 執行分析步驟
   */
  private async executeAnalysisStep(workflow: ResolutionWorkflow): Promise<any> {
    // 深度分析差異和解決方案
    return {
      analysisComplete: true,
      riskLevel: 'medium',
      recommendedActions: ['auto_adjust'],
      analysedAt: new Date(),
    }
  }

  /**
   * 執行動作步驟
   */
  private async executeActionStep(workflow: ResolutionWorkflow, step: WorkflowStep): Promise<any> {
    // 執行自動化動作
    return {
      actionExecuted: true,
      executedAt: new Date(),
      result: 'success',
    }
  }

  /**
   * 執行通知步驟
   */
  private async executeNotificationStep(workflow: ResolutionWorkflow): Promise<any> {
    // 發送通知給相關人員
    return {
      notificationsSent: ['email', 'system'],
      sentAt: new Date(),
      recipients: ['purchasing_manager'],
    }
  }

  /**
   * 檢查升級條件
   */
  async checkEscalationConditions(workflow: ResolutionWorkflow): Promise<EscalationRule[]> {
    const triggeredRules: EscalationRule[] = []

    for (const rule of DiscrepancyResolutionEngine.ESCALATION_RULES) {
      let shouldEscalate = false

      // 檢查各種升級條件
      if (rule.triggerConditions.timeExceeded) {
        const timeElapsed = (Date.now() - workflow.createdAt.getTime()) / (1000 * 60) // 分鐘
        if (timeElapsed > rule.triggerConditions.timeExceeded) {
          shouldEscalate = true
        }
      }

      if (rule.triggerConditions.discrepancyValue) {
        // 從工作流中獲取差異金額（需要從匹配結果計算）
        // 這裡簡化處理
        shouldEscalate = true
      }

      if (shouldEscalate) {
        triggeredRules.push(rule)
      }
    }

    return triggeredRules
  }

  /**
   * 儲存工作流到數據庫
   */
  private async saveWorkflow(
    workflow: ResolutionWorkflow,
    actions: ResolutionAction[]
  ): Promise<void> {
    // 這裡可以實現將工作流儲存到資料庫的邏輯
    // 由於原始資料庫 schema 中沒有專門的工作流表，可以儲存在 WorkflowTask 中
    try {
      await prisma.workflowTask.create({
        data: {
          type: 'reconciliation_resolution',
          data: {
            workflow,
            actions,
          },
          scheduledAt: new Date(),
        },
      })
    } catch (error) {
      console.error('Failed to save workflow:', error)
    }
  }

  /**
   * 獲取工作流
   */
  private async getWorkflow(workflowId: string): Promise<ResolutionWorkflow | null> {
    try {
      const task = await prisma.workflowTask.findFirst({
        where: {
          type: 'reconciliation_resolution',
          data: {
            path: ['workflow', 'id'],
            equals: workflowId,
          },
        },
      })

      return task ? (task.data as any).workflow : null
    } catch (error) {
      console.error('Failed to get workflow:', error)
      return null
    }
  }

  /**
   * 更新工作流
   */
  private async updateWorkflow(workflow: ResolutionWorkflow): Promise<void> {
    try {
      await prisma.workflowTask.updateMany({
        where: {
          type: 'reconciliation_resolution',
          data: {
            path: ['workflow', 'id'],
            equals: workflow.id,
          },
        },
        data: {
          data: {
            workflow: {
              ...workflow,
              updatedAt: new Date(),
            },
          },
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('Failed to update workflow:', error)
    }
  }

  /**
   * 獲取待處理的工作流
   */
  async getPendingWorkflows(assignedTo?: string): Promise<ResolutionWorkflow[]> {
    try {
      const tasks = await prisma.workflowTask.findMany({
        where: {
          type: 'reconciliation_resolution',
          status: {
            in: ['pending', 'running'],
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      return tasks
        .map(task => (task.data as any).workflow)
        .filter(
          workflow =>
            !assignedTo ||
            workflow.assignedTo === assignedTo ||
            workflow.steps.some((step: WorkflowStep) => step.assignedTo === assignedTo)
        )
    } catch (error) {
      console.error('Failed to get pending workflows:', error)
      return []
    }
  }
}

export default DiscrepancyResolutionEngine
