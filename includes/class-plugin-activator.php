<?php
/**
 * Fired during plugin activation.
 *
 * @package    PRC\Platform\Social
 */

namespace PRC\Platform\Social;

/**
 * The plugin activator class.
 *
 * @package    PRC\Platform\Social
 */
class Plugin_Activator {

	/**
	 * Activate the plugin.
	 *
	 * @since    1.0.0
	 */
	public static function activate() {
		flush_rewrite_rules();

		wp_mail(
			DEFAULT_TECHNICAL_CONTACT,
			'PRC Social Activated',
			'The PRC Social plugin has been activated on ' . get_site_url()
		);
	}
}
