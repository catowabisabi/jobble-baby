/**
 * Test helper: renderWithProviders
 *
 * Wraps a React component with all required context providers
 * needed by the app's component tree (ThemeProvider, LanguageProvider, etc.)
 *
 * Usage:
 *   const { getByText } = renderWithProviders(<HomeScreen />);
 */
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '../../app/context/ThemeContext';
import { LanguageProvider } from '../../app/context/LanguageContext';

type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'>;

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions
) {
  return render(
    <LanguageProvider>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </LanguageProvider>,
    options
  );
}
