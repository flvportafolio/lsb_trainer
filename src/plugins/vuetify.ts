import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'lsbDark',
    themes: {
      lsbDark: {
        dark: true,
        colors: {
          background: '#05080d',
          surface: '#10151f',
          primary: '#2fd17c',
          secondary: '#4fb6ff',
          accent: '#ffd166',
          error: '#ff5b6e',
          info: '#7dd3fc',
          success: '#2fd17c',
          warning: '#f59e0b',
        },
      },
    },
  },
});
