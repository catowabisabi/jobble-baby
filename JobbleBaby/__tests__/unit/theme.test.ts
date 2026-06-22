/**
 * B. 單元測試 — Theme
 * 
 * 驗證 theme.ts 的顏色定義和一致性
 */
import { COLORS, ThemeColors } from '../../app/theme';

describe('Theme', () => {
  it('should have light and dark theme colors', () => {
    expect(COLORS).toHaveProperty('light');
    expect(COLORS).toHaveProperty('dark');
  });

  it('should have required color properties in both themes', () => {
    // ThemeColors interface: background, card, border, accent, text, muted
    const requiredColors: (keyof ThemeColors)[] = [
      'background',
      'card',
      'border',
      'accent',
      'text',
      'muted',
    ];

    const light = COLORS.light as ThemeColors;
    const dark = COLORS.dark as ThemeColors;

    requiredColors.forEach((color) => {
      expect(light).toHaveProperty(color);
      expect(dark).toHaveProperty(color);
      expect(typeof light[color]).toBe('string');
      expect(typeof dark[color]).toBe('string');
    });
  });

  it('should have valid hex color formats', () => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const light = COLORS.light as ThemeColors;

    (Object.keys(light) as Array<keyof ThemeColors>).forEach((colorKey) => {
      const color = light[colorKey];
      if (typeof color === 'string' && color.startsWith('#')) {
        expect(color).toMatch(hexRegex);
      }
    });
  });

  it('should have different background and surface colors', () => {
    // "surface" concept is represented by "card" in actual design
    const light = COLORS.light as ThemeColors;
    expect(light.background).not.toBe(light.card);
  });

  it('should have error/warning colors in STATUS_COLORS', () => {
    // Error/warning/status colors are exported separately as STATUS_COLORS
    const { STATUS_COLORS } = require('../../app/theme');
    expect(STATUS_COLORS.error).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(STATUS_COLORS.warning).toBeDefined();
    expect(STATUS_COLORS.good).toBeDefined();
  });
});
