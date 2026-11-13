import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

describe('HTML Shell & CSS Design System', () => {
    test('index.html should contain required containers', () => {
        const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
        assert.match(html, /<div id="map-canvas"/, 'Missing #map-canvas');
        assert.match(html, /<div id="story-desk"/, 'Missing #story-desk');
    });

    test('css/styles.css should contain required design system variables', () => {
        const css = fs.readFileSync(path.join(rootDir, 'css', 'styles.css'), 'utf8');
        assert.match(css, /--primary-color:/, 'Missing --primary-color variable');
        assert.match(css, /--font-main:/, 'Missing --font-main variable');
    });
});
