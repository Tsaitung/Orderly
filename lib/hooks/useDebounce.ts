'use client'

// Unified debounce hook utilities for the frontend
// - useDebounce: returns [debouncedValue, isDebouncing]
// - useDebouncedValue: returns only the debounced value (compat helper)

import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay: number): [T, boolean] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const [isDebouncing, setIsDebouncing] = useState(false)

  useEffect(() => {
    setIsDebouncing(true)
    const handler = setTimeout(() => {
      setDebouncedValue(value)
      setIsDebouncing(false)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return [debouncedValue, isDebouncing]
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced] = useDebounce(value, delay)
  return debounced
}

