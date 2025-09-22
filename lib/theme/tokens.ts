/**
 * Chakra UI v2 Design Tokens for Orderly Platform
 * 保留原有主色系，其他採用 Chakra UI v2 標準
 */

export const tokens = {
  colors: {
    // 保留現有主色系
    primary: {
      50: '#faf9f7',
      100: '#f0ede7',
      200: '#e3ddd3',
      300: '#d1c7b8',
      400: '#b8a894',
      500: '#a47864', // Mocha Mousse - 保持不變
      600: '#8f6b56',
      700: '#7a5a4a',
      800: '#654b40',
      900: '#533e35',
    },

    // 保留餐廳模組色系
    restaurant: {
      50: '#fff7f0',
      100: '#ffe5d9',
      200: '#ffc5a8',
      300: '#ffa574',
      400: '#ff7e3f',
      500: '#ff6b35', // 保持不變
      600: '#e55a2b',
      700: '#c44822',
      800: '#a23b1e',
      900: '#7d2e1b',
    },

    // 保留供應商模組色系
    supplier: {
      50: '#e6f4f1',
      100: '#c2e5dc',
      200: '#9ad5c4',
      300: '#70c5ab',
      400: '#4db897',
      500: '#00a896', // 保持不變
      600: '#02c39a',
      700: '#028174',
      800: '#026152',
      900: '#014741',
    },

    // 保留平台管理色系
    platform: {
      50: '#ede9fe',
      100: '#ddd6fe',
      200: '#c4b5fd',
      300: '#a78bfa',
      400: '#8b5cf6',
      500: '#6366f1', // 保持不變
      600: '#818cf8',
      700: '#4f46e5',
      800: '#4338ca',
      900: '#3730a3',
    },

    // 更新灰階到 Chakra UI v2 標準
    gray: {
      50: '#F7FAFC',
      100: '#EDF2F7',
      200: '#E2E8F0',
      300: '#CBD5E0',
      400: '#A0AEC0',
      500: '#718096',
      600: '#4A5568',
      700: '#2D3748',
      800: '#1A202C',
      900: '#171923',
    },

    // Chakra UI v2 標準語意色彩
    red: {
      50: '#FED7D7',
      100: '#FEB2B2',
      200: '#FC8181',
      300: '#F56565',
      400: '#E53E3E',
      500: '#C53030',
      600: '#9B2C2C',
      700: '#742A2A',
      800: '#63171B',
      900: '#1A202C',
    },

    green: {
      50: '#F0FFF4',
      100: '#C6F6D5',
      200: '#9AE6B4',
      300: '#68D391',
      400: '#48BB78',
      500: '#38A169',
      600: '#2F855A',
      700: '#276749',
      800: '#22543D',
      900: '#1C4532',
    },

    blue: {
      50: '#EBF8FF',
      100: '#BEE3F8',
      200: '#90CDF4',
      300: '#63B3ED',
      400: '#4299E1',
      500: '#3182CE',
      600: '#2B77CB',
      700: '#2C5282',
      800: '#2A4365',
      900: '#1A365D',
    },

    yellow: {
      50: '#FFFFF0',
      100: '#FEFCBF',
      200: '#FAF089',
      300: '#F6E05E',
      400: '#ECC94B',
      500: '#D69E2E',
      600: '#B7791F',
      700: '#975A16',
      800: '#744210',
      900: '#5F370E',
    },

    // 語意色彩
    success: {
      50: '#F0FFF4',
      500: '#38A169',
      600: '#2F855A',
    },
    warning: {
      50: '#FFFFF0',
      500: '#D69E2E',
      600: '#B7791F',
    },
    error: {
      50: '#FED7D7',
      500: '#E53E3E',
      600: '#C53030',
    },
    info: {
      50: '#EBF8FF',
      500: '#3182CE',
      600: '#2B77CB',
    },
  },

  // Chakra UI v2 標準間距系統
  spacing: {
    px: '1px',
    0.5: '0.125rem', // 2px
    1: '0.25rem', // 4px
    1.5: '0.375rem', // 6px
    2: '0.5rem', // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem', // 12px
    3.5: '0.875rem', // 14px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    7: '1.75rem', // 28px
    8: '2rem', // 32px
    9: '2.25rem', // 36px
    10: '2.5rem', // 40px
    12: '3rem', // 48px
    14: '3.5rem', // 56px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
    28: '7rem', // 112px
    32: '8rem', // 128px
    36: '9rem', // 144px
    40: '10rem', // 160px
    44: '11rem', // 176px
    48: '12rem', // 192px
    52: '13rem', // 208px
    56: '14rem', // 224px
    60: '15rem', // 240px
    64: '16rem', // 256px
    72: '18rem', // 288px
    80: '20rem', // 320px
    96: '24rem', // 384px
  },

  // Chakra UI v2 標準字體系統
  fontSizes: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    md: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem', // 72px
    '8xl': '6rem', // 96px
    '9xl': '8rem', // 128px
  },

  // Chakra UI v2 標準字重
  fontWeights: {
    hairline: 100,
    thin: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  // Chakra UI v2 標準行高
  lineHeights: {
    3: '.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    normal: 'normal',
    none: 1,
    shorter: 1.25,
    short: 1.375,
    base: 1.5,
    tall: 1.625,
    taller: 2,
  },

  // Chakra UI v2 標準圓角
  radii: {
    none: '0',
    sm: '0.125rem', // 2px
    base: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Chakra UI v2 標準陰影
  shadows: {
    xs: '0 0 0 1px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    outline: '0 0 0 3px rgba(164, 120, 100, 0.6)', // 使用主色
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',
  },

  // Chakra UI v2 標準 z-index
  zIndices: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
}

export default tokens
