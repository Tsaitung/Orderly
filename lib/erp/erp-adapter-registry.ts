import { ERPAdapterFactory, ERPSystemType } from './erp-adapter-interface'
import SAPBusinessOneAdapter from './adapters/sap-business-one-adapter'
import OracleNetSuiteAdapter from './adapters/oracle-netsuite-adapter'
import MicrosoftDynamics365Adapter from './adapters/microsoft-dynamics-365-adapter'
import DigiwinAdapter from './adapters/digiwin-adapter'

/**
 * ERP 適配器註冊中心
 *
 * 負責註冊所有可用的 ERP 適配器，並提供統一的創建介面
 */

// 註冊所有支援的 ERP 適配器
ERPAdapterFactory.registerAdapter('sap_business_one', SAPBusinessOneAdapter)
ERPAdapterFactory.registerAdapter('oracle_netsuite', OracleNetSuiteAdapter)
ERPAdapterFactory.registerAdapter('microsoft_dynamics_365', MicrosoftDynamics365Adapter)
ERPAdapterFactory.registerAdapter('digiwin', DigiwinAdapter)

// 導出工廠類別供使用
export { ERPAdapterFactory }

// 導出所有適配器類別
export { SAPBusinessOneAdapter, OracleNetSuiteAdapter, MicrosoftDynamics365Adapter, DigiwinAdapter }

// 導出常用的 ERP 系統配置模板
export const ERPSystemConfigs = {
  /**
   * SAP Business One 配置模板
   */
  SAP_BUSINESS_ONE: {
    type: 'sap_business_one' as ERPSystemType,
    authentication: {
      type: 'basic' as const,
      credentials: {
        username: process.env.SAP_B1_USERNAME || '',
        password: process.env.SAP_B1_PASSWORD || '',
      },
    },
    settings: {
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: 10,
      batchSize: 100,
      companyDatabase: process.env.SAP_B1_COMPANY_DB || 'SBODEMOTW',
    },
    fieldMapping: {},
    metadata: {
      version: '10.0',
      serviceLayer: true,
    },
  },

  /**
   * Oracle NetSuite 配置模板
   */
  ORACLE_NETSUITE: {
    type: 'oracle_netsuite' as ERPSystemType,
    authentication: {
      type: 'oauth2' as const,
      credentials: {
        clientId: process.env.NETSUITE_CLIENT_ID || '',
        clientSecret: process.env.NETSUITE_CLIENT_SECRET || '',
      },
    },
    settings: {
      timeout: 45000,
      retryAttempts: 3,
      rateLimit: 5,
      batchSize: 50,
    },
    fieldMapping: {},
    metadata: {
      version: '2023.2',
      datacenter: process.env.NETSUITE_DATACENTER || 'us-east-1',
    },
  },

  /**
   * Microsoft Dynamics 365 配置模板
   */
  MICROSOFT_DYNAMICS_365: {
    type: 'microsoft_dynamics_365' as ERPSystemType,
    authentication: {
      type: 'oauth2' as const,
      credentials: {
        clientId: process.env.D365_CLIENT_ID || '',
        clientSecret: process.env.D365_CLIENT_SECRET || '',
      },
    },
    settings: {
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: 10,
      batchSize: 100,
    },
    fieldMapping: {},
    metadata: {
      version: '9.2',
      tenantId: process.env.D365_TENANT_ID || '',
      environment: process.env.D365_ENVIRONMENT || 'production',
    },
  },

  /**
   * Digiwin ERP 配置模板
   */
  DIGIWIN: {
    type: 'digiwin' as ERPSystemType,
    authentication: {
      type: 'basic' as const,
      credentials: {
        username: process.env.DIGIWIN_USERNAME || '',
        password: process.env.DIGIWIN_PASSWORD || '',
      },
    },
    settings: {
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: 10,
      batchSize: 50,
      companyDatabase: process.env.DIGIWIN_COMPANY_DB || 'DEMO',
    },
    fieldMapping: {},
    metadata: {
      version: '12.0',
      language: 'zh-TW',
    },
  },
}

/**
 * 便利函數：根據環境變數創建 ERP 適配器
 */
export function createERPAdapterFromEnv(systemType: ERPSystemType, baseUrl: string) {
  const configTemplate = getConfigTemplate(systemType)

  if (!configTemplate) {
    throw new Error(`Unsupported ERP system type: ${systemType}`)
  }

  const config = {
    ...configTemplate,
    baseUrl,
  }

  return ERPAdapterFactory.createAdapter(config)
}

/**
 * 取得配置模板
 */
function getConfigTemplate(systemType: ERPSystemType) {
  switch (systemType) {
    case 'sap_business_one':
      return ERPSystemConfigs.SAP_BUSINESS_ONE
    case 'oracle_netsuite':
      return ERPSystemConfigs.ORACLE_NETSUITE
    case 'microsoft_dynamics_365':
      return ERPSystemConfigs.MICROSOFT_DYNAMICS_365
    case 'digiwin':
      return ERPSystemConfigs.DIGIWIN
    default:
      return null
  }
}

/**
 * 驗證 ERP 系統配置
 */
export function validateERPConfig(systemType: ERPSystemType): {
  valid: boolean
  missingVars: string[]
  recommendations: string[]
} {
  const result = {
    valid: true,
    missingVars: [] as string[],
    recommendations: [] as string[],
  }

  switch (systemType) {
    case 'sap_business_one':
      if (!process.env.SAP_B1_USERNAME) result.missingVars.push('SAP_B1_USERNAME')
      if (!process.env.SAP_B1_PASSWORD) result.missingVars.push('SAP_B1_PASSWORD')
      if (!process.env.SAP_B1_COMPANY_DB)
        result.recommendations.push('SAP_B1_COMPANY_DB (預設: SBODEMOTW)')
      break

    case 'oracle_netsuite':
      if (!process.env.NETSUITE_CLIENT_ID) result.missingVars.push('NETSUITE_CLIENT_ID')
      if (!process.env.NETSUITE_CLIENT_SECRET) result.missingVars.push('NETSUITE_CLIENT_SECRET')
      if (!process.env.NETSUITE_DATACENTER)
        result.recommendations.push('NETSUITE_DATACENTER (預設: us-east-1)')
      break

    case 'microsoft_dynamics_365':
      if (!process.env.D365_CLIENT_ID) result.missingVars.push('D365_CLIENT_ID')
      if (!process.env.D365_CLIENT_SECRET) result.missingVars.push('D365_CLIENT_SECRET')
      if (!process.env.D365_TENANT_ID) result.missingVars.push('D365_TENANT_ID')
      if (!process.env.D365_ENVIRONMENT)
        result.recommendations.push('D365_ENVIRONMENT (預設: production)')
      break

    case 'digiwin':
      if (!process.env.DIGIWIN_USERNAME) result.missingVars.push('DIGIWIN_USERNAME')
      if (!process.env.DIGIWIN_PASSWORD) result.missingVars.push('DIGIWIN_PASSWORD')
      if (!process.env.DIGIWIN_COMPANY_DB)
        result.recommendations.push('DIGIWIN_COMPANY_DB (預設: DEMO)')
      break
  }

  result.valid = result.missingVars.length === 0
  return result
}

/**
 * 取得所有支援的 ERP 系統資訊
 */
export function getSupportedERPSystems() {
  return [
    {
      type: 'sap_business_one',
      name: 'SAP Business One',
      description: '德國 SAP 公司的中小企業 ERP 解決方案',
      authentication: 'Session-based',
      apiType: 'Service Layer API',
      popularity: 'High',
    },
    {
      type: 'oracle_netsuite',
      name: 'Oracle NetSuite',
      description: '雲端 ERP/CRM 平台，適合中大型企業',
      authentication: 'OAuth 2.0',
      apiType: 'RESTlets/SuiteScript',
      popularity: 'High',
    },
    {
      type: 'microsoft_dynamics_365',
      name: 'Microsoft Dynamics 365',
      description: '微軟雲端 ERP/CRM 解決方案',
      authentication: 'Azure AD OAuth 2.0',
      apiType: 'Web API (OData v4)',
      popularity: 'High',
    },
    {
      type: 'digiwin',
      name: 'Digiwin ERP (鼎新電腦)',
      description: '台灣本土 ERP 解決方案，在台灣市場佔有率高',
      authentication: 'Session Token',
      apiType: 'DigiCenter API',
      popularity: 'High (Taiwan)',
    },
  ]
}

export default {
  ERPAdapterFactory,
  ERPSystemConfigs,
  createERPAdapterFromEnv,
  validateERPConfig,
  getSupportedERPSystems,
}
