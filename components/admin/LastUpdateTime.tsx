'use client'

import { useState, useEffect } from 'react'

export function LastUpdateTime() {
  const [time, setTime] = useState<string>('')
  
  useEffect(() => {
    setTime(new Date().toLocaleTimeString('zh-TW'))
  }, [])
  
  return time ? (
    <div className="text-sm text-gray-500">
      最後更新：{time}
    </div>
  ) : null
}