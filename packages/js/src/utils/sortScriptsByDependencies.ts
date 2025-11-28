import { EnqueuedScript } from '../types';

/**
 * Sorts scripts by their dependencies using topological sort.
 * Ensures that dependencies are loaded before scripts that depend on them.
 *
 * @param scripts - Array of EnqueuedScript objects with potential dependencies
 * @returns Sorted array where dependencies appear before dependents
 */
export function sortScriptsByDependencies(scripts: EnqueuedScript[]): EnqueuedScript[] {
  if (!scripts || scripts.length === 0) {
    return [];
  }

  // Create a map for quick script lookup by handle
  const scriptMap = new Map<string, EnqueuedScript>();
  scripts.forEach(script => {
    if (script.handle) {
      scriptMap.set(script.handle, script);
    }
  });

  // Build adjacency list and in-degree map
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  scripts.forEach(script => {
    if (!script.handle) return;

    if (!adjList.has(script.handle)) {
      adjList.set(script.handle, []);
      inDegree.set(script.handle, 0);
    }
  });

  // Build the dependency graph
  scripts.forEach(script => {
    if (!script.handle) return;

    const dependencies = script.dependencies?.filter(Boolean) || [];

    dependencies.forEach(dep => {
      if (dep?.handle && scriptMap.has(dep.handle)) {
        // Add edge from dependency to dependent
        const depList = adjList.get(dep.handle) || [];
        depList.push(script.handle!);
        adjList.set(dep.handle, depList);

        // Increase in-degree of dependent
        inDegree.set(script.handle!, (inDegree.get(script.handle!) || 0) + 1);
      }
    });
  });

  // Kahn's algorithm for topological sort
  const sorted: string[] = [];
  const queue: string[] = [];

  // Start with scripts that have no dependencies (in-degree = 0)
  inDegree.forEach((degree, handle) => {
    if (degree === 0) {
      queue.push(handle);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    // Process all scripts that depend on current
    const dependents = adjList.get(current) || [];
    dependents.forEach(dependent => {
      const newDegree = (inDegree.get(dependent) || 0) - 1;
      inDegree.set(dependent, newDegree);

      if (newDegree === 0) {
        queue.push(dependent);
      }
    });
  }

  // Check for circular dependencies
  if (sorted.length !== scripts.length) {
    console.warn(
      `[sortScriptsByDependencies] Circular dependency detected. ` +
      `Expected ${scripts.length} scripts, got ${sorted.length}. ` +
      `Some scripts may not load in optimal order.`
    );

    // Add remaining scripts (those in cycles) to the end
    scripts.forEach(script => {
      if (script.handle && !sorted.includes(script.handle)) {
        sorted.push(script.handle);
      }
    });
  }

  // Convert sorted handles back to script objects
  const sortedScripts: EnqueuedScript[] = [];
  sorted.forEach(handle => {
    const script = scriptMap.get(handle);
    if (script) {
      sortedScripts.push(script);
    }
  });

  // Add any scripts without handles to the end
  scripts.forEach(script => {
    if (!script.handle) {
      sortedScripts.push(script);
    }
  });

  return sortedScripts;
}
