<?php
/**
 * Hootsuite Integration for Social Media Scheduling.
 *
 * @package    PRC\Platform\Social
 */

declare(strict_types=1);

namespace PRC\Platform\Social;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Handles Hootsuite API integration for scheduling social media posts.
 *
 * @package    PRC\Platform\Social
 */
class Hootsuite {

	/**
	 * Meta key for storing social messages.
	 *
	 * @var string
	 */
	const META_KEY = '_social_messages';

	/**
	 * Meta key for storing social message drafts.
	 *
	 * @var string
	 */
	const DRAFTS_META_KEY = '_social_message_drafts';

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	const REST_NAMESPACE = 'prc-social/v1';

	/**
	 * Hootsuite API base URL.
	 *
	 * @var string
	 */
	const HOOTSUITE_API_URL = 'https://platform.hootsuite.com/v1';

	/**
	 * Supported post types for social messages.
	 *
	 * @var array
	 */
	protected $post_types = array( 'post', 'page' );

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( $loader = null ) {
		$loader->add_action( 'init', $this, 'register_meta' );
		$loader->add_action( 'rest_api_init', $this, 'register_rest_field' );
		$loader->add_action( 'rest_api_init', $this, 'register_rest_routes' );
	}

	/**
	 * Get supported post types for social messages.
	 *
	 * @return array Array of post type slugs.
	 */
	protected function get_post_types(): array {
		/**
		 * Filter the post types that support social messages.
		 *
		 * @param array $post_types Array of post type slugs.
		 */
		return apply_filters( 'prc_social_messages_post_types', $this->post_types );
	}

	/**
	 * Get the schema for a single social message.
	 *
	 * @return array The message schema.
	 */
	protected function get_message_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'id'                   => array(
					'type'        => 'string',
					'description' => __( 'Unique identifier for the message.', 'prc-social' ),
				),
				'platform'             => array(
					'type'        => 'string',
					'enum'        => array( 'twitter', 'facebook', 'threads', 'bluesky' ),
					'description' => __( 'Social media platform.', 'prc-social' ),
				),
				'text'                 => array(
					'type'        => 'string',
					'description' => __( 'Message content.', 'prc-social' ),
				),
				'media_url'            => array(
					'type'        => 'string',
					'format'      => 'uri',
					'description' => __( 'URL of attached media.', 'prc-social' ),
				),
				'scheduled_time'       => array(
					'type'        => 'string',
					'format'      => 'date-time',
					'description' => __( 'ISO 8601 scheduled time.', 'prc-social' ),
				),
				'hootsuite_message_id' => array(
					'type'        => 'string',
					'description' => __( 'Hootsuite message ID.', 'prc-social' ),
				),
				'status'               => array(
					'type'        => 'string',
					'enum'        => array( 'scheduled', 'posted', 'error' ),
					'description' => __( 'Message status.', 'prc-social' ),
				),
				'published_url'        => array(
					'type'        => 'string',
					'format'      => 'uri',
					'description' => __( 'URL of published post.', 'prc-social' ),
				),
				'error_message'        => array(
					'type'        => 'string',
					'description' => __( 'Error message if status is error.', 'prc-social' ),
				),
				'thread_id'            => array(
					'type'        => 'string',
					'description' => __( 'UUID grouping messages in the same thread. Empty for standalone messages.', 'prc-social' ),
					'default'     => '',
				),
				'thread_order'         => array(
					'type'        => 'integer',
					'description' => __( 'Position within the thread (0-based).', 'prc-social' ),
					'default'     => 0,
				),
				'created_at'           => array(
					'type'        => 'string',
					'format'      => 'date-time',
					'description' => __( 'When the message was created.', 'prc-social' ),
				),
				'updated_at'           => array(
					'type'        => 'string',
					'format'      => 'date-time',
					'description' => __( 'When the message was last updated.', 'prc-social' ),
				),
			),
		);
	}

	/**
	 * Register the post meta for social messages.
	 *
	 * @hook init
	 */
	public function register_meta(): void {
		foreach ( $this->get_post_types() as $post_type ) {
			register_post_meta(
				$post_type,
				self::META_KEY,
				array(
					'type'              => 'array',
					'single'            => true,
					'show_in_rest'      => array(
						'schema' => array(
							'type'  => 'array',
							'items' => $this->get_message_schema(),
						),
					),
					'sanitize_callback' => array( $this, 'sanitize_social_messages' ),
					'auth_callback'     => array( $this, 'auth_callback' ),
				)
			);

			register_post_meta(
				$post_type,
				self::DRAFTS_META_KEY,
				array(
					'type'              => 'object',
					'single'            => true,
					'show_in_rest'      => array(
						'schema' => $this->get_drafts_schema(),
					),
					'sanitize_callback' => array( $this, 'sanitize_message_drafts' ),
					'auth_callback'     => array( $this, 'auth_callback' ),
					'default'           => array(),
				)
			);
		}
	}

	/**
	 * Register REST fields for social_messages and social_message_drafts.
	 *
	 * @hook rest_api_init
	 */
	public function register_rest_field(): void {
		foreach ( $this->get_post_types() as $post_type ) {
			register_rest_field(
				$post_type,
				'social_messages',
				array(
					'get_callback'    => array( $this, 'get_social_messages' ),
					'update_callback' => array( $this, 'update_social_messages' ),
					'schema'          => array(
						'description' => __( 'Scheduled social media messages.', 'prc-social' ),
						'type'        => 'array',
						'items'       => $this->get_message_schema(),
						'context'     => array( 'view', 'edit' ),
					),
				)
			);

			register_rest_field(
				$post_type,
				'social_message_drafts',
				array(
					'get_callback'    => array( $this, 'get_message_drafts' ),
					'update_callback' => array( $this, 'update_message_drafts' ),
					'schema'          => array(
						'description' => __( 'Draft social media messages (unsent, work-in-progress).', 'prc-social' ),
						'type'        => 'object',
						'properties'  => $this->get_drafts_schema()['properties'],
						'context'     => array( 'view', 'edit' ),
					),
				)
			);
		}
	}

	/**
	 * Register REST routes for Hootsuite operations.
	 *
	 * @hook rest_api_init
	 */
	public function register_rest_routes(): void {
		// Schedule a new post.
		register_rest_route(
			self::REST_NAMESPACE,
			'/hootsuite/schedule',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'rest_schedule_post' ),
				'permission_callback' => array( $this, 'rest_permission_check' ),
				'args'                => array(
					'post_id'        => array(
						'required'          => true,
						'type'              => 'integer',
						'description'       => __( 'The post ID to schedule for.', 'prc-social' ),
						'sanitize_callback' => 'absint',
					),
					'platform'       => array(
						'required'          => true,
						'type'              => 'string',
						'enum'              => array( 'twitter', 'facebook', 'threads', 'bluesky' ),
						'description'       => __( 'Social media platform.', 'prc-social' ),
						'sanitize_callback' => 'sanitize_text_field',
					),
					'text'           => array(
						'required'          => true,
						'type'              => 'string',
						'description'       => __( 'Message content.', 'prc-social' ),
						'sanitize_callback' => 'sanitize_textarea_field',
					),
					'scheduled_time' => array(
						'required'          => true,
						'type'              => 'string',
						'format'            => 'date-time',
						'description'       => __( 'ISO 8601 scheduled time.', 'prc-social' ),
						'sanitize_callback' => 'sanitize_text_field',
					),
					'media_url'      => array(
						'required'          => false,
						'type'              => 'string',
						'format'            => 'uri',
						'description'       => __( 'URL of attached media.', 'prc-social' ),
						'sanitize_callback' => 'esc_url_raw',
					),
					'thread_id'      => array(
						'required'          => false,
						'type'              => 'string',
						'description'       => __( 'UUID grouping messages in the same thread.', 'prc-social' ),
						'sanitize_callback' => 'sanitize_text_field',
						'default'           => '',
					),
					'thread_order'   => array(
						'required'          => false,
						'type'              => 'integer',
						'description'       => __( 'Position within the thread (0-based).', 'prc-social' ),
						'sanitize_callback' => 'absint',
						'default'           => 0,
					),
				),
			)
		);

		// Cancel a scheduled post.
		register_rest_route(
			self::REST_NAMESPACE,
			'/hootsuite/schedule/(?P<id>[a-zA-Z0-9-]+)',
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => array( $this, 'rest_cancel_post' ),
				'permission_callback' => array( $this, 'rest_permission_check' ),
				'args'                => array(
					'id'      => array(
						'required'          => true,
						'type'              => 'string',
						'description'       => __( 'The message ID to cancel.', 'prc-social' ),
						'sanitize_callback' => 'sanitize_text_field',
					),
					'post_id' => array(
						'required'          => true,
						'type'              => 'integer',
						'description'       => __( 'The post ID.', 'prc-social' ),
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		// Get available social profiles.
		register_rest_route(
			self::REST_NAMESPACE,
			'/hootsuite/profiles',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_get_profiles' ),
				'permission_callback' => array( $this, 'rest_permission_check' ),
			)
		);

		// Sync post status.
		register_rest_route(
			self::REST_NAMESPACE,
			'/hootsuite/sync/(?P<id>[a-zA-Z0-9-]+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_sync_status' ),
				'permission_callback' => array( $this, 'rest_permission_check' ),
				'args'                => array(
					'id'      => array(
						'required'          => true,
						'type'              => 'string',
						'description'       => __( 'The message ID to sync.', 'prc-social' ),
						'sanitize_callback' => 'sanitize_text_field',
					),
					'post_id' => array(
						'required'          => true,
						'type'              => 'integer',
						'description'       => __( 'The post ID.', 'prc-social' ),
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		// Bulk sync all message statuses for a post.
		register_rest_route(
			self::REST_NAMESPACE,
			'/hootsuite/sync-all',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_sync_all_statuses' ),
				'permission_callback' => array( $this, 'rest_permission_check' ),
				'args'                => array(
					'post_id' => array(
						'required'          => true,
						'type'              => 'integer',
						'description'       => __( 'The post ID whose messages to sync.', 'prc-social' ),
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
	}

	/**
	 * REST API permission check.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return bool|WP_Error True if permitted, WP_Error otherwise.
	 */
	public function rest_permission_check( WP_REST_Request $request ) {
		$post_id = $request->get_param( 'post_id' );

		if ( $post_id && ! current_user_can( 'edit_post', $post_id ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to edit this post.', 'prc-social' ),
				array( 'status' => 403 )
			);
		}

		if ( ! current_user_can( 'edit_posts' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to schedule social posts.', 'prc-social' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Schedule a social media post via Hootsuite API.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error Response or error.
	 */
	public function rest_schedule_post( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$post_id        = $request->get_param( 'post_id' );
		$platform       = $request->get_param( 'platform' );
		$text           = $request->get_param( 'text' );
		$scheduled_time = $request->get_param( 'scheduled_time' );
		$media_url      = $request->get_param( 'media_url' );
		$thread_id      = $request->get_param( 'thread_id' ) ?? '';
		$thread_order   = $request->get_param( 'thread_order' ) ?? 0;

		// Validate scheduled time is at least 5 minutes in the future.
		$scheduled_timestamp = strtotime( $scheduled_time );
		$min_timestamp       = time() + ( 5 * MINUTE_IN_SECONDS );

		if ( $scheduled_timestamp < $min_timestamp ) {
			return new WP_Error(
				'invalid_schedule_time',
				__( 'Scheduled time must be at least 5 minutes in the future.', 'prc-social' ),
				array( 'status' => 400 )
			);
		}

		// Call Hootsuite API to schedule the post.
		$hootsuite_response = $this->schedule_post( $platform, $text, $scheduled_time, $media_url );

		if ( is_wp_error( $hootsuite_response ) ) {
			return $hootsuite_response;
		}

		// Generate a unique message ID.
		$message_id = wp_generate_uuid4();
		$now        = gmdate( 'c' );

		// Create the message record.
		$message = array(
			'id'                   => $message_id,
			'platform'             => $platform,
			'text'                 => $text,
			'media_url'            => $media_url ?? '',
			'scheduled_time'       => $scheduled_time,
			'hootsuite_message_id' => $hootsuite_response['id'] ?? '',
			'status'               => 'scheduled',
			'published_url'        => '',
			'error_message'        => '',
			'thread_id'            => $thread_id,
			'thread_order'         => (int) $thread_order,
			'created_at'           => $now,
			'updated_at'           => $now,
		);

		// Add to existing messages.
		$messages   = get_post_meta( $post_id, self::META_KEY, true );
		$messages   = is_array( $messages ) ? $messages : array();
		$messages[] = $message;

		update_post_meta( $post_id, self::META_KEY, $messages );

		return new WP_REST_Response(
			array(
				'success' => true,
				'message' => $message,
			),
			201
		);
	}

	/**
	 * Cancel a scheduled social media post.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error Response or error.
	 */
	public function rest_cancel_post( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$message_id = $request->get_param( 'id' );
		$post_id    = $request->get_param( 'post_id' );

		$messages = get_post_meta( $post_id, self::META_KEY, true );
		$messages = is_array( $messages ) ? $messages : array();

		// Find the message.
		$message_index = null;
		$message       = null;
		foreach ( $messages as $index => $msg ) {
			if ( $msg['id'] === $message_id ) {
				$message_index = $index;
				$message       = $msg;
				break;
			}
		}

		if ( null === $message ) {
			return new WP_Error(
				'message_not_found',
				__( 'Message not found.', 'prc-social' ),
				array( 'status' => 404 )
			);
		}

		// Only allow cancellation of scheduled posts.
		if ( 'scheduled' !== $message['status'] ) {
			return new WP_Error(
				'cannot_cancel',
				__( 'Only scheduled posts can be cancelled.', 'prc-social' ),
				array( 'status' => 400 )
			);
		}

		// Call Hootsuite API to cancel the post.
		if ( ! empty( $message['hootsuite_message_id'] ) ) {
			$hootsuite_response = $this->cancel_scheduled_post( $message['hootsuite_message_id'] );

			if ( is_wp_error( $hootsuite_response ) ) {
				return $hootsuite_response;
			}
		}

		// Remove the message from the array.
		array_splice( $messages, $message_index, 1 );
		update_post_meta( $post_id, self::META_KEY, $messages );

		return new WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'Post cancelled successfully.', 'prc-social' ),
			),
			200
		);
	}

	/**
	 * Get available Hootsuite social profiles.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error Response or error.
	 */
	public function rest_get_profiles( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$profiles = $this->get_social_profiles();

		if ( is_wp_error( $profiles ) ) {
			return $profiles;
		}

		return new WP_REST_Response(
			array(
				'success'  => true,
				'profiles' => $profiles,
			),
			200
		);
	}

	/**
	 * Sync the status of a scheduled post from Hootsuite.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error Response or error.
	 */
	public function rest_sync_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$message_id = $request->get_param( 'id' );
		$post_id    = $request->get_param( 'post_id' );

		$messages = get_post_meta( $post_id, self::META_KEY, true );
		$messages = is_array( $messages ) ? $messages : array();

		// Find the message.
		$message_index = null;
		$message       = null;
		foreach ( $messages as $index => $msg ) {
			if ( $msg['id'] === $message_id ) {
				$message_index = $index;
				$message       = $msg;
				break;
			}
		}

		if ( null === $message ) {
			return new WP_Error(
				'message_not_found',
				__( 'Message not found.', 'prc-social' ),
				array( 'status' => 404 )
			);
		}

		if ( empty( $message['hootsuite_message_id'] ) ) {
			return new WP_Error(
				'no_hootsuite_id',
				__( 'Message has no Hootsuite ID to sync.', 'prc-social' ),
				array( 'status' => 400 )
			);
		}

		// Get status from Hootsuite API.
		$status_response = $this->sync_post_status( $message['hootsuite_message_id'] );

		if ( is_wp_error( $status_response ) ) {
			return $status_response;
		}

		// Update the message with new status.
		$messages[ $message_index ]['status']        = $status_response['status'] ?? $message['status'];
		$messages[ $message_index ]['published_url'] = $status_response['published_url'] ?? '';
		$messages[ $message_index ]['error_message'] = $status_response['error_message'] ?? '';
		$messages[ $message_index ]['updated_at']    = gmdate( 'c' );

		update_post_meta( $post_id, self::META_KEY, $messages );

		return new WP_REST_Response(
			array(
				'success' => true,
				'message' => $messages[ $message_index ],
			),
			200
		);
	}

	/**
	 * Bulk sync statuses for all messages of a given post that have a Hootsuite ID.
	 *
	 * Iterates over every stored message, queries the Hootsuite API for each one
	 * that still has status "scheduled" (or all if forced), updates the local
	 * records, and returns the full updated list.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error Response or error.
	 */
	public function rest_sync_all_statuses( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$post_id  = $request->get_param( 'post_id' );
		$messages = get_post_meta( $post_id, self::META_KEY, true );
		$messages = is_array( $messages ) ? $messages : array();

		if ( empty( $messages ) ) {
			return new WP_REST_Response(
				array(
					'success'  => true,
					'messages' => array(),
					'synced'   => 0,
				),
				200
			);
		}

		$synced_count = 0;
		$now          = gmdate( 'c' );

		foreach ( $messages as $index => &$message ) {
			// Only sync messages that have a Hootsuite ID and are still "scheduled".
			if ( empty( $message['hootsuite_message_id'] ) || 'scheduled' !== ( $message['status'] ?? '' ) ) {
				continue;
			}

			$status_response = $this->sync_post_status( $message['hootsuite_message_id'] );

			if ( is_wp_error( $status_response ) ) {
				// Mark as error so the editor shows the issue; don't abort the whole batch.
				$message['status']        = 'error';
				$message['error_message'] = $status_response->get_error_message();
				$message['updated_at']    = $now;
				++$synced_count;
				continue;
			}

			$message['status']        = $status_response['status'] ?? $message['status'];
			$message['published_url'] = $status_response['published_url'] ?? '';
			$message['error_message'] = $status_response['error_message'] ?? '';
			$message['updated_at']    = $now;
			++$synced_count;
		}
		unset( $message ); // break reference

		update_post_meta( $post_id, self::META_KEY, $messages );

		return new WP_REST_Response(
			array(
				'success'  => true,
				'messages' => $messages,
				'synced'   => $synced_count,
			),
			200
		);
	}

	/**
	 * Get social messages for a post.
	 *
	 * @param array $post The post object array.
	 * @return array Social messages data.
	 */
	public function get_social_messages( array $post ): array {
		$value = get_post_meta( $post['id'], self::META_KEY, true );
		return is_array( $value ) ? $value : array();
	}

	/**
	 * Update social messages for a post.
	 *
	 * @param mixed    $value The value to update.
	 * @param \WP_Post $post  The post object.
	 * @return bool|int Meta ID on success, false on failure.
	 */
	public function update_social_messages( $value, \WP_Post $post ) {
		$sanitized = $this->sanitize_social_messages( $value );
		return update_post_meta( $post->ID, self::META_KEY, $sanitized );
	}

	/**
	 * Get the schema for the social message drafts object.
	 *
	 * The new structure stores per-platform scheduledTime and a messages array
	 * instead of a single top-level scheduledTime and flat per-platform text/image.
	 *
	 * @return array The drafts schema.
	 */
	protected function get_drafts_schema(): array {
		$message_item_schema = array(
			'type'       => 'object',
			'properties' => array(
				'text'     => array(
					'type'        => 'string',
					'description' => __( 'Draft message text.', 'prc-social' ),
					'default'     => '',
				),
				'imageId'  => array(
					'type'        => array( 'integer', 'null' ),
					'description' => __( 'Attachment ID for the draft image.', 'prc-social' ),
					'default'     => null,
				),
				'imageUrl' => array(
					'type'        => 'string',
					'description' => __( 'URL of the draft image.', 'prc-social' ),
					'default'     => '',
				),
			),
		);

		$platform_draft_schema = array(
			'type'       => 'object',
			'properties' => array(
				'scheduledTime' => array(
					'type'        => 'string',
					'description' => __( 'Per-platform scheduled time (ISO 8601).', 'prc-social' ),
					'default'     => '',
				),
				'messages'      => array(
					'type'        => 'array',
					'description' => __( 'Array of draft messages for this platform (thread support).', 'prc-social' ),
					'items'       => $message_item_schema,
					'default'     => array(),
				),
			),
		);

		return array(
			'type'                 => 'object',
			'properties'           => array(
				'selectedPlatforms' => array(
					'type'        => 'array',
					'items'       => array(
						'type' => 'string',
						'enum' => array( 'twitter', 'facebook', 'threads', 'bluesky' ),
					),
					'description' => __( 'Platforms selected for drafting.', 'prc-social' ),
					'default'     => array(),
				),
				'platformData'      => array(
					'type'        => 'object',
					'description' => __( 'Per-platform draft data with scheduling and messages.', 'prc-social' ),
					'properties'  => array(
						'twitter'  => $platform_draft_schema,
						'facebook' => $platform_draft_schema,
						'threads'  => $platform_draft_schema,
						'bluesky'  => $platform_draft_schema,
					),
				),
			),
			'additionalProperties' => false,
		);
	}

	/**
	 * Get social message drafts for a post.
	 *
	 * @param array $post The post object array.
	 * @return array Draft data.
	 */
	public function get_message_drafts( array $post ): array {
		$value = get_post_meta( $post['id'], self::DRAFTS_META_KEY, true );
		if ( is_array( $value ) && ! empty( $value ) ) {
			// Auto-migrate legacy format if needed via the sanitizer.
			return $this->sanitize_message_drafts( $value );
		}
		$empty_platform = array(
			'scheduledTime' => '',
			'messages'      => array(
				array( 'text' => '', 'imageId' => null, 'imageUrl' => '' ),
			),
		);
		return array(
			'selectedPlatforms' => array(),
			'platformData'      => array(
				'twitter'  => $empty_platform,
				'facebook' => $empty_platform,
				'threads'  => $empty_platform,
				'bluesky'  => $empty_platform,
			),
		);
	}

	/**
	 * Update social message drafts for a post.
	 *
	 * @param mixed    $value The value to update.
	 * @param \WP_Post $post  The post object.
	 * @return bool|int Meta ID on success, false on failure.
	 */
	public function update_message_drafts( $value, \WP_Post $post ) {
		$sanitized = $this->sanitize_message_drafts( $value );
		return update_post_meta( $post->ID, self::DRAFTS_META_KEY, $sanitized );
	}

	/**
	 * Sanitize a single draft message item.
	 *
	 * @param array $msg The message item to sanitize.
	 * @return array Sanitized message item.
	 */
	private function sanitize_draft_message_item( array $msg ): array {
		return array(
			'text'     => isset( $msg['text'] ) ? sanitize_textarea_field( $msg['text'] ) : '',
			'imageId'  => isset( $msg['imageId'] ) ? ( is_numeric( $msg['imageId'] ) ? absint( $msg['imageId'] ) : null ) : null,
			'imageUrl' => isset( $msg['imageUrl'] ) ? esc_url_raw( $msg['imageUrl'] ) : '',
		);
	}

	/**
	 * Sanitize social message drafts data.
	 *
	 * Handles both the new per-platform scheduling + messages array format
	 * and the legacy flat format (auto-migrates).
	 *
	 * @param mixed $value The value to sanitize.
	 * @return array Sanitized drafts data.
	 */
	public function sanitize_message_drafts( $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$platforms      = array( 'twitter', 'facebook', 'threads', 'bluesky' );
		$empty_platform = array(
			'scheduledTime' => '',
			'messages'      => array(
				array( 'text' => '', 'imageId' => null, 'imageUrl' => '' ),
			),
		);
		$sanitized      = array();

		// Sanitize selectedPlatforms.
		$selected = isset( $value['selectedPlatforms'] ) && is_array( $value['selectedPlatforms'] )
			? $value['selectedPlatforms']
			: array();
		$sanitized['selectedPlatforms'] = array_values( array_intersect( $selected, $platforms ) );

		// Detect legacy top-level scheduledTime for backward compat migration.
		$legacy_scheduled_time = '';
		if ( isset( $value['scheduledTime'] ) && is_string( $value['scheduledTime'] ) ) {
			$legacy_scheduled_time = sanitize_text_field( $value['scheduledTime'] );
		}

		// Sanitize platformData.
		$platform_data = isset( $value['platformData'] ) && is_array( $value['platformData'] )
			? $value['platformData']
			: array();
		$sanitized['platformData'] = array();

		foreach ( $platforms as $platform ) {
			if ( ! isset( $platform_data[ $platform ] ) || ! is_array( $platform_data[ $platform ] ) ) {
				$sanitized['platformData'][ $platform ] = $empty_platform;
				continue;
			}

			$data = $platform_data[ $platform ];

			// Detect legacy flat format: { text, imageId, imageUrl } at platform root.
			if ( isset( $data['text'] ) && ! isset( $data['messages'] ) ) {
				// Migrate old shape → new shape.
				$sanitized['platformData'][ $platform ] = array(
					'scheduledTime' => $legacy_scheduled_time,
					'messages'      => array(
						$this->sanitize_draft_message_item( $data ),
					),
				);
				continue;
			}

			// New format: { scheduledTime, messages[] }.
			$scheduled_time = isset( $data['scheduledTime'] ) ? sanitize_text_field( $data['scheduledTime'] ) : '';

			$messages = array();
			if ( isset( $data['messages'] ) && is_array( $data['messages'] ) ) {
				foreach ( $data['messages'] as $msg ) {
					if ( is_array( $msg ) ) {
						$messages[] = $this->sanitize_draft_message_item( $msg );
					}
				}
			}

			// Ensure at least one message exists.
			if ( empty( $messages ) ) {
				$messages[] = array( 'text' => '', 'imageId' => null, 'imageUrl' => '' );
			}

			$sanitized['platformData'][ $platform ] = array(
				'scheduledTime' => $scheduled_time,
				'messages'      => $messages,
			);
		}

		return $sanitized;
	}

	/**
	 * Sanitize social messages data.
	 *
	 * @param mixed $value The value to sanitize.
	 * @return array Sanitized social messages data.
	 */
	public function sanitize_social_messages( $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$sanitized = array();
		$platforms = array( 'twitter', 'facebook', 'threads', 'bluesky' );
		$statuses  = array( 'scheduled', 'posted', 'error' );

		foreach ( $value as $message ) {
			if ( ! is_array( $message ) ) {
				continue;
			}

			$platform = isset( $message['platform'] ) ? sanitize_text_field( $message['platform'] ) : '';
			if ( ! in_array( $platform, $platforms, true ) ) {
				continue;
			}

			$status = isset( $message['status'] ) ? sanitize_text_field( $message['status'] ) : 'scheduled';
			if ( ! in_array( $status, $statuses, true ) ) {
				$status = 'scheduled';
			}

			$sanitized[] = array(
				'id'                   => isset( $message['id'] ) ? sanitize_text_field( $message['id'] ) : wp_generate_uuid4(),
				'platform'             => $platform,
				'text'                 => isset( $message['text'] ) ? sanitize_textarea_field( $message['text'] ) : '',
				'media_url'            => isset( $message['media_url'] ) ? esc_url_raw( $message['media_url'] ) : '',
				'scheduled_time'       => isset( $message['scheduled_time'] ) ? sanitize_text_field( $message['scheduled_time'] ) : '',
				'hootsuite_message_id' => isset( $message['hootsuite_message_id'] ) ? sanitize_text_field( $message['hootsuite_message_id'] ) : '',
				'status'               => $status,
				'published_url'        => isset( $message['published_url'] ) ? esc_url_raw( $message['published_url'] ) : '',
				'error_message'        => isset( $message['error_message'] ) ? sanitize_text_field( $message['error_message'] ) : '',
				'thread_id'            => isset( $message['thread_id'] ) ? sanitize_text_field( $message['thread_id'] ) : '',
				'thread_order'         => isset( $message['thread_order'] ) ? absint( $message['thread_order'] ) : 0,
				'created_at'           => isset( $message['created_at'] ) ? sanitize_text_field( $message['created_at'] ) : '',
				'updated_at'           => isset( $message['updated_at'] ) ? sanitize_text_field( $message['updated_at'] ) : '',
			);
		}

		return $sanitized;
	}

	/**
	 * Authorization callback for meta field.
	 *
	 * @param bool   $allowed  Whether the user can add the meta.
	 * @param string $meta_key The meta key.
	 * @param int    $post_id  The post ID.
	 * @return bool Whether the user can edit the meta.
	 */
	public function auth_callback( bool $allowed, string $meta_key, int $post_id ): bool {
		return current_user_can( 'edit_post', $post_id );
	}

	/**
	 * Get Hootsuite API key.
	 *
	 * @return string|WP_Error API key or error.
	 */
	protected function get_api_key(): string|WP_Error {
		if ( ! defined( 'PRC_HOOTSUITE_API_KEY' ) || empty( PRC_HOOTSUITE_API_KEY ) ) {
			return new WP_Error(
				'missing_api_key',
				__( 'Hootsuite API key is not configured.', 'prc-social' ),
				array( 'status' => 500 )
			);
		}

		return PRC_HOOTSUITE_API_KEY;
	}

	/**
	 * Make a request to the Hootsuite API.
	 *
	 * @param string $endpoint The API endpoint.
	 * @param string $method   HTTP method.
	 * @param array  $body     Request body.
	 * @return array|WP_Error Response data or error.
	 */
	protected function make_api_request( string $endpoint, string $method = 'GET', array $body = array() ): array|WP_Error {
		$api_key = $this->get_api_key();

		if ( is_wp_error( $api_key ) ) {
			return $api_key;
		}

		$url = self::HOOTSUITE_API_URL . $endpoint;

		$args = array(
			'method'  => $method,
			'headers' => array(
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type'  => 'application/json',
			),
			'timeout' => 30,
		);

		if ( ! empty( $body ) && in_array( $method, array( 'POST', 'PUT', 'PATCH' ), true ) ) {
			$args['body'] = wp_json_encode( $body );
		}

		$response = wp_remote_request( $url, $args );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body        = wp_remote_retrieve_body( $response );
		$data        = json_decode( $body, true );

		if ( $status_code >= 400 ) {
			$error_message = $data['errors'][0]['message'] ?? __( 'Hootsuite API error.', 'prc-social' );
			return new WP_Error(
				'hootsuite_api_error',
				$error_message,
				array( 'status' => $status_code )
			);
		}

		return $data ?? array();
	}

	/**
	 * Schedule a post via Hootsuite API.
	 *
	 * @param string $platform       Social media platform.
	 * @param string $text           Message content.
	 * @param string $scheduled_time ISO 8601 scheduled time.
	 * @param string $media_url      Optional media URL.
	 * @return array|WP_Error Response data or error.
	 */
	public function schedule_post( string $platform, string $text, string $scheduled_time, string $media_url = '' ): array|WP_Error {
		// Get the social profile ID for this platform.
		$profiles = $this->get_social_profiles();

		if ( is_wp_error( $profiles ) ) {
			return $profiles;
		}

		$profile_id = null;
		foreach ( $profiles as $profile ) {
			if ( strtolower( $profile['type'] ?? '' ) === $platform ) {
				$profile_id = $profile['id'];
				break;
			}
		}

		if ( ! $profile_id ) {
			return new WP_Error(
				'profile_not_found',
				/* translators: %s: platform name */
				sprintf( __( 'No Hootsuite profile found for platform: %s', 'prc-social' ), $platform ),
				array( 'status' => 400 )
			);
		}

		$body = array(
			'text'              => $text,
			'socialProfileIds'  => array( $profile_id ),
			'scheduledSendTime' => $scheduled_time,
		);

		if ( ! empty( $media_url ) ) {
			$body['mediaUrls'] = array(
				array( 'url' => $media_url ),
			);
		}

		return $this->make_api_request( '/messages', 'POST', $body );
	}

	/**
	 * Cancel a scheduled post via Hootsuite API.
	 *
	 * @param string $hootsuite_message_id The Hootsuite message ID.
	 * @return array|WP_Error Response data or error.
	 */
	public function cancel_scheduled_post( string $hootsuite_message_id ): array|WP_Error {
		return $this->make_api_request( '/messages/' . $hootsuite_message_id, 'DELETE' );
	}

	/**
	 * Get available social profiles from Hootsuite.
	 *
	 * @return array|WP_Error Profiles data or error.
	 */
	public function get_social_profiles(): array|WP_Error {
		// Cache profiles for 5 minutes.
		$cache_key = 'prc_hootsuite_profiles';
		$cached    = get_transient( $cache_key );

		if ( false !== $cached ) {
			return $cached;
		}

		$response = $this->make_api_request( '/socialProfiles' );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$profiles = $response['data'] ?? array();
		set_transient( $cache_key, $profiles, 5 * MINUTE_IN_SECONDS );

		return $profiles;
	}

	/**
	 * Sync post status from Hootsuite API.
	 *
	 * @param string $hootsuite_message_id The Hootsuite message ID.
	 * @return array|WP_Error Status data or error.
	 */
	public function sync_post_status( string $hootsuite_message_id ): array|WP_Error {
		$response = $this->make_api_request( '/messages/' . $hootsuite_message_id );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$hootsuite_state = $response['data']['state'] ?? 'SCHEDULED';

		$status_map = array(
			'SCHEDULED'   => 'scheduled',
			'PENDING'     => 'scheduled',
			'SENT'        => 'posted',
			'SEND_FAILED' => 'error',
		);

		$status = $status_map[ $hootsuite_state ] ?? 'scheduled';

		return array(
			'status'        => $status,
			'published_url' => $response['data']['permalink'] ?? '',
			'error_message' => 'error' === $status ? ( $response['data']['errorMessage'] ?? __( 'Post failed to send.', 'prc-social' ) ) : '',
		);
	}
}
