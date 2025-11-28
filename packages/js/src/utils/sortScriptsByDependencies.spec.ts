import { sortScriptsByDependencies } from './sortScriptsByDependencies';
import { EnqueuedScript } from '../types';
import { mockAssetsByUriQueryResult } from '../testing/mock';

describe('sortScriptsByDependencies', () => {
  // Extract scripts from mock data
  const mockScripts = mockAssetsByUriQueryResult.data.assetsByUri.enqueuedScripts.nodes as EnqueuedScript[];

  // Helper function to create a mock script
  const createScript = (handle: string, dependencies: string[] = []): EnqueuedScript => ({
    id: `script-${handle}`,
    handle,
    src: `https://example.com/${handle}.js`,
    dependencies: dependencies.map(dep => ({ handle: dep, id: `script-${dep}` })),
  });

  describe('empty and edge cases', () => {
    it('should handle empty array', () => {
      const result = sortScriptsByDependencies([]);
      expect(result).toEqual([]);
    });

    it('should handle single script', () => {
      const script = createScript('single');
      const result = sortScriptsByDependencies([script]);
      expect(result).toEqual([script]);
    });

    it('should handle scripts without handles', () => {
      const scriptWithHandle = createScript('with-handle');
      const scriptWithoutHandle: EnqueuedScript = {
        id: 'no-handle',
        src: 'https://example.com/no-handle.js',
      };

      const result = sortScriptsByDependencies([scriptWithHandle, scriptWithoutHandle]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(scriptWithHandle);
      expect(result[1]).toEqual(scriptWithoutHandle);
    });
  });

  describe('basic dependency sorting', () => {
    it('should sort scripts with no dependencies', () => {
      const script1 = createScript('script-1');
      const script2 = createScript('script-2');
      const script3 = createScript('script-3');

      const result = sortScriptsByDependencies([script1, script2, script3]);

      expect(result).toHaveLength(3);
      expect(result).toContain(script1);
      expect(result).toContain(script2);
      expect(result).toContain(script3);
    });

    it('should sort scripts with linear dependencies', () => {
      // Dependency chain: script-3 -> script-2 -> script-1
      const script1 = createScript('script-1');
      const script2 = createScript('script-2', ['script-1']);
      const script3 = createScript('script-3', ['script-2']);

      // Provide in reverse order to test sorting
      const result = sortScriptsByDependencies([script3, script2, script1]);

      expect(result).toEqual([script1, script2, script3]);
    });

    it('should handle multiple dependency levels', () => {
      // Complex tree:
      //     script-4
      //    /        \
      // script-2   script-3
      //    \        /
      //     script-1
      const script1 = createScript('script-1');
      const script2 = createScript('script-2', ['script-1']);
      const script3 = createScript('script-3', ['script-1']);
      const script4 = createScript('script-4', ['script-2', 'script-3']);

      const result = sortScriptsByDependencies([script4, script3, script2, script1]);

      const handles = result.map(s => s.handle);

      // script-1 must come first
      expect(handles[0]).toBe('script-1');

      // script-2 and script-3 must come before script-4
      const script2Index = handles.indexOf('script-2');
      const script3Index = handles.indexOf('script-3');
      const script4Index = handles.indexOf('script-4');

      expect(script2Index).toBeLessThan(script4Index);
      expect(script3Index).toBeLessThan(script4Index);
    });
  });

  describe('real-world WordPress scripts from mock data', () => {
    it('should handle real WordPress script dependencies', () => {
      // Get a subset of scripts with actual dependencies from the mock
      const wpHooks = mockScripts.find(s => s.handle === 'wp-hooks');
      const reactRefreshRuntime = mockScripts.find(s => s.handle === 'wp-react-refresh-runtime');
      const reactRefreshEntry = mockScripts.find(s => s.handle === 'wp-react-refresh-entry');
      const react = mockScripts.find(s => s.handle === 'react');

      // Filter out any undefined
      const scripts = [wpHooks, reactRefreshRuntime, reactRefreshEntry, react].filter(Boolean) as EnqueuedScript[];

      expect(scripts.length).toBeGreaterThan(0);

      const result = sortScriptsByDependencies(scripts);

      // Result should have same length
      expect(result).toHaveLength(scripts.length);

      // All scripts should be present
      scripts.forEach(script => {
        expect(result).toContain(script);
      });
    });

    it('should sort all mock scripts without errors', () => {
      // This tests that we can handle the full real-world dataset
      const result = sortScriptsByDependencies(mockScripts);

      expect(result).toHaveLength(mockScripts.length);

      // All scripts should be present
      mockScripts.forEach(script => {
        expect(result).toContain(script);
      });
    });

    it('should maintain dependency order in real WordPress scripts', () => {
      // react-refresh-entry depends on react-refresh-runtime
      const runtime = mockScripts.find(s => s.handle === 'wp-react-refresh-runtime');
      const entry = mockScripts.find(s => s.handle === 'wp-react-refresh-entry');

      if (runtime && entry && entry.dependencies?.some(d => d?.handle === 'wp-react-refresh-runtime')) {
        const result = sortScriptsByDependencies([entry, runtime]);
        const handles = result.map(s => s.handle);

        const runtimeIndex = handles.indexOf('wp-react-refresh-runtime');
        const entryIndex = handles.indexOf('wp-react-refresh-entry');

        expect(runtimeIndex).toBeLessThan(entryIndex);
      }
    });
  });

  describe('complex scenarios', () => {
    it('should handle complex dependency graph', () => {
      // Diamond pattern:
      //       D
      //      / \
      //     B   C
      //      \ /
      //       A
      const scriptA = createScript('A');
      const scriptB = createScript('B', ['A']);
      const scriptC = createScript('C', ['A']);
      const scriptD = createScript('D', ['B', 'C']);

      const result = sortScriptsByDependencies([scriptD, scriptC, scriptB, scriptA]);
      const handles = result.map(s => s.handle);

      // A must be first
      expect(handles[0]).toBe('A');

      // B and C must come before D
      expect(handles.indexOf('B')).toBeLessThan(handles.indexOf('D'));
      expect(handles.indexOf('C')).toBeLessThan(handles.indexOf('D'));
    });

    it('should handle missing dependencies gracefully', () => {
      // script-2 depends on 'non-existent' which is not in the array
      const script1 = createScript('script-1');
      const script2: EnqueuedScript = {
        id: 'script-2',
        handle: 'script-2',
        src: 'https://example.com/script-2.js',
        dependencies: [
          { handle: 'non-existent', id: 'non-existent' },
          { handle: 'script-1', id: 'script-1' },
        ],
      };

      const result = sortScriptsByDependencies([script2, script1]);
      const handles = result.map(s => s.handle);

      // script-1 should still come before script-2
      expect(handles.indexOf('script-1')).toBeLessThan(handles.indexOf('script-2'));
    });
  });

  describe('circular dependencies', () => {
    it('should detect and handle circular dependencies', () => {
      // Circular: script-1 -> script-2 -> script-3 -> script-1
      const script1: EnqueuedScript = {
        id: 'script-1',
        handle: 'script-1',
        src: 'https://example.com/script-1.js',
        dependencies: [{ handle: 'script-3', id: 'script-3' }],
      };

      const script2 = createScript('script-2', ['script-1']);
      const script3 = createScript('script-3', ['script-2']);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = sortScriptsByDependencies([script1, script2, script3]);

      // Should still return all scripts
      expect(result).toHaveLength(3);

      // Should warn about circular dependency
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circular dependency detected')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should include all scripts even with circular dependencies', () => {
      // Self-referential circular dependency
      const script1: EnqueuedScript = {
        id: 'script-1',
        handle: 'script-1',
        src: 'https://example.com/script-1.js',
        dependencies: [{ handle: 'script-1', id: 'script-1' }], // Depends on itself
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = sortScriptsByDependencies([script1]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(script1);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('stability and order preservation', () => {
    it('should maintain stable sort for independent scripts', () => {
      // When scripts have no dependencies between each other,
      // they should maintain their relative order
      const script1 = createScript('script-1');
      const script2 = createScript('script-2');
      const script3 = createScript('script-3');

      const input = [script1, script2, script3];
      const result = sortScriptsByDependencies(input);

      // Order should be preserved for independent scripts
      expect(result).toEqual(input);
    });
  });

  describe('null and undefined handling', () => {
    it('should handle null dependencies array', () => {
      const script: EnqueuedScript = {
        id: 'script-1',
        handle: 'script-1',
        src: 'https://example.com/script-1.js',
        dependencies: null,
      };

      const result = sortScriptsByDependencies([script]);
      expect(result).toEqual([script]);
    });

    it('should filter out null/undefined dependency items', () => {
      const script1 = createScript('script-1');
      const script2: EnqueuedScript = {
        id: 'script-2',
        handle: 'script-2',
        src: 'https://example.com/script-2.js',
        dependencies: [
          null,
          { handle: 'script-1', id: 'script-1' },
          undefined,
        ] as unknown as EnqueuedScript[],
      };

      const result = sortScriptsByDependencies([script2, script1]);
      const handles = result.map(s => s.handle);

      expect(handles).toEqual(['script-1', 'script-2']);
    });
  });
});
