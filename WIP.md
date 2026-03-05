# PRC Social Scheduler

- This plugin is currently a work in progress (WIP) and is not yet ready for production use.
- Features:
    - A interface for posts to schedule social media posts X hours/days after publishing.
- Planned Features:
    - Support for multiple social media platforms (e.g., Twitter, Facebook, LinkedIn, Bluesky, Threads, Instagram).
    - Customizable scheduling options.
    - Set the title, description, and image for each scheduled post.
    - Utilize Hootsuite API for scheduling posts and media management.
    - Interface should match proposed Jetpack social revamp: https://x.com/innerwebs/status/1996314915804729821?s=20

- We have started prototyping the ui components and system "posters" for generating the images in art-direction. We will need to pull that functionality out of art direction and into this plugin.

### Code snippet to add Facebook App ID meta tag

```
/**
* Place the Facebook app ID in the head.
*
* @hook wp_head
* @return void
*/
public function place_facebook_app_id_in_head() {
	// Sanity checks to ensure that the constants are defined.
	if ( ! defined( 'PRC_PLATFORM_FACEBOOK_APP_ID' ) ) {
		return;
	}
	$fb_key = PRC_PLATFORM_FACEBOOK_APP_ID;
	// If on a dev server then override the site selection and use test ID.
	if ( 'production' !== wp_get_environment_type() ) {
		$fb_key = null;
	}
	echo '<meta property="share:appID:fb" content="' . esc_attr( $fb_key ) . '">';
}
```
