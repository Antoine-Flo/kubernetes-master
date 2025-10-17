/// <reference types="vitest" />
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        tailwindcss()
    ],
    build: {
        // Minification avec terser (plus agressive que esbuild par défaut)
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,        // Retire tous les console.log
                drop_debugger: true,       // Retire les debugger
                passes: 2,                 // Deux passes de compression
                pure_funcs: ['console.info', 'console.debug', 'console.warn']
            },
            format: {
                comments: false            // Retire tous les commentaires
            }
        },
        // Code splitting optimisé
        rollupOptions: {
            output: {
                manualChunks: {
                    // Séparer xterm dans son propre chunk (grosse lib)
                    'xterm': ['@xterm/xterm']
                },
                // Noms de chunks lisibles
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]'
            }
        },
        // Avertir si un chunk dépasse 500KB
        chunkSizeWarningLimit: 500,
        // Pas de source maps en production
        sourcemap: false
    }
});