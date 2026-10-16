import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repository = process.env.GITHUB_REPOSITORY || '';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? `/${repository.split('/')[1] || ''}/` : '/',
});
