# PRC Social

Social media integration for the PRC Platform. Connects WordPress posts to Hootsuite for scheduling and publishing across Twitter/X, Facebook, Threads, and Bluesky — with a block editor sidebar, admin column, admin bar status indicator, and optional AI-assisted message generation.

## What it does

- Adds a "Social Scheduler" sidebar panel to the block editor for any post type that supports `prc-social`
- Schedules and cancels social media posts via the Hootsuite API (v1)
- Stores scheduled messages and in-progress drafts as post meta, exposed through the REST API
- Persists per-platform social images (`prc_social_images` meta) with support for source overrides and chart art flags
- Provides a custom Admin Columns Pro column ("Social Schedule") on post list screens, showing schedule status inline
- Adds a "Social Schedule" submenu to the WordPress admin bar on singular posts, listing draft and scheduled message counts per platform
- Renders a frontend schedule report page when `?socialScheduleReport=1` is appended to a post URL (logged-in users only)
- Outputs a `facebook_app_id` meta tag in `<head>` when `PRC_PLATFORM_FACEBOOK_APP_ID` is defined
- Registers two AI abilities (`prc-social/generate-message`, `prc-social/generate-thread`) via the WP Abilities API when the WordPress AI Experiments plugin is active; both are MCP-exposed

## Key files

| File | Purpose |
| --- | --- |
| `prc-social.php` | Plugin entry point; defines constants, registers activation/deactivation hooks, bootstraps the plugin |
| `includes/class-bootstrap.php` | Wires all components together via the loader; registers `prc-social` post type support for `post` and `page` |
| `includes/class-hootsuite.php` | Core Hootsuite API integration: meta registration, REST fields (`social_messages`, `social_message_drafts`), REST routes, sanitizers |
| `includes/class-social-images.php` | Registers and exposes `prc_social_images` post meta and `social_images` REST field |
| `includes/class-meta-tags.php` | Outputs `facebook_app_id` meta tag on the frontend |
| `includes/class-assets.php` | Enqueues the block editor UI script on supported post types |
| `includes/admin-surfaces/class-admin-surfaces.php` | Registers the ACP column, enqueues admin/frontend assets, injects the schedule report and admin bar modal mount points |
| `includes/admin-surfaces/class-acp-column.php` | Admin Columns Pro column definition for "Social Schedule" |
| `includes/admin-bar/class-admin-bar.php` | Renders the Social Schedule admin bar menu with per-message status sub-items |
| `includes/ai-experiment/class-social-ai-experiment.php` | Registers the `social-ai-generate` experiment with the WP AI Experiments plugin |
| `includes/ai-experiment/class-social-ai-ability.php` | `prc-social/generate-message` ability — generates 3 platform-specific message options from post content |
| `includes/ai-experiment/class-social-ai-thread-ability.php` | `prc-social/generate-thread` ability — generates a 2–4 message thread from post content |
| `src/editor-ui/index.js` | Block editor sidebar plugin; registers the "Social Scheduler" panel and a command palette entry |
| `src/editor-ui/hootsuite.jsx` | Hootsuite scheduling panel component |
| `src/admin-surfaces/index.js` | Admin column and frontend report React entrypoint |

## Filters / hooks

| Hook | Direction | Description |
| --- | --- | --- |
| `prc_social_messages_post_types` | Filter | Override which post type slugs support social messages. Default: `['post', 'page']`. |
| `init` | Action | Registers `prc-social` post type support for `post` and `page` (priority 5). |
| `init` | Action | Registers `_social_messages` and `_social_message_drafts` post meta for all supported post types. |
| `rest_api_init` | Action | Registers `social_messages` and `social_message_drafts` REST fields on supported post types. |
| `rest_api_init` | Action | Registers Hootsuite REST routes under `prc-social/v1`. |
| `rest_api_init` | Action | Registers `social_images` REST field on all public post types that support `prc-social`. |
| `enqueue_block_editor_assets` | Action | Enqueues the `prc-social` editor UI script (priority 1) on supported post type screens. |
| `wp_head` | Action | Outputs `facebook_app_id` meta tag when `PRC_PLATFORM_FACEBOOK_APP_ID` is defined. |
| `wp_before_admin_bar_render` | Action | Adds "Social Schedule" submenu to the admin bar on supported singular pages (priority 200). |
| `query_vars` | Filter | Registers the `socialScheduleReport` query var. |
| `wp_enqueue_scripts` | Action | Enqueues admin-surfaces script/style on the frontend when `socialScheduleReport` is set or on supported singular pages for logged-in users. |
| `the_content` | Filter | Replaces post content with the `#js-prc-social-schedule-report` mount point when `socialScheduleReport` query var is present. |
| `wp_footer` | Action | Renders `#js-prc-social-admin-bar-modal` mount point on supported singular pages for logged-in users. |
| `ac/ready` | Action | Registers the ACP "Social Schedule" column type for the `post` list screen. |
| `ac/column_types` | Action | Registers `PRC_SOCIAL_SCHEDULE_COLUMN` with Admin Columns Pro. |
| `ai_experiments_register_experiments` | Action | Registers the `social-ai-generate` experiment when the WP AI Experiments plugin is active. |
| `wp_abilities_api_init` | Action | Registers `prc-social/generate-message` and `prc-social/generate-thread` abilities when the AI experiment is enabled. |
| `enqueue_block_editor_assets` | Action | Localizes `prcSocialAI` JS variable (ability names, enabled flag) onto the `prc-social` script when the AI experiment is active (priority 20). |

## REST API endpoints

All routes are under `prc-social/v1`. Permission: `edit_posts` capability; `edit_post` for the specific post when a `post_id` is provided.

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/hootsuite/schedule` | Schedule a new social post via Hootsuite. |
| `DELETE` | `/hootsuite/schedule/{id}` | Cancel a scheduled message by local message ID. |
| `GET` | `/hootsuite/profiles` | Return available Hootsuite social profiles (cached 5 min via transient). |
| `GET` | `/hootsuite/sync/{id}` | Sync the status of a single message from Hootsuite. |
| `GET` | `/hootsuite/sync-all` | Bulk-sync all `scheduled` messages for a post from Hootsuite. |

### `POST /hootsuite/schedule` parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `post_id` | integer | yes | WordPress post ID |
| `platform` | string | yes | `twitter`, `facebook`, `threads`, or `bluesky` |
| `text` | string | yes | Message body |
| `scheduled_time` | string (ISO 8601) | yes | Must be at least 5 minutes in the future |
| `media_url` | string (URI) | no | Attachment URL to include in the post |
| `thread_id` | string (UUID) | no | Groups messages into a thread; empty for standalone |
| `thread_order` | integer | no | 0-based position within a thread |

## Post meta

| Meta key | Post types | Description |
| --- | --- | --- |
| `_social_messages` | Supported types | Array of scheduled/posted/error message records |
| `_social_message_drafts` | Supported types | Per-platform draft state (selected platforms, text, image, scheduled time) |
| `prc_social_images` | All public types with `prc-social` support | Per-platform image data (attachment ID, URL, dimensions, caption, chart art flag, source override) |

Both `_social_messages` and `_social_message_drafts` are `show_in_rest` and accessible via the `social_messages` and `social_message_drafts` REST fields respectively.

## Configuration

| Constant | Required | Description |
| --- | --- | --- |
| `PRC_HOOTSUITE_API_KEY` | Yes | Bearer token for Hootsuite Platform API v1 |
| `PRC_PLATFORM_FACEBOOK_APP_ID` | No | Outputs the `facebook_app_id` meta tag when set |

Define constants in `wp-config.php` or your environment's secrets management layer (VIP: Secrets API).

```php
define( 'PRC_HOOTSUITE_API_KEY', 'your-bearer-token' );
define( 'PRC_PLATFORM_FACEBOOK_APP_ID', '000000000000000' );
```

## Adding post type support

To enable social scheduling on a custom post type:

```php
add_post_type_support( 'my-post-type', 'prc-social' );
```

Once added, the post type will automatically receive the editor sidebar, REST fields, meta registration, and admin bar integration.

## AI experiment

The AI features are disabled by default and must be activated through the WP AI Experiments plugin UI. When enabled, two abilities become available:

- **`prc-social/generate-message`** — Given a `postId` and optional `maxCharacters`, returns an array of 3 distinct message options derived from the post title and content. Platform-specific length constraints are applied automatically.
- **`prc-social/generate-thread`** — Given a `postId`, `platform`, and optional `maxMessages` (2–4), returns a structured thread of messages with a hook, data-driven body posts, and a closing call to action.

Both abilities respect site-level content guidelines when the `wp_get_content_guidelines_for_post()` function is available (provided by the Content Guidelines plugin). Both are MCP-exposed (`public: true, type: tool`).

## Dependencies

| Dependency | Type | Notes |
| --- | --- | --- |
| `prc-platform-core` | WordPress plugin | Required (`Requires Plugins` header) |
| Admin Columns Pro | WordPress plugin | Optional; required for the "Social Schedule" list table column |
| WordPress AI Experiments | WordPress plugin | Optional; required for AI message/thread generation (`Abstract_Experiment` class) |
| `@prc/components` | npm | Shared PRC component library |
| `@wordpress/scripts` | npm (dev) | Build tooling |

## Build

```bash
npm run build -w @prc/social
```

Outputs two separate bundles:

- `build/editor-ui/` — Block editor sidebar
- `build/admin-surfaces/` — Admin column and frontend report
