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
    const requiredColors = [
      'background',
      'surface',
      'primary',
      'secondary',
      'text',
      'textSecondary',
      'border',
      'error',
      'success',
      'warning',
    ];

    const light = COLORS.light as ThemeColors;
    const dark = COLORS.dark as ThemeColors;

    requiredColors.forEach((color) => {
      expect(light).toHaveProperty(color);
      expect(dark).toHaveProperty(color);
      expect(typeof light[color as keyof ThemeColors]).toBe('string');
      expect(typeof dark[color as keyof ThemeColors]).toBe('string');
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
    const light = COLORS.light as ThemeColors;
    expect(light.background).not.toBe(light.surface);
  });

  it('should have error color that is visibly red-ish', () => {
    const light = COLORS.light as ThemeColors;
    // Error should contain red component
    expect(light.error).toMatch(/^#FF|#[0-9A-Fa-f]{2}[0-5][0-9]/);
  });
});
