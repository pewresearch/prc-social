<?php
/**
 * Admin Surfaces orchestrator for Social Schedule.
 *
 * Handles asset registration, query var, content filter, and ACP column registration.
 *
 * @package PRC\Platform\Social
 */

namespace PRC\Platform\Social;

use WP_Error;

/**
 * Admin_Surfaces class.
 *
 * @package PRC\Platform\Social
 */
class Admin_Surfaces {

	/**
	 * The handle for the admin surfaces asset.
	 *
	 * @var string
	 */
	public static $handle = 'prc-social-admin-surfaces';

	/**
	 * Initialize the class and set its properties.
	 *
	 * @param Loader $loader The loader object.
	 */
	public function __construct( $loader ) {
		$this->init( $loader );
	}

	/**
	 * Initialize hooks via the loader.
	 *
	 * @param Loader|null $loader The loader object.
	 */
	public function init( $loader = null ) {
		if ( null !== $loader ) {
			$loader->add_filter( 'query_vars', $this, 'register_query_vars' );
			$loader->add_action( 'wp_enqueue_scripts', $this, 'enqueue_frontend_assets' );
			$loader->add_filter( 'the_content', $this, 'add_report_to_content' );
			$loader->add_action( 'admin_enqueue_scripts', $this, 'register_assets' );
			$loader->add_action( 'ac/ready', $this, 'register_column' );
			$loader->add_action( 'wp_footer', $this, 'render_admin_bar_mount_point' );
		}
	}

	/**
	 * Register the socialScheduleReport query var.
	 *
	 * @param array $vars The query vars.
	 * @return array
	 */
	public function register_query_vars( $vars ) {
		$vars[] = 'socialScheduleReport';
		return $vars;
	}

	/**
	 * Register the Admin Columns Pro custom column.
	 */
	public function register_column() {
		add_action(
			'ac/column_types',
			function ( \AC\ListScreen $list_screen ) {
				require_once plugin_dir_path( __FILE__ ) . 'class-acp-column.php';

				if ( 'post' === $list_screen->get_key() ) {
					$list_screen->register_column_type( new \PRC_PLATFORM_COLUMNS\PRC_SOCIAL_SCHEDULE_COLUMN() );
				}
			}
		);
	}

	/**
	 * Register the assets for admin surfaces.
	 */
	public function register_assets() {
		$asset_file = include plugin_dir_path( PRC_SOCIAL_FILE ) . 'build/admin-surfaces/index.asset.php';
		$asset_slug = self::$handle;
		$script_src = plugins_url( 'build/admin-surfaces/index.js', PRC_SOCIAL_FILE );
		$style_src  = plugins_url( 'build/admin-surfaces/style-index.css', PRC_SOCIAL_FILE );

		$script = wp_register_script(
			$asset_slug,
			$script_src,
			$asset_file['dependencies'],
			$asset_file['version'],
			true
		);

		$style = wp_register_style(
			$asset_slug,
			$style_src,
			array( 'wp-components' ),
			$asset_file['version']
		);

		if ( ! $script || ! $style ) {
			return new WP_Error( self::$handle, 'Failed to register all assets' );
		}

		return true;
	}

	/**
	 * Check if the current singular page supports prc-social.
	 *
	 * @return bool
	 */
	private function is_social_singular() {
		if ( is_admin() || ! is_singular() || ! is_user_logged_in() ) {
			return false;
		}
		$post_id   = get_the_ID();
		$post_type = get_post_type( $post_id );
		return post_type_supports( $post_type, 'prc-social' );
	}

	/**
	 * Enqueue the frontend assets when the socialScheduleReport query var is set
	 * or on singular pages that support prc-social (for admin bar modal).
	 */
	public function enqueue_frontend_assets() {
		$registered = $this->register_assets();
		if ( is_wp_error( $registered ) ) {
			return;
		}

		$should_enqueue = get_query_var( 'socialScheduleReport', false ) || $this->is_social_singular();

		if ( ! is_admin() && $should_enqueue ) {
			wp_enqueue_script( self::$handle );
			wp_enqueue_style( self::$handle );
		}
	}

	/**
	 * Replace the post content with the social schedule report container
	 * when the socialScheduleReport query var is set.
	 *
	 * @param string $post_content The post content.
	 * @return string
	 */
	public function add_report_to_content( $post_content ) {
		if ( get_query_var( 'socialScheduleReport', false ) ) {
			$post_id      = get_the_ID();
			$post_type    = get_post_type( $post_id );
			$post_content = '<div id="js-prc-social-schedule-report" data-postType="' . esc_attr( $post_type ) . '" data-postId="' . esc_attr( $post_id ) . '"></div>';
		}
		return $post_content;
	}

	/**
	 * Render a hidden mount-point div in the footer for the admin bar modal.
	 *
	 * @hook wp_footer
	 */
	public function render_admin_bar_mount_point() {
		if ( ! $this->is_social_singular() ) {
			return;
		}
		$post_id   = get_the_ID();
		$post_type = get_post_type( $post_id );
		printf(
			'<div id="js-prc-social-admin-bar-modal" data-posttype="%s" data-postid="%s"></div>',
			esc_attr( $post_type ),
			esc_attr( $post_id )
		);
	}
}
