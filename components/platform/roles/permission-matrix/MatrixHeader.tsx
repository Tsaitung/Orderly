'use client'

import { ChevronDown, ChevronRight, Lock } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { PermissionCategory } from './types'
import { getRiskLevelColor } from './utils'

interface MatrixHeaderProps {
  categories: PermissionCategory[]
  onToggleCategory: (categoryId: string) => void
}

export function MatrixHeader({ categories, onToggleCategory }: MatrixHeaderProps): JSX.Element {
  return (
    <thead className="sticky top-0 z-10 bg-gray-50">
      <tr>
        <th className="sticky left-0 z-20 min-w-[200px] bg-gray-50 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
          角色 / 權限
        </th>
        {categories.map(category => {
          const IconComponent = category.icon
          return (
            <th key={category.id} className="border-l border-gray-200 px-2 py-3 text-center">
              <div className="flex flex-col items-center space-y-2">
                <button
                  onClick={() => onToggleCategory(category.id)}
                  className="flex items-center space-x-2 text-xs font-medium text-gray-700 hover:text-gray-900"
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{category.name}</span>
                  {category.collapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
                {!category.collapsed && (
                  <div className="flex space-x-1">
                    {category.permissions.map(permission => (
                      <div
                        key={permission.id}
                        className="flex min-w-[80px] flex-col items-center space-y-1"
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`rounded px-2 py-1 text-center text-xs ${getRiskLevelColor(permission.riskLevel)} cursor-pointer border bg-white`}
                              >
                                {permission.name}
                                {permission.isSystemPermission && (
                                  <Lock className="ml-1 inline h-3 w-3" />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{permission.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </th>
          )
        })}
      </tr>
    </thead>
  )
}
