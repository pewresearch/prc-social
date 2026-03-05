/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';

/**
 * Internal Dependencies
 */
import Icon from './icon';

export default function SidebarWrapper({ children, id }) {
	return (
		<>
			<PluginSidebarMoreMenuItem target={id} icon={null}>
				{__('Social Scheduler', 'prc-social')}
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name={id}
				title={__('Social Scheduler', 'prc-social')}
				icon={<Icon />}
			>
				{children}
			</PluginSidebar>
		</>
	);
}
