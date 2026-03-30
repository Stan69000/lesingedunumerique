// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import decapCmsOauth from 'astro-decap-cms-oauth';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    decapCmsOauth({
      adminDisabled: true,
      oauthLoginRoute: '/oauth',
      oauthCallbackRoute: '/oauth/callback',
    }),
  ],
});
