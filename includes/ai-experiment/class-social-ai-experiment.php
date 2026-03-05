<?php
/**
 * Social AI Experiment.
 *
 * Registers the Social Message Generator experiment with the WordPress AI
 * Experiments plugin. When enabled, this experiment registers the
 * prc-social/generate-message ability and adds a "Generate" button to the
 * per-platform post editor in the Hootsuite scheduling panel.
 *
 * @package PRC\Platform\Social
 */

namespace PRC\Platform\Social;

use WordPress\AI\Abstracts\Abstract_Experiment;

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Social AI Experiment class.
 *
 * @since 1.0.0
 */
class Social_AI_Experiment extends Abstract_Experiment {

	/**
	 * Loads experiment metadata.
	 *
	 * @since 1.0.0
	 *
	 * @return array{id: string, label: string, description: string} Experiment metadata.
	 */
	protected function load_experiment_metadata(): array {
		return array(
			'id'          => 'social-ai-generate',
			'label'       => __( 'Social Message AI Suggest', 'prc-social' ),
			'description' => __( 'Uses AI to generate platform-specific social media messages for posts. Adds a "Suggest with AI" button to each platform\'s text editor in the Hootsuite scheduling panel.', 'prc-social' ),
		);
	}

	/**
	 * Registers the experiment's hooks and functionality.
	 *
	 * This method is only called when the experiment is enabled.
	 *
	 * @since 1.0.0
	 */
	public function register(): void {
		// Register the AI abilities when the experiment is enabled.
		$ability = new Social_AI_Ability();
		add_action( 'wp_abilities_api_init', array( $ability, 'register_ability' ) );

		$thread_ability = new Social_AI_Thread_Ability();
		add_action( 'wp_abilities_api_init', array( $thread_ability, 'register_ability' ) );

		// Localize experiment data for the editor.
		add_action( 'enqueue_block_editor_assets', array( $this, 'localize_experiment_data' ), 20 );
	}

	/**
	 * Localizes the experiment enabled state for the editor script.
	 *
	 * The editor UI script is already enqueued by the Social plugin's
	 * Assets class. We add a localized variable to tell the JS component
	 * that the AI experiment is active.
	 *
	 * @hook enqueue_block_editor_assets
	 * @since 1.0.0
	 */
	public function localize_experiment_data(): void {
		$handle = 'prc-social';

		// Only localize if the parent script is enqueued.
		if ( ! wp_script_is( $handle, 'enqueued' ) ) {
			return;
		}

		wp_localize_script(
			$handle,
			'prcSocialAI',
			array(
				'enabled'            => true,
				'abilityName'        => Social_AI_Ability::$ability_name,
				'threadAbilityName'  => Social_AI_Thread_Ability::$ability_name,
			)
		);
	}
}
