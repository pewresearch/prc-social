<?php
/**
 * Fired during plugin deactivation.
 *
 * @package    PRC\Platform\Social
 */

namespace PRC\Platform\Social;

/**
 * The plugin deactivator class.
 *
 * @package    PRC\Platform\Social
 */
class Plugin_Deactivator {

	/**
	 * Deactivate the plugin.
	 *
	 * @since    1.0.0
	 */
	public static function deactivate() {
		flush_rewrite_rules();

		wp_mail(
			DEFAULT_TECHNICAL_CONTACT,
			'PRC Social Deactivated',
			'The PRC Social plugin has been deactivated on ' . get_site_url()
		);
	}
}
