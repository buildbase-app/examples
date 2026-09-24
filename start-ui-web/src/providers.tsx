// Modified from BearStudio/start-ui-web: wrapped in the BuildBase provider.
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import '@/lib/dayjs/config';
import '@/lib/i18n';
import '@fontsource-variable/inter';

import { QueryClientProvider } from '@/lib/tanstack-query/provider';

import { Sonner } from '@/components/ui/sonner';

import { envClient } from '@/env/client';
import { BuildBaseProvider } from '@/features/auth/buildbase-provider';
import {
  DemoModeDrawer,
  useIsDemoModeDrawerVisible,
} from '@/features/demo/demo-mode-drawer';

export const Providers = (props: {
  children: ReactNode;
  forcedTheme?: string;
}) => {
  const isDemoModeDrawerVisible = useIsDemoModeDrawerVisible();
  return (
    <ThemeProvider
      attribute="class"
      storageKey="theme"
      disableTransitionOnChange
      forcedTheme={props.forcedTheme}
    >
      <QueryClientProvider>
        <BuildBaseProvider>{props.children}</BuildBaseProvider>
        {!isDemoModeDrawerVisible && <Sonner />}
        {envClient.VITE_IS_DEMO && <DemoModeDrawer />}
      </QueryClientProvider>
    </ThemeProvider>
  );
};
