import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PostHogProvider } from '@posthog/react';

import App from './App';

const posthogOptions = {
  api_host: 'https://eu.i.posthog.com',
  };

  const rootElement = document.getElementById('root');
  const root = createRoot(rootElement);

  root.render(
    <StrictMode>
        <PostHogProvider
              apiKey='phc_vePWJTHvVnUFDy5eVtDqkD42t7xkoXLF5EmFCxg2bWcv'
                    options={posthogOptions}
                        >
                              <App />
                                  </PostHogProvider>
                                    </StrictMode>
                                    );