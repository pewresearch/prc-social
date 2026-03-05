/**
 * PRC Social Editor UI
 *
 * Provides a sidebar interface for social media image generation and
 * scheduling posts via Hootsuite.
 */

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useCommand } from '@wordpress/commands';
import { useDispatch } from '@wordpress/data';
import { store as editPostStore } from '@wordpress/edit-post';
import { share } from '@wordpress/icons';
import { registerPlugin } from '@wordpress/plugins';
import { PanelBody } from '@wordpress/components';

/**
 * Internal Dependencies
 */
import { ProvideSocial } from './context';
import SidebarWrapper from './sidebar-wrapper';
import HootsuitePanel from './hootsuite';

const PLUGIN_NAME = 'prc-social';

/**
 * Main PRC Social Plugin Component.
 * Renders the sidebar with Hootsuite scheduling (per-network "Generate Image" opens poster modal).
 *
 * @return {JSX.Element} Plugin component.
 */
function PRCSocialPlugin() {
	const { openGeneralSidebar } = useDispatch(editPostStore);

	useCommand({
		name: 'prc/show-social-scheduler',
		label: __('Show Social Scheduler', 'prc-social'),
		icon: share,
		category: 'view',
		keywords: ['social', 'schedule', 'hootsuite', 'scheduler'],
		callback: ({ close }) => {
			openGeneralSidebar(`${PLUGIN_NAME}/${PLUGIN_NAME}`);
			close();
		},
	});

	return (
		<SidebarWrapper id={PLUGIN_NAME}>
			<ProvideSocial>
				<PanelBody
					title={__('Schedule Posts', 'prc-social')}
					initialOpen={true}
				>
					<HootsuitePanel />
				</PanelBody>
			</ProvideSocial>
		</SidebarWrapper>
	);
}

registerPlugin(PLUGIN_NAME, { render: PRCSocialPlugin });
