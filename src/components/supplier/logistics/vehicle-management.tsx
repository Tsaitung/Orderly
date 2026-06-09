'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Truck,
  User,
  Fuel,
  Wrench,
  MapPin,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Battery,
  Thermometer,
} from 'lucide-react'

// 模擬車輛數據
const vehicles = [
  {
    id: 'VH-001',
    plateNumber: 'ABC-1234',
    type: '冷藏車',
    capacity: '3噸',
    driver: {
      name: '張大明',
      phone: '0912-345-678',
      licenseExpiry: new Date('2025-12-15'),
      workingHours: 8.5,
      rating: 4.8,
    },
    status: 'delivering',
    location: '台北市大安區',
    fuel: 75,
    temperature: -18,
    battery: 95,
    odometer: 156789,
    nextMaintenance: new Date('2025-10-15'),
    assignments: 3,
    lastUpdate: new Date(),
  },
  {
    id: 'VH-002',
    plateNumber: 'DEF-5678',
    type: '一般貨車',
    capacity: '1.5噸',
    driver: {
      name: '李小華',
      phone: '0987-654-321',
      licenseExpiry: new Date('2026-03-20'),
      workingHours: 6.2,
      rating: 4.6,
    },
    status: 'loading',
    location: '配送中心',
    fuel: 45,
    temperature: null,
    battery: 88,
    odometer: 98456,
    nextMaintenance: new Date('2025-09-25'),
    assignments: 5,
    lastUpdate: new Date(),
  },
  {
    id: 'VH-003',
    plateNumber: 'GHI-9012',
    type: '冷藏車',
    capacity: '5噸',
    driver: {
      name: '王志明',
      phone: '0923-456-789',
      licenseExpiry: new Date('2025-11-08'),
      workingHours: 2.3,
      rating: 4.9,
    },
    status: 'delivered',
    location: '台中市西屯區',
    fuel: 90,
    temperature: -20,
    battery: 92,
    odometer: 203567,
    nextMaintenance: new Date('2025-11-30'),
    assignments: 2,
    lastUpdate: new Date(),
  },
  {
    id: 'VH-004',
    plateNumber: 'JKL-3456',
    type: '一般貨車',
    capacity: '2噸',
    driver: null,
    status: 'maintenance',
    location: '維修廠',
    fuel: 0,
    temperature: null,
    battery: 0,
    odometer: 145230,
    nextMaintenance: new Date('2025-09-20'),
    assignments: 0,
    lastUpdate: new Date(),
  },
]

export default function VehicleManagement() {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)

  const getStatusInfo = (status: string) => {
    const statusMap = {
      delivering: { label: '配送中', variant: 'info' as const, color: 'text-blue-600' },
      loading: { label: '裝載中', variant: 'warning' as const, color: 'text-orange-600' },
      delivered: { label: '已送達', variant: 'success' as const, color: 'text-green-600' },
      idle: { label: '待命中', variant: 'outline' as const, color: 'text-gray-600' },
      maintenance: { label: '維修中', variant: 'destructive' as const, color: 'text-red-600' },
      returning: { label: '返程中', variant: 'info' as const, color: 'text-purple-600' },
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.idle
  }

  const getFuelStatus = (fuel: number) => {
    if (fuel >= 70) return { color: 'text-green-600', bgColor: 'bg-green-500' }
    if (fuel >= 30) return { color: 'text-orange-600', bgColor: 'bg-orange-500' }
    return { color: 'text-red-600', bgColor: 'bg-red-500' }
  }

  const getTemperatureStatus = (temp: number | null) => {
    if (temp === null) return { color: 'text-gray-400', status: 'N/A' }
    if (temp >= -25 && temp <= -15) return { color: 'text-green-600', status: '正常' }
    return { color: 'text-red-600', status: '異常' }
  }

  const isMaintenanceUrgent = (nextMaintenance: Date) => {
    const daysUntil = Math.ceil(
      (nextMaintenance.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysUntil <= 7
  }

  const isLicenseExpiring = (expiryDate: Date) => {
    const daysUntil = Math.ceil(
      (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysUntil <= 30
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Truck className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">車輛管理</h3>
          <Badge variant="outline">
            {vehicles.filter(v => v.status !== 'maintenance').length}/{vehicles.length} 可用
          </Badge>
        </div>
        <Button size="sm" variant="outline">
          管理車隊
        </Button>
      </div>

      <div className="space-y-4">
        {vehicles.map(vehicle => {
          const statusInfo = getStatusInfo(vehicle.status)
          const fuelStatus = getFuelStatus(vehicle.fuel)
          const tempStatus = getTemperatureStatus(vehicle.temperature)
          const isExpanded = selectedVehicle === vehicle.id

          return (
            <div
              key={vehicle.id}
              className={`rounded-lg border transition-all duration-200 ${
                isExpanded ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="p-4">
                <div
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() => setSelectedVehicle(isExpanded ? null : vehicle.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <Truck className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{vehicle.plateNumber}</div>
                      <div className="text-sm text-gray-500">
                        {vehicle.type} • {vehicle.capacity}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <Badge variant={statusInfo.variant} size="sm">
                        {statusInfo.label}
                      </Badge>
                      <div className="mt-1 text-xs text-gray-500">{vehicle.location}</div>
                    </div>

                    {/* 燃油指示器 */}
                    <div className="flex items-center space-x-2">
                      <Fuel className="h-4 w-4 text-gray-400" />
                      <div className="h-2 w-12 rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full ${fuelStatus.bgColor}`}
                          style={{ width: `${vehicle.fuel}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${fuelStatus.color}`}>
                        {vehicle.fuel}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 展開的詳細信息 */}
                {isExpanded && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {/* 司機信息 */}
                    {vehicle.driver ? (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="mb-2 text-sm font-medium text-gray-700">司機資訊</h4>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{vehicle.driver.name}</span>
                              <div className="flex items-center">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span
                                    key={i}
                                    className={`text-xs ${
                                      i < Math.floor(vehicle.driver!.rating)
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  >
                                    ★
                                  </span>
                                ))}
                                <span className="ml-1 text-xs text-gray-500">
                                  {vehicle.driver.rating}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{vehicle.driver.phone}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                工時: {vehicle.driver.workingHours}小時
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                駕照到期: {vehicle.driver.licenseExpiry.toLocaleDateString('zh-TW')}
                              </span>
                              {isLicenseExpiring(vehicle.driver.licenseExpiry) && (
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-2 text-sm font-medium text-gray-700">車輛狀態</h4>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Battery className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">電瓶: {vehicle.battery}%</span>
                              <div className="h-1.5 w-16 rounded-full bg-gray-200">
                                <div
                                  className="h-1.5 rounded-full bg-green-500"
                                  style={{ width: `${vehicle.battery}%` }}
                                ></div>
                              </div>
                            </div>
                            {vehicle.temperature !== null && (
                              <div className="flex items-center space-x-2">
                                <Thermometer className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">溫度: {vehicle.temperature}°C</span>
                                <span className={`text-xs font-medium ${tempStatus.color}`}>
                                  {tempStatus.status}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                里程: {vehicle.odometer.toLocaleString()} km
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Wrench className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                下次保養: {vehicle.nextMaintenance.toLocaleDateString('zh-TW')}
                              </span>
                              {isMaintenanceUrgent(vehicle.nextMaintenance) && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-gray-500">
                        <User className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                        <p className="text-sm">無指派司機</p>
                      </div>
                    )}

                    {/* 今日任務 */}
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-gray-700">今日任務</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          配送任務: {vehicle.assignments} 筆
                        </span>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            查看路線
                          </Button>
                          <Button size="sm" variant="outline">
                            追蹤位置
                          </Button>
                          {vehicle.driver && (
                            <Button size="sm" variant="outline">
                              聯絡司機
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 警告提醒 */}
                    {(vehicle.fuel < 30 ||
                      isMaintenanceUrgent(vehicle.nextMaintenance) ||
                      (vehicle.driver && isLicenseExpiring(vehicle.driver.licenseExpiry)) ||
                      (vehicle.temperature !== null && tempStatus.status === '異常')) && (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-orange-600" />
                          <div>
                            <h5 className="text-sm font-medium text-orange-900">需要注意</h5>
                            <ul className="mt-1 space-y-1 text-sm text-orange-800">
                              {vehicle.fuel < 30 && <li>• 燃油不足，請安排加油</li>}
                              {isMaintenanceUrgent(vehicle.nextMaintenance) && (
                                <li>• 即將到期保養，請安排維修</li>
                              )}
                              {vehicle.driver &&
                                isLicenseExpiring(vehicle.driver.licenseExpiry) && (
                                  <li>• 司機駕照即將到期</li>
                                )}
                              {vehicle.temperature !== null && tempStatus.status === '異常' && (
                                <li>• 冷藏溫度異常，請檢查設備</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 車隊概況 */}
      <div className="mt-6 border-t pt-4">
        <h4 className="mb-3 text-sm font-medium text-gray-700">車隊概況</h4>
        <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-3">
            <div className="text-lg font-bold text-blue-600">
              {vehicles.filter(v => v.status === 'delivering').length}
            </div>
            <div className="text-xs text-gray-600">配送中</div>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <div className="text-lg font-bold text-green-600">
              {vehicles.filter(v => v.driver !== null).length}
            </div>
            <div className="text-xs text-gray-600">有司機</div>
          </div>
          <div className="rounded-lg bg-orange-50 p-3">
            <div className="text-lg font-bold text-orange-600">
              {vehicles.filter(v => v.fuel < 30).length}
            </div>
            <div className="text-xs text-gray-600">需加油</div>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <div className="text-lg font-bold text-red-600">
              {vehicles.filter(v => v.status === 'maintenance').length}
            </div>
            <div className="text-xs text-gray-600">維修中</div>
          </div>
        </div>
      </div>
    </Card>
  )
}
