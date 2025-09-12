import React, { createContext, useContext, useEffect } from 'react';
import { ChatTheme } from '../types';

interface ThemeContextValue {
  theme: ChatTheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  theme: ChatTheme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, theme }) => {
  useEffect(() => {
    // Apply theme CSS variables to the chat widget root
    const root = document.documentElement;
    const themeVars = {
      '--chat-primary-color': theme.primaryColor,
      '--chat-secondary-color': theme.secondaryColor,
      '--chat-background-color': theme.backgroundColor,
      '--chat-text-color': theme.textColor,
      '--chat-font-family': theme.fontFamily,
      '--chat-border-radius': theme.borderRadius,
      '--chat-user-bubble-bg': theme.messageBubbleUser.backgroundColor,
      '--chat-user-bubble-text': theme.messageBubbleUser.textColor,
      '--chat-assistant-bubble-bg': theme.messageBubbleAssistant.backgroundColor,
      '--chat-assistant-bubble-text': theme.messageBubbleAssistant.textColor,
    };

    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Cleanup on unmount
    return () => {
      Object.keys(themeVars).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme }}>
      <div 
        className="chat-widget-root"
        style={{
          fontFamily: theme.fontFamily,
          color: theme.textColor,
          backgroundColor: theme.backgroundColor,
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
