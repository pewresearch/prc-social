/**
 * Frontend Report
 *
 * Full-page report component that auto-opens the Social Messages Modal.
 */

/**
 * Internal Dependencies
 */
import SocialMessagesModal from './social-messages-modal';

/**
 * Frontend Report component.
 * Immediately renders the modal; closing redirects away from the report page.
 *
 * @return {JSX.Element} Frontend report component.
 */
export default function FrontendReport() {
	return (
		<SocialMessagesModal
			onClose={() => {
				// Redirect to the current URL but remove the ?socialScheduleReport=true query parameter
				window.location = window.location.href.replace(
					/[?&]socialScheduleReport=true/,
					''
				);
			}}
		/>
	);
}
