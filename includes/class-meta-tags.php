<?php
/**
 * Meta Tags class.
 *
 * @package PRC\Platform\Social
 */

namespace PRC\Platform\Social;

/**
 * Meta Tags class.
 *
 * @package PRC\Platform\Social
 */
class Meta_Tags {
	/**
	 * Meta Tags constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( $loader ) {
		$loader->add_action('wp_head', $this, 'facebook_app_id');
	}
	/**
	 * Facebook App ID.
	 *
	 * @return void
	 */
	public function facebook_app_id() {
		if ( ! defined( 'PRC_PLATFORM_FACEBOOK_APP_ID' ) ) {
			return;
		}
		// Double check that PRC_PLATFORM_FACEBOOK_APP_ID exists and has a value..
		echo wp_sprintf('<meta name="facebook_app_id" value="%s">', PRC_PLATFORM_FACEBOOK_APP_ID);
	}
}
