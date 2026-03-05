<?php
/**
 * Admin Columns Pro column definition for Social Schedule.
 *
 * @package PRC\Platform\Social
 */

namespace PRC_PLATFORM_COLUMNS;

class PRC_SOCIAL_SCHEDULE_COLUMN extends \AC\Column {

	public function __construct() {

		// Identifier, pick a unique name. Single word, no spaces. Underscores allowed.
		$this->set_type( 'column-PRC_SOCIAL_SCHEDULE_COLUMN' );

		// Default column label.
		$this->set_label( __( 'Social Schedule', 'prc-social' ) );
	}

	/**
	 * Returns the display value for the column.
	 *
	 * @param int $post_id Post ID.
	 *
	 * @return string Value
	 */
	public function get_value( $post_id ) {
		$post_type = get_post_type( $post_id );
		$value     = '<div class="prc-social-schedule-column" data-postType="' . esc_attr( $post_type ) . '" data-postId="' . esc_attr( $post_id ) . '">Loading...</div>';
		return $value;
	}

	/**
	 * Enqueue CSS + JavaScript on the admin listings screen.
	 *
	 * This action is called in the admin_head action on the listings screen
	 * where your column values are displayed.
	 */
	public function scripts() {
		wp_enqueue_script( 'prc-social-admin-surfaces' );
		wp_enqueue_style( 'prc-social-admin-surfaces' );
		wp_enqueue_style( 'wp-components' );
	}
}
