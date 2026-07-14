import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const base = process.env.ASTRO_BASE || '/begrippenkader-corporatiesector/';

export default defineConfig({
  site: process.env.ASTRO_SITE || 'https://aedes-nl.github.io',
  base,
  integrations: [react()],
  output: 'static',
});
