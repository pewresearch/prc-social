<?php
/**
 * Social AI ability.
 *
 * Uses AI to generate social media messages for posts, with platform-specific
 * length constraints and validation.
 *
 * @package PRC\Platform\Social
 */

namespace PRC\Platform\Social;

use WordPress\AI_Client\AI_Client;
use WP_Error;

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Social AI Ability class.
 *
 * @since 1.0.0
 */
class Social_AI_Ability {

	/**
	 * Ability name.
	 *
	 * @var string
	 */
	public static $ability_name = 'prc-social/generate-message';

	/**
	 * Blocks that are allowed to use this ability.
	 *
	 * @var array
	 */
	public static $allowed_blocks = array();

	/**
	 * Register the social post generator ability with WP abilities api.
	 *
	 * @hook wp_abilities_api_init
	 */
	public function register_ability() {
		wp_register_ability(
			self::$ability_name,
			array(
				'label'               => __( 'Suggest Social Message', 'prc-social' ),
				'description'         => __( 'Uses AI to generate a social message for a given topic based on context from the post.', 'prc-social' ),
				'category'            => 'communication',
				'input_schema'        => array(
					'type'                 => 'object',
					'properties'           => array(
						'postId'        => array(
							'type'        => 'number',
							'description' => 'The id of the post to generate a social message for. This is used to get the post title and content for contextual analysis.',
						),
						'maxCharacters' => array(
							'type'        => 'number',
							'description' => 'The maximum number of characters for the social message. This is used to limit the length of the generated text.',
							'default'     => 280,
						),
					),
					'required'             => array( 'postId' ),
					'additionalProperties' => false,
				),
				'output_schema'       => array(
					'type'       => 'object',
					'properties' => array(
						'options' => array(
							'type'        => 'array',
							'items'       => array( 'type' => 'string' ),
							'description' => 'Array of generated social message options.',
						),
					),
				),
				'execute_callback'    => array( $this, 'generate_social_message' ),
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'meta'                => array(
					'annotations'    => array(
						'instructions' => 'This ability takes a post ID, reads the post content and title, then uses AI to generate social media message suggestions. When the Content Guidelines plugin is active, site-level voice, tone, vocabulary, and copy rules are automatically incorporated into the system instructions as authoritative editorial constraints, ensuring generated messages align with organizational standards.',
						'readonly'     => true,
						'destructive'  => false,
						'idempotent'   => false,
					),
					'show_in_rest'   => true,
					'allowed_blocks' => self::$allowed_blocks,
					'mcp'            => array(
						'public' => true,
						'type'   => 'tool',
					),
				),
			)
		);
	}

	/**
	 * Get site content guidelines for the prompt when the content-guidelines plugin is active.
	 *
	 * Uses the 'social_message' task context to get a focused guidelines packet
	 * relevant to writing social media messages.
	 *
	 * @param int $post_id Post ID to fetch guidelines for.
	 * @return string Packet text for LLM, or empty string if unavailable.
	 */
	private function get_content_guidelines( int $post_id ): string {
		if ( ! function_exists( 'wp_get_content_guidelines_for_post' ) ) {
			return '';
		}

		$result = \wp_get_content_guidelines_for_post( $post_id, array( 'task' => 'social_message' ) );
		if ( empty( $result['packet_text'] ) || ! is_string( $result['packet_text'] ) ) {
			return '';
		}

		return trim( $result['packet_text'] );
	}

	/**
	 * Minimum number of message options to generate per request.
	 *
	 * @var int
	 */
	const MIN_OPTIONS = 3;

	/**
	 * Provide the system instruction for message generation.
	 *
	 * @param string $content_guidelines Optional content guidelines packet text from the Content Guidelines plugin.
	 * @return string The system instruction.
	 */
	private function provide_system_instruction( string $content_guidelines = '' ): string {
		$instructions = 'You are a social media editorial agent who helps craft messages for posts. In your heuristics, you consider the post title and content to generate a social media post within the specified character limit, ensuring the message is engaging and relevant to the post.

Follow these guidelines for the voice and tone of the generated message:

Style: Neutral, authoritative, casual
Clarity : Preference for straightforward answers. Direct answers, step-by-step explanations, bullet points.
Approach: Logical analysis, creative brainstorming, systematic breakdown.

CRITICAL OUTPUT REQUIREMENT: Return a JSON array of exactly ' . self::MIN_OPTIONS . ' distinct message options. Each element must be a plain string containing only the social message text — no labels, explanations, quotes, or formatting. Example format: ["message one", "message two", "message three"]

Each option should take a meaningfully different angle on the post content (e.g. highlight different findings, use a different hook, vary the tone from informative to conversational).

NEVER:
- Reference @PewResearch in a generated message, or any other @ handle.
- Favor content that would generate meaningful engagement, steer clear of divisive content.
';

		if ( ! empty( $content_guidelines ) ) {
			$instructions .= "\n\nSITE CONTENT GUIDELINES (treat these as authoritative editorial constraints — all generated content must conform to them):\n\n" . $content_guidelines;
		}

		return $instructions;
	}

	/**
	 * Provide platform-specific instructions and constraints.
	 *
	 * @return array Platform instructions configuration.
	 */
	public function provide_platform_instructions() {
		return array(
			'truncated_limit' => 140,
			'desired_length'  => 280,
			'networks'        => array(
				'facebook' => array(
					'desired_length'          => 280,
					'max_length'              => 500,
					'purpose'                 => 'Generating conversation among followers',
					'additional_instructions' => 'Always include a call to action in the message that encourages engagement.',
				),
				'twitter'  => array(
					'desired_length'          => 280,
					'max_length'              => 280,
					'purpose'                 => 'Notifying followers of new content and updated content',
					'additional_instructions' => '',
				),
				'threads'  => array(
					'desired_length'          => 280,
					'max_length'              => 274,
					'purpose'                 => 'Generating conversation among followers',
					'additional_instructions' => 'Always include a call to action in the message that encourages engagement.',
				),
				'bluesky'  => array(
					'desired_length'          => 280,
					'max_length'              => 274,
					'purpose'                 => 'Notifying followers of new content and updated content',
					'additional_instructions' => '',
				),
			),
		);
	}

	/**
	 * Generate a social message for a specific post.
	 *
	 * @param array $input The input parameters.
	 * @return array|WP_Error The generated social message data.
	 */
	public function generate_social_message( $input ) {
		$post_id = $input['postId'];
		if ( ! $post_id ) {
			return new WP_Error( 'missing_post_id', 'No postId provided for Social Media Generation ability' );
		}
		$max_characters = isset( $input['maxCharacters'] ) ? $input['maxCharacters'] : 280;

		$post = get_post( $input['postId'] );
		if ( ! $post ) {
			return new WP_Error( 'post_not_found', __( 'Post not found.', 'prc-social' ) );
		}
		$title   = $post->post_title;
		$content = $post->post_content;
		$content = wp_strip_all_tags( $content, true );

		// Get platform instructions and determine appropriate length constraints.
		$platform_instructions = $this->provide_platform_instructions();
		$platform_config       = $this->determine_platform_config( $max_characters, $platform_instructions );
		$desired_length        = $platform_config['desired_length'];
		$max_length            = $platform_config['max_length'];

		$content_guidelines = $this->get_content_guidelines( $post_id );
		$system_instruction = $this->provide_system_instruction( $content_guidelines );

		$prompt = wp_sprintf(
			"%s\n\nLength Requirements:\n- Desired Length: %d characters\n- Maximum Length: %d characters\n\nPost Title: %s\n\nPost Content:\n%s\n\nGenerate %d social message options as a JSON array:",
			$system_instruction,
			$desired_length,
			$max_length,
			$title,
			$content,
			self::MIN_OPTIONS,
		);

		$generated_text = AI_Client::prompt( $prompt )->generate_text();
		$options        = $this->parse_options( $generated_text );

		// Retry once if we couldn't parse valid options.
		if ( empty( $options ) ) {
			$generated_text = AI_Client::prompt( $prompt )->generate_text();
			$options        = $this->parse_options( $generated_text );
		}

		// Filter out any options that exceed the max length.
		$options = array_values(
			array_filter(
				$options,
				function ( $option ) use ( $max_length ) {
					return mb_strlen( $option ) <= $max_length;
				}
			)
		);

		// Fallback: if all options were filtered out, return the first raw option trimmed.
		if ( empty( $options ) ) {
			$raw = $this->parse_options( $generated_text );
			if ( ! empty( $raw ) ) {
				$options = array( mb_substr( $raw[0], 0, $max_length ) );
			}
		}

		return array(
			'options' => $options,
		);
	}

	/**
	 * Parse the AI response into an array of message strings.
	 *
	 * Expects a JSON array of strings. Handles common LLM quirks like
	 * markdown fences or leading prose before the JSON.
	 *
	 * @param string $raw The raw AI response text.
	 * @return array Array of message strings, empty on failure.
	 */
	private function parse_options( string $raw ): array {
		$raw = trim( $raw );

		// Strip markdown code fences if present.
		$raw = preg_replace( '/^```(?:json)?\s*/i', '', $raw );
		$raw = preg_replace( '/\s*```$/', '', $raw );

		// Try to extract a JSON array if the response contains extra prose.
		if ( preg_match( '/\[.*\]/s', $raw, $matches ) ) {
			$raw = $matches[0];
		}

		$decoded = json_decode( $raw, true );
		if ( ! is_array( $decoded ) ) {
			return array();
		}

		// Ensure every element is a non-empty string.
		$options = array();
		foreach ( $decoded as $item ) {
			if ( is_string( $item ) && '' !== trim( $item ) ) {
				$options[] = trim( $item );
			}
		}

		return $options;
	}

	/**
	 * Determine platform configuration based on max characters.
	 *
	 * @param int   $max_characters        The maximum characters requested.
	 * @param array $platform_instructions The platform instructions array.
	 * @return array Platform configuration with desired_length, max_length, and purpose.
	 */
	private function determine_platform_config( $max_characters, $platform_instructions ) {
		// Try to match max_characters to a platform's max_length.
		foreach ( $platform_instructions['networks'] as $network => $config ) {
			if ( $max_characters <= $config['max_length'] ) {
				return array(
					'desired_length' => $config['desired_length'],
					'max_length'     => $config['max_length'],
					'purpose'        => $config['purpose'],
				);
			}
		}

		// Fallback to default platform instructions.
		return array(
			'desired_length' => $platform_instructions['desired_length'],
			'max_length'     => $max_characters,
			'purpose'        => 'Generating engaging social media content',
		);
	}
}
