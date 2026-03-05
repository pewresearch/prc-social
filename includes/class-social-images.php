<?php
/**
 * Social Images Meta Field Registration.
 *
 * @package    PRC\Platform\Social
 */

declare(strict_types=1);

namespace PRC\Platform\Social;

/**
 * Registers and manages the prc_social_images post meta field.
 *
 * @package    PRC\Platform\Social
 */
class Social_Images {

	/**
	 * Meta key for storing social images.
	 *
	 * @var string
	 */
	const META_KEY = 'prc_social_images';

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( $loader = null ) {
		$loader->add_action( 'init', $this, 'register_meta' );
		$loader->add_action( 'rest_api_init', $this, 'register_rest_field' );
	}

	/**
	 * Register the post meta for social images.
	 *
	 * @hook init
	 */
	public function register_meta(): void {
		$post_types = get_post_types( array( 'public' => true ), 'names' );
		foreach ( $post_types as $post_type ) {
			if ( post_type_supports( $post_type, 'prc-social' ) ) {
				register_post_meta(
					$post_type,
					self::META_KEY,
					array(
						'type'              => 'object',
						'single'            => true,
						'show_in_rest'      => array(
							'schema' => array(
								'type'                 => 'object',
								'additionalProperties' => array(
									'type'       => 'object',
									'properties' => array(
										'id'       => array(
											'type' => 'integer',
										),
										'url'      => array(
											'type'   => 'string',
											'format' => 'uri',
										),
										'rawUrl'   => array(
											'type'   => 'string',
											'format' => 'uri',
										),
										'width'    => array(
											'type' => 'integer',
										),
										'height'   => array(
											'type' => 'integer',
										),
										'caption'  => array(
											'type' => 'string',
										),
										'chartArt' => array(
											'type' => 'boolean',
										),
										'sourceOverride' => array(
											'type'       => 'object',
											'properties' => array(
												'id'  => array(
													'type' => 'integer',
												),
												'url' => array(
													'type'   => 'string',
													'format' => 'uri',
												),
											),
										),
									),
								),
							),
						),
						'sanitize_callback' => array( $this, 'sanitize_social_images' ),
						'auth_callback'     => array( $this, 'auth_callback' ),
					)
				);
			}
		}
	}

	/**
	 * Register REST field for social_images.
	 *
	 * @hook rest_api_init
	 */
	public function register_rest_field(): void {
		$post_types = get_post_types( array( 'public' => true ), 'names' );
		foreach ( $post_types as $post_type ) {
			if ( post_type_supports( $post_type, 'prc-social' ) ) {
				register_rest_field(
					$post_type,
					'social_images',
					array(
						'get_callback'    => array( $this, 'get_social_images' ),
						'update_callback' => array( $this, 'update_social_images' ),
						'schema'          => array(
							'description' => __( 'Social media images for different platforms.', 'prc-social' ),
							'type'        => 'object',
							'context'     => array( 'view', 'edit' ),
						),
					)
				);
			}
		}
	}

	/**
	 * Get social images for a post.
	 *
	 * @param array $post The post object array.
	 * @return array|null Social images data.
	 */
	public function get_social_images( array $post ): ?array {
		$value = get_post_meta( $post['id'], self::META_KEY, true );
		return ! empty( $value ) ? $value : null;
	}

	/**
	 * Update social images for a post.
	 *
	 * @param mixed    $value   The value to update.
	 * @param \WP_Post $post    The post object.
	 * @return bool|int Meta ID on success, false on failure.
	 */
	public function update_social_images( $value, \WP_Post $post ) {
		$sanitized = $this->sanitize_social_images( $value );
		return update_post_meta( $post->ID, self::META_KEY, $sanitized );
	}

	/**
	 * Sanitize social images data.
	 *
	 * @param mixed $value The value to sanitize.
	 * @return array Sanitized social images data.
	 */
	public function sanitize_social_images( $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$sanitized = array();

		foreach ( $value as $platform => $image_data ) {
			if ( ! is_array( $image_data ) ) {
				continue;
			}

			$platform_data = array(
				'id'       => isset( $image_data['id'] ) ? absint( $image_data['id'] ) : 0,
				'url'      => isset( $image_data['url'] ) ? esc_url_raw( $image_data['url'] ) : '',
				'rawUrl'   => isset( $image_data['rawUrl'] ) ? esc_url_raw( $image_data['rawUrl'] ) : '',
				'width'    => isset( $image_data['width'] ) ? absint( $image_data['width'] ) : 0,
				'height'   => isset( $image_data['height'] ) ? absint( $image_data['height'] ) : 0,
				'caption'  => isset( $image_data['caption'] ) ? sanitize_text_field( $image_data['caption'] ) : '',
				'chartArt' => isset( $image_data['chartArt'] ) ? (bool) $image_data['chartArt'] : false,
			);

			// Handle source override if present.
			if ( isset( $image_data['sourceOverride'] ) && is_array( $image_data['sourceOverride'] ) ) {
				$platform_data['sourceOverride'] = array(
					'id'  => isset( $image_data['sourceOverride']['id'] ) ? absint( $image_data['sourceOverride']['id'] ) : 0,
					'url' => isset( $image_data['sourceOverride']['url'] ) ? esc_url_raw( $image_data['sourceOverride']['url'] ) : '',
				);
			}

			$sanitized[ sanitize_key( $platform ) ] = $platform_data;
		}

		return $sanitized;
	}

	/**
	 * Authorization callback for meta field.
	 *
	 * @param bool   $allowed   Whether the user can add the meta.
	 * @param string $meta_key  The meta key.
	 * @param int    $post_id   The post ID.
	 * @return bool Whether the user can edit the meta.
	 */
	public function auth_callback( bool $allowed, string $meta_key, int $post_id ): bool {
		return current_user_can( 'edit_post', $post_id );
	}
}

