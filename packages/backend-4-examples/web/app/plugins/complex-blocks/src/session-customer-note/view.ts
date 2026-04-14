/**
 * Session Customer Note — client-side view module.
 *
 * Uses @wordpress/interactivity to manage a form that updates the WC
 * customer billing first name via wp.apiFetch, which routes through the
 * NextPress proxy and handles nonce headers automatically.
 */
import { store, getContext } from '@wordpress/interactivity';

interface CustomerNoteContext {
  firstName: string;
  status: string;
}

store( 'complex-blocks/session-customer-note', {
  actions: {
    updateField( event: InputEvent ) {
      const context = getContext<CustomerNoteContext>();
      context.firstName = ( event.target as HTMLInputElement ).value;
    },
    *submit() {
      const context = getContext<CustomerNoteContext>();
      context.status = 'Saving…';

      try {
        const response: Response = yield ( window as any ).wp.apiFetch( {
          path: '/wc/store/v1/cart/update-customer',
          method: 'POST',
          data: {
            billing_address: {
              first_name: context.firstName,
            },
          },
        } );

        context.status = 'Saved!';
      } catch ( error ) {
        context.status = `Error: ${ ( error as Error ).message }`;
      }
    },
  },
} );
