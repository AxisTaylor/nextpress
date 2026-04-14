/**
 * Interactive Counter — client-side view module.
 *
 * Uses @wordpress/interactivity to manage a simple click counter.
 */
import { store, getContext } from '@wordpress/interactivity';

interface CounterContext {
  count: number;
}

store( 'complex-blocks/interactive-counter', {
  actions: {
    increment() {
      const context = getContext<CounterContext>();
      context.count++;
    },
  },
} );
