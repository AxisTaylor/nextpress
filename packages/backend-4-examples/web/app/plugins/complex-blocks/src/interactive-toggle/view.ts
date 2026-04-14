/**
 * Interactive Toggle — client-side view module.
 *
 * Uses @wordpress/interactivity to toggle visibility of content.
 */
import { store, getContext } from '@wordpress/interactivity';

interface ToggleContext {
  isOpen: boolean;
}

store( 'complex-blocks/interactive-toggle', {
  state: {
    get buttonLabel(): string {
      const { isOpen } = getContext<ToggleContext>();
      return isOpen ? 'Hide content' : 'Show content';
    },
  },
  actions: {
    toggle() {
      const context = getContext<ToggleContext>();
      context.isOpen = ! context.isOpen;
    },
  },
} );
