import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import * as presentation from './presentation';

const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require('react-dom/server') as {
  renderToStaticMarkup: (element: React.ReactElement) => string;
};
const web = require('react-native-web');

// Render the production component through RN Web's real style resolver. Only
// the native animation/theme boundaries are adapted for deterministic SSR.
function loadComponent(reducedMotion: boolean) {
  const load = (path: string): Record<string, React.ComponentType<any>> => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    });
    const module = { exports: {} };
    const dependencies = (id: string) => {
      if (id === 'react-native') return web;
      if (id === 'react-native-reanimated') return {
        __esModule: true, default: { View: web.View },
        useAnimatedStyle: (worklet: () => unknown) => worklet(),
        useSharedValue: (value: number) => ({ value }),
        useReducedMotion: () => reducedMotion,
        withTiming: (value: number) => value,
      };
      if (id === '../../theme/ThemeProvider') return { useTheme: () => ({ theme: {
        colors: { focus: '#123456' }, borderRadius: { full: 999 },
        materials: { celebration: '#abcdef', glowOpacity: 0, cellDepth: 1, pieceShadowOpacity: 0.2 },
      } }) };
      if (id === '../../game-visuals/presentation') return presentation;
      if (id === './StateMarker') return load('../components/game-visuals/StateMarker.tsx');
      return require(id);
    };
    new Function('require', 'module', 'exports', outputText)(dependencies, module, module.exports);
    return module.exports;
  };
  return load('../components/game-visuals/GamePieceImage.tsx').GamePieceImage;
}

function renderPiece(pressed: boolean, reducedMotion: boolean, style?: unknown) {
  return renderToStaticMarkup(React.createElement(loadComponent(reducedMotion), {
    source: { uri: 'stone.png', width: 32, height: 32 }, size: 32, pressed, style,
  }));
}

test('rendered caller rotation survives with the animated press scale, including reduced motion', () => {
  for (const reducedMotion of [false, true]) {
    for (const pressed of [false, true]) {
      const html = renderPiece(pressed, reducedMotion, [
        { position: 'absolute', left: 9, top: 7 },
        [{ transform: [{ translateX: 2 }, { rotate: '17deg' }] }],
      ]);
      assert.match(html, new RegExp(`transform:translateX\\(2px\\) rotate\\(17deg\\) scale\\(${pressed ? '0.96' : '1'}\\)`));
      assert.match(html, /left:9px/);
      assert.match(html, /top:7px/);
      assert.match(html, /width:32px/);
      assert.match(html, /height:32px/);
      assert.match(html, /aria-hidden="true"/);
      assert.doesNotMatch(html, /role="button"|tabindex="0"/);
    }
  }
});

test('rendered string transforms compose without changing untransformed sprite consumers', () => {
  assert.match(renderPiece(true, false, { transform: 'rotate(-23deg)' }), /transform:rotate\(-23deg\) scale\(0.96\)/);
  assert.match(renderPiece(false, false), /transform:scale\(1\)/);
  assert.match(renderPiece(true, true), /transform:scale\(0.96\)/);
});
