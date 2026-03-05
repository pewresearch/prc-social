/**
 * Admin Surfaces Entry Point
 *
 * Mounts admin column buttons, frontend report, and admin bar modal via domReady.
 */

/**
 * WordPress Dependencies
 */
import domReady from '@wordpress/dom-ready';
import { render, useState, useMemo, useEffect } from '@wordpress/element';

/**
 * Internal Dependencies
 */
import { ProvideMessages } from './context';
import AdminColumnButton from './admin-column-button';
import FrontendReport from './frontend-report';
import SocialMessagesModal from './social-messages-modal';

import './style.scss';

/**
 * Wrapper component for the ACP column cell.
 * Hover-to-initialize, click-to-open-modal pattern.
 *
 * @param {Object} props          Component props.
 * @param {string} props.postId   The post ID.
 * @param {string} props.postType The post type.
 * @return {JSX.Element} Admin column social schedule component.
 */
const AdminColumnSocialSchedule = ({ postId, postType }) => {
	const [hovered, setIsHovered] = useState(false);

	const handleHover = () => {
		if (!hovered) {
			setIsHovered(true);
		}
	};

	const initialized = useMemo(() => {
		return hovered;
	}, [hovered]);

	return (
		<ProvideMessages
			postId={postId}
			postType={postType}
			enabled={initialized}
		>
			<AdminColumnButton
				initialized={initialized}
				handleHover={handleHover}
			/>
		</ProvideMessages>
	);
};

/**
 * Wrapper component for the frontend report page.
 *
 * @param {Object} props          Component props.
 * @param {string} props.postId   The post ID.
 * @param {string} props.postType The post type.
 * @return {JSX.Element} Frontend social schedule report component.
 */
const FrontendSocialScheduleReport = ({ postId, postType }) => {
	return (
		<ProvideMessages postId={postId} postType={postType} enabled={true}>
			<FrontendReport />
		</ProvideMessages>
	);
};

/**
 * Admin bar modal component.
 *
 * Listens for clicks on the admin bar "Social Schedule" node and opens
 * the SocialMessagesModal in response.
 *
 * @param {Object} props          Component props.
 * @param {string} props.postId   The post ID.
 * @param {string} props.postType The post type.
 * @return {JSX.Element|null} Modal when open, null otherwise.
 */
const AdminBarModal = ({ postId, postType }) => {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		const adminBarNode = document.getElementById(
			'wp-admin-bar-prc-social-schedule'
		);
		if (!adminBarNode) {
			return;
		}

		const handleClick = (e) => {
			e.preventDefault();
			e.stopPropagation();
			setIsOpen(true);
		};

		// Attach click to the top-level anchor inside the admin bar node.
		const anchor = adminBarNode.querySelector('.ab-item');
		if (anchor) {
			anchor.addEventListener('click', handleClick);
		}

		return () => {
			if (anchor) {
				anchor.removeEventListener('click', handleClick);
			}
		};
	}, []);

	if (!isOpen) {
		return null;
	}

	return (
		<ProvideMessages postId={postId} postType={postType} enabled={true}>
			<SocialMessagesModal onClose={() => setIsOpen(false)} />
		</ProvideMessages>
	);
};

/**
 * Initialize admin column buttons by finding all placeholder divs.
 */
function initButtons() {
	const buttons = document.querySelectorAll('.prc-social-schedule-column');
	buttons.forEach((button) => {
		const { posttype, postid } = button.dataset;
		const postType = posttype;
		const postId = postid;
		render(
			<AdminColumnSocialSchedule postId={postId} postType={postType} />,
			button
		);
	});
}

/**
 * Initialize the frontend report by finding the report container div.
 */
function initFrontend() {
	const reportEl = document.getElementById('js-prc-social-schedule-report');
	if (reportEl) {
		const { posttype, postid } = reportEl.dataset;
		const postType = posttype;
		const postId = postid;
		render(
			<FrontendSocialScheduleReport
				postId={postId}
				postType={postType}
			/>,
			reportEl
		);
	}
}

/**
 * Initialize the admin bar modal by finding the mount point div.
 */
function initAdminBar() {
	const mountEl = document.getElementById('js-prc-social-admin-bar-modal');
	if (mountEl) {
		const { posttype, postid } = mountEl.dataset;
		const postType = posttype;
		const postId = postid;
		render(<AdminBarModal postId={postId} postType={postType} />, mountEl);
	}
}

domReady(() => {
	if (document.querySelector('.prc-social-schedule-column')) {
		initButtons();
	}
	if (document.getElementById('js-prc-social-schedule-report')) {
		initFrontend();
	}
	if (document.getElementById('js-prc-social-admin-bar-modal')) {
		initAdminBar();
	}
});
