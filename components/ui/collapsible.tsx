'use client'

import React, { createContext, useContext, useState, useRef, useEffect } from 'react'

// Context for sharing state between Collapsible components
interface CollapsibleContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null)

// Main Collapsible component
interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  defaultOpen?: boolean
}

export function Collapsible({
  open: controlledOpen,
  onOpenChange,
  children,
  defaultOpen = false,
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  const contextValue: CollapsibleContextValue = {
    open,
    onOpenChange: handleOpenChange,
  }

  return (
    <CollapsibleContext.Provider value={contextValue}>
      <div data-state={open ? 'open' : 'closed'}>{children}</div>
    </CollapsibleContext.Provider>
  )
}

// Trigger component
interface CollapsibleTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  className?: string
}

export function CollapsibleTrigger({
  asChild = false,
  children,
  className = '',
}: CollapsibleTriggerProps) {
  const context = useContext(CollapsibleContext)

  if (!context) {
    throw new Error('CollapsibleTrigger must be used within a Collapsible')
  }

  const { open, onOpenChange } = context

  const handleClick = () => {
    onOpenChange(!open)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      onClick: (e: React.MouseEvent) => {
        children.props.onClick?.(e)
        handleClick()
      },
      'aria-expanded': open,
      'data-state': open ? 'open' : 'closed',
      className: `${children.props.className || ''} ${className}`.trim(),
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={open}
      data-state={open ? 'open' : 'closed'}
      className={className}
    >
      {children}
    </button>
  )
}

// Content component
interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
  forceMount?: boolean
}

export function CollapsibleContent({
  children,
  className = '',
  forceMount = false,
}: CollapsibleContentProps) {
  const context = useContext(CollapsibleContext)
  const [height, setHeight] = useState<number | undefined>(undefined)
  const contentRef = useRef<HTMLDivElement>(null)

  if (!context) {
    throw new Error('CollapsibleContent must be used within a Collapsible')
  }

  const { open } = context

  // Animate height changes
  useEffect(() => {
    if (contentRef.current) {
      if (open) {
        // Measure natural height when opening
        const naturalHeight = contentRef.current.scrollHeight
        setHeight(naturalHeight)
      } else {
        // Collapse to 0 when closing
        setHeight(0)
      }
    }
  }, [open])

  // Don't render if closed and not forced to mount
  if (!open && !forceMount) {
    return null
  }

  return (
    <div
      ref={contentRef}
      data-state={open ? 'open' : 'closed'}
      className={className}
      style={{
        height: height !== undefined ? `${height}px` : undefined,
        overflow: 'hidden',
        transition: 'height 0.2s ease-out',
      }}
    >
      <div style={{ padding: open ? undefined : 0 }}>{children}</div>
    </div>
  )
}

// Export all components
export {
  CollapsibleContext,
  type CollapsibleContextValue,
  type CollapsibleProps,
  type CollapsibleTriggerProps,
  type CollapsibleContentProps,
}
