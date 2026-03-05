<?php
/**
 * Admin Bar menu for Social Schedule.
 *
 * Displays social schedule status in the WordPress admin bar on singular posts/pages.
 *
 * @package PRC\Platform\Social
 */

namespace PRC\Platform\Social;

/**
 * Admin_Bar class.
 *
 * @package PRC\Platform\Social
 */
class Admin_Bar {

	/**
	 * Initialize the class and register hooks via the loader.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( $loader ) {
		$loader->add_action( 'wp_before_admin_bar_render', $this, 'admin_bar_menu', 200 );
	}

	/**
	 * Render the social schedule admin bar menu.
	 *
	 * @hook wp_before_admin_bar_render
	 */
	public function admin_bar_menu() {
		if ( ! is_user_logged_in() ) {
			return;
		}

		if ( ! is_singular() ) {
			return;
		}

		$post_id   = get_the_ID();
		$post_type = get_post_type( $post_id );

		// Only show on post types that support prc-social.
		if ( ! post_type_supports( $post_type, 'prc-social' ) ) {
			return;
		}

		global $wp_admin_bar;

		$messages = get_post_meta( $post_id, '_social_messages', true );
		$messages = is_array( $messages ) ? $messages : array();

		$drafts_meta       = get_post_meta( $post_id, '_social_message_drafts', true );
		$drafts_meta       = is_array( $drafts_meta ) ? $drafts_meta : array();
		$draft_platforms   = isset( $drafts_meta['selectedPlatforms'] ) && is_array( $drafts_meta['selectedPlatforms'] ) ? $drafts_meta['selectedPlatforms'] : array();
		$draft_data        = isset( $drafts_meta['platformData'] ) && is_array( $drafts_meta['platformData'] ) ? $drafts_meta['platformData'] : array();
		$draft_sched_time  = $drafts_meta['scheduledTime'] ?? '';

		// Filter to only platforms that have actual text content.
		$active_drafts = array();
		foreach ( $draft_platforms as $platform ) {
			$text = isset( $draft_data[ $platform ]['text'] ) ? trim( $draft_data[ $platform ]['text'] ) : '';
			if ( ! empty( $text ) ) {
				$active_drafts[ $platform ] = $draft_data[ $platform ];
			}
		}

		$has_messages = ! empty( $messages );
		$has_drafts   = ! empty( $active_drafts );

		if ( ! $has_messages && ! $has_drafts ) {
	$wp_admin_bar->add_menu(
		array(
			'id'     => 'prc-social-schedule',
			'title'  => __( 'Social Schedule', 'prc-social' ),
			'href'   => '#prc-social-schedule-modal',
			'parent' => 'tools',
			'meta'   => array(
				'class' => 'prc-social-admin-bar-trigger',
			),
		)
	);
		$wp_admin_bar->add_node(
			array(
				'id'     => 'prc-social-schedule-none',
				'title'  => __( 'No Social Posts', 'prc-social' ),
				'href'   => false,
				'parent' => 'prc-social-schedule',
			)
		);
		return;
		}

		// Count messages by status.
		$status_counts = array(
			'scheduled' => 0,
			'posted'    => 0,
			'error'     => 0,
		);
		foreach ( $messages as $message ) {
			$status = $message['status'] ?? 'scheduled';
			if ( isset( $status_counts[ $status ] ) ) {
				++$status_counts[ $status ];
			}
		}

		// Build the count badge text.
		$badge_parts = array();
		if ( count( $active_drafts ) > 0 ) {
			/* translators: %d: number of draft posts */
			$badge_parts[] = sprintf( __( '%d draft', 'prc-social' ), count( $active_drafts ) );
		}
		if ( $status_counts['scheduled'] > 0 ) {
			/* translators: %d: number of scheduled posts */
			$badge_parts[] = sprintf( __( '%d scheduled', 'prc-social' ), $status_counts['scheduled'] );
		}
		if ( $status_counts['posted'] > 0 ) {
			/* translators: %d: number of posted posts */
			$badge_parts[] = sprintf( __( '%d posted', 'prc-social' ), $status_counts['posted'] );
		}
		if ( $status_counts['error'] > 0 ) {
			/* translators: %d: number of error posts */
			$badge_parts[] = sprintf( __( '%d error', 'prc-social' ), $status_counts['error'] );
		}
		$badge_text = implode( ', ', $badge_parts );

		$wp_admin_bar->add_menu(
			array(
				'id'     => 'prc-social-schedule',
				'title'  => sprintf(
					/* translators: %s: count badge text */
					__( 'Social Schedule (%s)', 'prc-social' ),
					$badge_text
				),
				'href'   => '#prc-social-schedule-modal',
				'parent' => 'tools',
				'meta'   => array(
					'class' => 'prc-social-admin-bar-trigger',
				),
			)
		);

		// Platform display names.
		$platform_names = array(
			'twitter'  => __( 'Twitter / X', 'prc-social' ),
			'facebook' => __( 'Facebook', 'prc-social' ),
			'threads'  => __( 'Threads', 'prc-social' ),
			'bluesky'  => __( 'Bluesky', 'prc-social' ),
		);

		// Status display labels.
		$status_labels = array(
			'scheduled' => __( 'Scheduled', 'prc-social' ),
			'posted'    => __( 'Published', 'prc-social' ),
			'error'     => __( 'Error', 'prc-social' ),
		);

		// Add sub-items for each draft.
		if ( $has_drafts ) {
			$wp_admin_bar->add_node(
				array(
					'id'     => 'prc-social-schedule-drafts-heading',
					'title'  => '<em>' . esc_html__( '— Drafts —', 'prc-social' ) . '</em>',
					'href'   => false,
					'parent' => 'prc-social-schedule',
				)
			);

			foreach ( $active_drafts as $platform => $data ) {
				$platform_label = $platform_names[ $platform ] ?? ucfirst( $platform );
				$text_preview   = mb_strimwidth( trim( $data['text'] ?? '' ), 0, 50, '…' );

				$title = sprintf( '%s — %s', $platform_label, __( 'Draft', 'prc-social' ) );

				if ( ! empty( $draft_sched_time ) ) {
					$timestamp    = strtotime( $draft_sched_time );
					$time_display = $timestamp ? wp_date( 'M j, Y g:i A', $timestamp ) : $draft_sched_time;
					$title       .= sprintf( ' — %s', $time_display );
				}

				if ( ! empty( $text_preview ) ) {
					$title .= sprintf( ' — "%s"', $text_preview );
				}

				$wp_admin_bar->add_node(
					array(
						'id'     => 'prc-social-schedule-draft-' . $platform,
						'title'  => esc_html( $title ),
						'href'   => false,
						'parent' => 'prc-social-schedule',
					)
				);
			}
		}

		// Add sub-items for each sent/scheduled message.
		if ( $has_messages ) {
			if ( $has_drafts ) {
				$wp_admin_bar->add_node(
					array(
						'id'     => 'prc-social-schedule-messages-heading',
						'title'  => '<em>' . esc_html__( '— Sent & Scheduled —', 'prc-social' ) . '</em>',
						'href'   => false,
						'parent' => 'prc-social-schedule',
					)
				);
			}

			foreach ( $messages as $index => $message ) {
				$platform = $message['platform'] ?? '';
				$status   = $message['status'] ?? 'scheduled';
				$time     = $message['scheduled_time'] ?? '';

				$platform_label = $platform_names[ $platform ] ?? ucfirst( $platform );
				$status_label   = $status_labels[ $status ] ?? ucfirst( $status );

				$time_display = '';
				if ( ! empty( $time ) ) {
					$timestamp    = strtotime( $time );
					$time_display = $timestamp ? wp_date( 'M j, Y g:i A', $timestamp ) : $time;
				}

				$title = sprintf( '%s — %s', $platform_label, $status_label );
				if ( ! empty( $time_display ) ) {
					$title .= sprintf( ' — %s', $time_display );
				}

				$href = false;
				if ( 'posted' === $status && ! empty( $message['published_url'] ) ) {
					$href = esc_url( $message['published_url'] );
				}

				$wp_admin_bar->add_node(
					array(
						'id'     => 'prc-social-schedule-message-' . $index,
						'title'  => esc_html( $title ),
						'href'   => $href,
						'parent' => 'prc-social-schedule',
						'meta'   => array(
							'target' => $href ? '_blank' : '',
						),
					)
				);
			}
		}
	}
}
