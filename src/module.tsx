import React from 'react';
import { AppPlugin, type AppRootProps } from '@grafana/data';
import { AppConfig } from './pages/AppConfig';
import { LandingPage } from './pages/LandingPage';
import type { AppSettings } from './types';

export const plugin = new AppPlugin<AppSettings>()
  .setRootPage((props: AppRootProps) => <LandingPage {...props} />)
  .addConfigPage({
    title: 'Configuration',
    icon: 'cog',
    body: AppConfig,
    id: 'configuration',
  });
