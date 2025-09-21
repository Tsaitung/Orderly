"""
簡化版計費服務
專門提供前端計費管理頁面所需的 API endpoints
使用 Mock 資料確保前端正常運作
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import random
import json

app = FastAPI(
    title="Orderly Billing Service - Simple",
    description="簡化版計費服務，專門支持平台管理端前端頁面",
    version="1.0.0"
)

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_mock_metrics(timeframe: str = "30d"):
    """生成模擬的儀表板指標資料"""
    base_commission = 2847300
    base_suppliers = 1247
    base_rate = 2.34
    base_growth = 15.2
    
    # 根據時間範圍調整數據
    multiplier = 1.0
    if timeframe == "7d":
        multiplier = 0.25
    elif timeframe == "90d":
        multiplier = 3.0
    
    return {
        "monthly_commission": {
            "value": int(base_commission * multiplier),
            "change": round(random.uniform(5.0, 20.0), 1),
            "trend": random.choice(["up", "down", "stable"])
        },
        "active_suppliers": {
            "value": int(base_suppliers * (multiplier if multiplier < 2 else 1.5)),
            "change": round(random.uniform(3.0, 15.0), 1), 
            "trend": random.choice(["up", "stable"])
        },
        "average_rate": {
            "value": round(base_rate + random.uniform(-0.5, 0.5), 2),
            "change": round(random.uniform(-0.3, 0.3), 2),
            "trend": random.choice(["up", "down", "stable"])
        },
        "growth_rate": {
            "value": round(base_growth + random.uniform(-5.0, 10.0), 1),
            "change": round(random.uniform(-2.0, 5.0), 1),
            "trend": random.choice(["up", "down"])
        }
    }

def generate_mock_health():
    """生成模擬的系統健康度資料"""
    return {
        "billing_success_rate": round(random.uniform(95.0, 99.9), 1),
        "payment_success_rate": round(random.uniform(92.0, 98.0), 1),
        "dispute_rate": round(random.uniform(0.1, 2.0), 1),
        "system_uptime": round(random.uniform(99.0, 99.99), 2),
        "last_updated": datetime.now().isoformat(),
        "alerts": []
    }

def generate_mock_alerts():
    """生成模擬的告警資料"""
    sample_alerts = [
        {
            "id": "alert_001",
            "type": "warning",
            "message": "有 3 筆付款即將逾期",
            "timestamp": datetime.now().isoformat(),
            "severity": "medium"
        },
        {
            "id": "alert_002", 
            "type": "info",
            "message": "月度佣金已達預期目標的 85%",
            "timestamp": datetime.now().isoformat(),
            "severity": "low"
        }
    ]
    
    # 隨機返回 0-2 個告警
    num_alerts = random.randint(0, 2)
    return sample_alerts[:num_alerts]

@app.get("/health")
async def health():
    """服務健康檢查"""
    return {
        "status": "healthy",
        "service": "billing-service-simple",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/platform/billing/dashboard/metrics")
async def get_dashboard_metrics(timeframe: str = Query("30d", description="時間範圍: 7d, 30d, 90d")):
    """
    獲取儀表板關鍵指標
    支援前端 BillingKPICard 組件
    """
    metrics = generate_mock_metrics(timeframe)
    
    return {
        "success": True,
        "data": metrics,
        "message": "儀表板指標獲取成功",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/platform/billing/dashboard/health")
async def get_system_health():
    """
    獲取系統健康度指標
    支援前端 SystemHealthPanel 組件
    """
    health_data = generate_mock_health()
    
    return {
        "success": True,
        "data": health_data,
        "message": "系統健康度獲取成功", 
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/platform/billing/dashboard/alerts")
async def get_billing_alerts(limit: int = Query(10, description="返回告警數量限制")):
    """
    獲取計費系統告警
    支援前端 BillingAlertsPanel 組件
    """
    alerts = generate_mock_alerts()
    
    # 根據 limit 參數限制返回數量
    limited_alerts = alerts[:limit]
    
    return {
        "success": True,
        "data": limited_alerts,
        "message": f"告警資料獲取成功，共 {len(limited_alerts)} 條",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def root():
    """根端點，提供服務資訊"""
    return {
        "service": "Orderly Billing Service - Simple",
        "version": "1.0.0",
        "description": "簡化版計費服務，專門支持平台管理端前端頁面",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "dashboard_metrics": "/api/v1/platform/billing/dashboard/metrics",
            "system_health": "/api/v1/platform/billing/dashboard/health", 
            "billing_alerts": "/api/v1/platform/billing/dashboard/alerts"
        },
        "docs": "/docs",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3005)