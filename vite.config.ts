import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build to one self-contained dist/index.html that can be opened directly.
export default defineConfig({ plugins: [viteSingleFile()] });
