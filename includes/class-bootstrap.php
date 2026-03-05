<?php
/**
 * Bootstrap class.
 *
 * @package    PRC\Platform\Social
 */

namespace PRC\Platform\Social;

use WP_Error;

/**
 * Bootstrap class.
 *
 * @package    PRC\Platform\Social
 */
class Bootstrap {
	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      Loader    $loader    Maintains and registers all hooks for the plugin.
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $plugin_name    The string used to uniquely identify this plugin.
	 */
	protected $plugin_name;

	/**
	 * The current version of the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $version    The current version of the plugin.
	 */
	protected $version;

	/**
	 * Define the core functionality of the platform as initialized by hooks.
	 *
	 * @since    1.0.0
	 */
	public function __construct() {
		$this->version     = '1.0.0';
		$this->plugin_name = 'prc-social';

		$this->load_dependencies();
		$this->init_dependencies();
	}


	/**
	 * Load the required dependencies for this plugin.
	 *
	 * Create an instance of the loader which will be used to register the hooks
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function load_dependencies() {
		// Load plugin loading class.
		require_once plugin_dir_path( __DIR__ ) . '/includes/class-loader.php';

		// Initialize the loader.
		$this->loader = new Loader();

		// Load files...
		require_once plugin_dir_path( __DIR__ ) . '/includes/class-assets.php';
		require_once plugin_dir_path( __DIR__ ) . '/includes/class-social-images.php';
		require_once plugin_dir_path( __DIR__ ) . '/includes/class-hootsuite.php';
		require_once plugin_dir_path( __DIR__ ) . '/includes/class-meta-tags.php';

		// Load admin surfaces and admin bar classes.
		require_once plugin_dir_path( __DIR__ ) . '/includes/admin-surfaces/class-admin-surfaces.php';
		require_once plugin_dir_path( __DIR__ ) . '/includes/admin-bar/class-admin-bar.php';

		// Load the AI experiment and ability classes if the WP AI plugin is available.
		if ( class_exists( '\WordPress\AI\Abstracts\Abstract_Experiment' ) ) {
			require_once plugin_dir_path( __DIR__ ) . '/includes/ai-experiment/class-social-ai-ability.php';
			require_once plugin_dir_path( __DIR__ ) . '/includes/ai-experiment/class-social-ai-thread-ability.php';
			require_once plugin_dir_path( __DIR__ ) . '/includes/ai-experiment/class-social-ai-experiment.php';
		}
	}

	/**
	 * Initialize the dependencies.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function init_dependencies() {
		// Register default post type support for built-in types
		$this->loader->add_action( 'init', $this, 'register_default_post_type_support', 5 );

		new Assets( $this->get_loader() );
		new Social_Images( $this->get_loader() );
		new Hootsuite( $this->get_loader() );
		new Meta_Tags( $this->get_loader() );
		new Admin_Surfaces( $this->get_loader() );
		new Admin_Bar( $this->get_loader() );

		// Register the AI experiment with the WP AI Experiments plugin.
		if ( class_exists( '\WordPress\AI\Abstracts\Abstract_Experiment' ) ) {
			add_action(
				'ai_experiments_register_experiments',
				function ( $registry ) {
					$registry->register_experiment( new Social_AI_Experiment() );
				}
			);
		}
	}

	/**
	 * Register default post type support for built-in post types.
	 *
	 * @hook init
	 */
	public function register_default_post_type_support() {
		add_post_type_support( 'post', 'prc-social' );
		add_post_type_support( 'page', 'prc-social' );
	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since    1.0.0
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 *
	 * @since     1.0.0
	 * @return    string    The name of the plugin.
	 */
	public function get_plugin_name() {
		return $this->plugin_name;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @since     1.0.0
	 * @return    PRC\Platform\Social\Loader
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @since     1.0.0
	 * @return    string    The version number of the plugin.
	 */
	public function get_version() {
		return $this->version;
	}
}
