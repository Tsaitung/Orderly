'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { theme, designSystemInfo, type ColorScheme } from '@/lib/theme/provider'

/**
 * Chakra UI v2 Design System Showcase
 * 
 * Demonstrates the new design system with all migrated components
 * using the variant + colorScheme pattern.
 */
export default function ChakraUIShowcase() {
  const colorSchemes: ColorScheme[] = ['primary', 'restaurant', 'supplier', 'platform', 'gray', 'red', 'green', 'blue', 'yellow']
  const buttonVariants = ['solid', 'outline', 'ghost'] as const
  const badgeVariants = ['solid', 'subtle', 'outline', 'ghost'] as const
  const cardVariants = ['filled', 'outlined', 'ghost', 'elevated', 'glass'] as const

  return (
    <div className="space-y-8 p-6">
      {/* Design System Info */}
      <Card variant="filled" colorScheme="primary">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🎨</span>
            <span>Orderly Design System v{designSystemInfo.version}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Framework:</strong> {designSystemInfo.framework}
            </div>
            <div>
              <strong>Components Migrated:</strong> {designSystemInfo.components.migrated.join(', ')}
            </div>
            <div>
              <strong>Color Schemes:</strong> {designSystemInfo.colors.total}
            </div>
          </div>
          <div className="mt-4">
            <strong>Key Principles:</strong>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {designSystemInfo.principles.map((principle, index) => (
                <li key={index} className="text-sm">{principle}</li>
              ))}</ul>
          </div>
        </CardContent>
      </Card>

      {/* Button Component Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Button Component - Chakra UI v2 API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {buttonVariants.map((variant) => (
            <div key={variant}>
              <h4 className="font-medium mb-3 capitalize">{variant} Variant</h4>
              <div className="flex flex-wrap gap-3">
                {colorSchemes.map((colorScheme) => (
                  <Button
                    key={`${variant}-${colorScheme}`}
                    variant={variant}
                    colorScheme={colorScheme}
                    size="sm"
                  >
                    {colorScheme}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          
          {/* Button Sizes */}
          <div>
            <h4 className="font-medium mb-3">Button Sizes</h4>
            <div className="flex items-center space-x-3">
              <Button variant="solid" colorScheme="primary" size="sm">Small</Button>
              <Button variant="solid" colorScheme="primary" size="md">Medium</Button>
              <Button variant="solid" colorScheme="primary" size="lg">Large</Button>
              <Button variant="solid" colorScheme="primary" size="xl">X-Large</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badge Component Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Component - Chakra UI v2 API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {badgeVariants.map((variant) => (
            <div key={variant}>
              <h4 className="font-medium mb-3 capitalize">{variant} Variant</h4>
              <div className="flex flex-wrap gap-3">
                {colorSchemes.map((colorScheme) => (
                  <Badge
                    key={`${variant}-${colorScheme}`}
                    variant={variant}
                    colorScheme={colorScheme}
                    size="sm"
                  >
                    {colorScheme}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          
          {/* Badge Sizes */}
          <div>
            <h4 className="font-medium mb-3">Badge Sizes</h4>
            <div className="flex items-center space-x-3">
              <Badge variant="solid" colorScheme="primary" size="sm">Small</Badge>
              <Badge variant="solid" colorScheme="primary" size="default">Medium</Badge>
              <Badge variant="solid" colorScheme="primary" size="lg">Large</Badge>
              <Badge variant="solid" colorScheme="primary" size="xl">X-Large</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Component Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Card Component - Chakra UI v2 API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {cardVariants.map((variant) => (
            <div key={variant}>
              <h4 className="font-medium mb-3 capitalize">{variant} Variant</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['white', 'primary', 'restaurant', 'supplier', 'platform', 'gray'].map((colorScheme) => (
                  <Card
                    key={`${variant}-${colorScheme}`}
                    variant={variant as any}
                    colorScheme={colorScheme as any}
                    padding="md"
                  >
                    <div className="text-sm font-medium">{colorScheme}</div>
                    <div className="text-xs opacity-75">{variant} variant</div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Interactive Examples */}
      <Card variant="outlined" colorScheme="platform">
        <CardHeader>
          <CardTitle>Interactive Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button variant="solid" colorScheme="restaurant">
              Restaurant Action
            </Button>
            <Button variant="outline" colorScheme="supplier">
              Supplier Action
            </Button>
            <Button variant="ghost" colorScheme="platform">
              Platform Action
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="solid" colorScheme="green">已付款</Badge>
            <Badge variant="subtle" colorScheme="yellow">待付款</Badge>
            <Badge variant="outline" colorScheme="red">逾期</Badge>
            <Badge variant="solid" colorScheme="green">已匹配</Badge>
            <Badge variant="outline" colorScheme="gray">待對帳</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Backward Compatibility Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Backward Compatibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Legacy Badge API (still works)</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Legacy Success</Badge>
              <Badge variant="warning">Legacy Warning</Badge>
              <Badge variant="destructive">Legacy Destructive</Badge>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">New Chakra UI v2 API</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="subtle" colorScheme="green">New Success</Badge>
              <Badge variant="subtle" colorScheme="yellow">New Warning</Badge>
              <Badge variant="subtle" colorScheme="red">New Destructive</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Usage Examples for Documentation
 */
export const usageExamples = {
  button: {
    basic: '<Button variant="solid" colorScheme="primary">Click me</Button>',
    outlined: '<Button variant="outline" colorScheme="restaurant">Restaurant</Button>',
    sizes: '<Button size="lg" variant="solid" colorScheme="supplier">Large Button</Button>'
  },
  badge: {
    basic: '<Badge variant="solid" colorScheme="green">Success</Badge>',
    subtle: '<Badge variant="subtle" colorScheme="yellow">Warning</Badge>',
    outline: '<Badge variant="outline" colorScheme="red">Error</Badge>'
  },
  card: {
    basic: '<Card variant="filled" colorScheme="white">Content</Card>',
    themed: '<Card variant="outlined" colorScheme="primary">Themed Card</Card>',
    interactive: '<Card variant="elevated" interactive>Hover me</Card>'
  }
}