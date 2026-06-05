import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PostHogProvider } from '@posthog/react';

import App from './App';

const posthogOptions = {
  api_host: process.env.REACT_APP_POSTHOG_HOST,
  };

  const rootElement = document.getElementById('root');
  const root = createRoot(rootElement);

  root.render(
    <StrictMode>
        <PostHogProvider
              apiKey={process.env.REACT_APP_POSTHOG_KEY}
                    options={posthogOptions}
                        >
                              <App />
                                  </PostHogProvider>
                                    </StrictMode>
                                    );