<?php
/**
 * Social AI Thread Ability.
 *
 * Uses AI to generate a thread of 2-4 social media messages for posts,
 * with platform-specific length constraints.
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
 * Social AI Thread Ability class.
 *
 * @since 1.0.0
 */
class Social_AI_Thread_Ability {

	/**
	 * Ability name.
	 *
	 * @var string
	 */
	public static $ability_name = 'prc-social/generate-thread';

	/**
	 * Blocks that are allowed to use this ability.
	 *
	 * @var array
	 */
	public static $allowed_blocks = array();

	/**
	 * Register the thread generator ability with WP abilities api.
	 *
	 * @hook wp_abilities_api_init
	 */
	public function register_ability() {
		wp_register_ability(
			self::$ability_name,
			array(
				'label'               => __( 'Generate Social Thread', 'prc-social' ),
				'description'         => __( 'Uses AI to generate a thread of 2-4 social media messages from post content.', 'prc-social' ),
				'category'            => 'communication',
				'input_schema'        => array(
					'type'                 => 'object',
					'properties'           => array(
						'postId'        => array(
							'type'        => 'number',
							'description' => 'The id of the post to generate a social thread for.',
						),
						'platform'      => array(
							'type'        => 'string',
							'description' => 'The social media platform (twitter, facebook, threads, bluesky).',
							'default'     => 'twitter',
						),
						'maxMessages'   => array(
							'type'        => 'number',
							'description' => 'Maximum number of messages in the thread (2-4).',
							'default'     => 4,
						),
					),
					'required'             => array( 'postId' ),
					'additionalProperties' => false,
				),
				'output_schema'       => array(
					'type'       => 'object',
					'properties' => array(
						'messages' => array(
							'type'        => 'array',
							'description' => 'Array of generated thread messages.',
							'items'       => array(
								'type'       => 'object',
								'properties' => array(
									'text' => array(
										'type'        => 'string',
										'description' => 'The text for this message in the thread.',
									),
								),
							),
						),
					),
				),
				'execute_callback'    => array( $this, 'generate_thread' ),
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'meta'                => array(
					'annotations'    => array(
						'instructions' => 'This ability takes a post ID, reads the post content and title, then uses AI to generate a thread of 2-4 social media messages. When the Content Guidelines plugin is active, site-level voice, tone, vocabulary, and copy rules are automatically incorporated into the system instructions as authoritative editorial constraints, ensuring generated messages align with organizational standards.',
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
	 * Uses the 'social_thread' task context to get a focused guidelines packet
	 * relevant to writing social media thread messages.
	 *
	 * @param int $post_id Post ID to fetch guidelines for.
	 * @return string Packet text for LLM, or empty string if unavailable.
	 */
	private function get_content_guidelines( int $post_id ): string {
		if ( ! function_exists( 'wp_get_content_guidelines_for_post' ) ) {
			return '';
		}

		$result = \wp_get_content_guidelines_for_post( $post_id, array( 'task' => 'social_thread' ) );
		if ( empty( $result['packet_text'] ) || ! is_string( $result['packet_text'] ) ) {
			return '';
		}

		return trim( $result['packet_text'] );
	}

	/**
	 * Get the character limit for a platform.
	 *
	 * @param string $platform The platform key.
	 * @return int Character limit.
	 */
	private function get_platform_char_limit( string $platform ): int {
		$limits = array(
			'twitter'  => 280,
			'facebook' => 500,
			'threads'  => 274,
			'bluesky'  => 274,
		);
		return $limits[ $platform ] ?? 280;
	}

	/**
	 * Provide the system instruction for thread generation.
	 *
	 * @param string $platform           The platform key.
	 * @param int    $max_messages       Maximum number of messages.
	 * @param int    $char_limit         Character limit per message.
	 * @param string $content_guidelines Optional content guidelines packet text from the Content Guidelines plugin.
	 * @return string The system instruction.
	 */
	private function provide_system_instruction( string $platform, int $max_messages, int $char_limit, string $content_guidelines = '' ): string {
		$instructions = sprintf(
			'You are a social media editorial agent who crafts engaging threads for %1$s from research article content.

Create a thread of %2$d posts, each under %3$d characters. Structure the thread as follows:

- Post 1: Hook/headline that draws attention to the topic and makes people want to read more
- Posts 2-%4$d: Key findings with specific data points, percentages, or quotes from the article
- Final post: Conclusion with a forward-looking statement or call to action

Style: Neutral, authoritative, casual
Clarity: Direct, specific, data-driven
Approach: Lead with the most interesting finding, build a narrative arc

CRITICAL OUTPUT REQUIREMENTS:
- Return ONLY a valid JSON array of objects, each with a "text" property
- Example format: [{"text": "First post..."}, {"text": "Second post..."}]
- Each message must be UNDER %3$d characters
- Do NOT include any text outside the JSON array
- Do NOT use markdown formatting
- Generate exactly %2$d messages

NEVER:
- Reference @PewResearch or any other @ handle
- Include hashtags unless the platform specifically benefits from them
- Create divisive or inflammatory content
- Exceed the character limit for any individual message',
			ucfirst( $platform ),
			$max_messages,
			$char_limit,
			$max_messages
		);

		if ( ! empty( $content_guidelines ) ) {
			$instructions .= "\n\nSITE CONTENT GUIDELINES (treat these as authoritative editorial constraints — all generated content must conform to them):\n\n" . $content_guidelines;
		}

		return $instructions;
	}

	/**
	 * Generate a thread of social messages for a specific post.
	 *
	 * @param array $input The input parameters.
	 * @return array|WP_Error The generated thread data.
	 */
	public function generate_thread( $input ) {
		$post_id = $input['postId'] ?? 0;
		if ( ! $post_id ) {
			return new WP_Error( 'missing_post_id', 'No postId provided for thread generation.' );
		}

		$platform     = isset( $input['platform'] ) ? sanitize_text_field( $input['platform'] ) : 'twitter';
		$max_messages = isset( $input['maxMessages'] ) ? min( max( (int) $input['maxMessages'], 2 ), 4 ) : 4;
		$char_limit   = $this->get_platform_char_limit( $platform );

		$post = get_post( $post_id );
		if ( ! $post ) {
			return new WP_Error( 'post_not_found', __( 'Post not found.', 'prc-social' ) );
		}

		$title   = $post->post_title;
		$content = wp_strip_all_tags( $post->post_content, true );
		// Limit content to ~3000 characters to stay within prompt limits.
		$content = mb_substr( $content, 0, 3000 );

		$content_guidelines = $this->get_content_guidelines( $post_id );
		$system_instruction = $this->provide_system_instruction( $platform, $max_messages, $char_limit, $content_guidelines );

		$prompt = wp_sprintf(
			"%s\n\nPost Title: %s\n\nPost Content:\n%s\n\nGenerate the thread:",
			$system_instruction,
			$title,
			$content
		);

		$generated_text = AI_Client::prompt( $prompt )->generate_text();
		$generated_text = trim( $generated_text );

		// Parse the JSON response.
		$messages = $this->parse_thread_response( $generated_text, $char_limit, $max_messages );

		if ( is_wp_error( $messages ) ) {
			// Regenerate with the same system instruction (includes content guidelines).
			$retry_prompt = wp_sprintf(
				"%s\n\nPost Title: %s\n\nPost Content:\n%s\n\nPrevious attempt failed to produce valid JSON. Generate the thread as a JSON array:\n[{\"text\": \"post 1\"}, {\"text\": \"post 2\"}, ...]",
				$system_instruction,
				$title,
				$content
			);

			$generated_text = AI_Client::prompt( $retry_prompt )->generate_text();
			$generated_text = trim( $generated_text );

			$messages = $this->parse_thread_response( $generated_text, $char_limit, $max_messages );

			if ( is_wp_error( $messages ) ) {
				return $messages;
			}
		}

		return array(
			'messages' => $messages,
		);
	}

	/**
	 * Parse the AI response into an array of thread messages.
	 *
	 * @param string $response     The raw AI response text.
	 * @param int    $char_limit   Character limit per message.
	 * @param int    $max_messages Maximum number of messages.
	 * @return array|WP_Error Parsed messages or error.
	 */
	private function parse_thread_response( string $response, int $char_limit, int $max_messages ) {
		// Try to extract JSON from the response (the AI may wrap it in markdown code blocks).
		$json_text = $response;
		if ( preg_match( '/\[.*\]/s', $response, $matches ) ) {
			$json_text = $matches[0];
		}

		$parsed = json_decode( $json_text, true );

		if ( ! is_array( $parsed ) || empty( $parsed ) ) {
			return new WP_Error(
				'parse_error',
				__( 'Failed to parse AI thread response.', 'prc-social' )
			);
		}

		$messages = array();
		foreach ( $parsed as $item ) {
			if ( ! is_array( $item ) || empty( $item['text'] ) ) {
				continue;
			}
			$text = trim( $item['text'] );
			// Truncate if over limit.
			if ( mb_strlen( $text ) > $char_limit ) {
				$text = mb_substr( $text, 0, $char_limit - 1 ) . '…';
			}
			$messages[] = array( 'text' => $text );
		}

		if ( empty( $messages ) ) {
			return new WP_Error(
				'empty_thread',
				__( 'AI generated an empty thread.', 'prc-social' )
			);
		}

		// Cap at max messages.
		$messages = array_slice( $messages, 0, $max_messages );

		return $messages;
	}
}
