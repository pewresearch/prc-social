/**
 * Admin Column Button
 *
 * Button rendered in the ACP column cell. Hover to initialize (lazy-load data),
 * click to open the Social Messages Modal.
 */

/**
 * External Dependencies
 */
import styled from '@emotion/styled';
import classNames from 'classnames';

/**
 * WordPress Dependencies
 */
import { Fragment, useMemo, useState } from '@wordpress/element';
import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal Dependencies
 */
import { useMessages } from './context';
import SocialMessagesModal from './social-messages-modal';

const Button = styled.button`
	cursor: pointer !important;
	width: 100%;
	&.disabled {
		opacity: 0.5;
	}
`;

/**
 * Admin Column Button component.
 *
 * @param {Object}   props             Component props.
 * @param {boolean}  props.initialized Whether the context has been initialized.
 * @param {Function} props.handleHover Callback when button is first hovered.
 * @return {JSX.Element} Button component.
 */
export default function AdminColumnButton({ initialized, handleHover }) {
	const [active, setActive] = useState(false);
	const toggleActive = () => setActive(!active);
	const { messages, drafts, loading } = useMessages();

	const hasDrafts = useMemo(() => {
		return drafts?.selectedPlatforms && drafts.selectedPlatforms.length > 0;
	}, [drafts]);

	const hasContent = useMemo(() => {
		return messages.length > 0 || hasDrafts;
	}, [messages, hasDrafts]);

	const disabledButton = useMemo(() => {
		return initialized && (loading || !hasContent);
	}, [initialized, loading, hasContent]);

	const buttonText = useMemo(() => {
		if (loading) {
			return (
				<Fragment>
					{__('Loading…', 'prc-social')} <Spinner />
				</Fragment>
			);
		}
		if (initialized && !hasContent) {
			return __('No Social Posts', 'prc-social');
		}
		return __('View Social Schedule', 'prc-social');
	}, [initialized, loading, hasContent]);

	return (
		<Fragment>
			<Button
				className={classNames('button button-small button-secondary', {
					disabled: disabledButton,
				})}
				alt={__("View this post's social schedule", 'prc-social')}
				type="button"
				onMouseEnter={handleHover}
				onClick={() => {
					toggleActive();
				}}
			>
				{buttonText}
			</Button>
			{active && <SocialMessagesModal onClose={() => setActive(false)} />}
		</Fragment>
	);
}
