/**
 * Shared constants, configuration, and utility functions for the Social Scheduler.
 *
 * @package PRC Social
 */

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Platform configuration with character limits.
 */
export const PLATFORMS = {
	twitter: {
		name: __('Twitter / X', 'prc-social'),
		charLimit: 280,
		key: 'twitter',
	},
	facebook: {
		name: __('Facebook', 'prc-social'),
		charLimit: 63206,
		key: 'facebook',
	},
	threads: {
		name: __('Threads', 'prc-social'),
		charLimit: 500,
		key: 'threads',
	},
	bluesky: {
		name: __('Bluesky', 'prc-social'),
		charLimit: 300,
		key: 'bluesky',
	},
};

/** Minimum schedule time: 5 minutes from now (timestamp in ms). */
export function getMinScheduleTimestamp() {
	return Date.now() + 5 * 60 * 1000;
}

/**
 * Status indicator colors.
 */
export const STATUS_COLORS = {
	scheduled: '#F0B429', // Yellow
	posted: '#22C55E', // Green
	error: '#EF4444', // Red
};

/**
 * Human-readable status label map.
 */
export const STATUS_LABELS = {
	scheduled: __('Scheduled', 'prc-social'),
	posted: __('Published', 'prc-social'),
	error: __('Error', 'prc-social'),
};

/**
 * Check if the AI experiment is enabled.
 * The prcSocialAI global is localized by the Social AI Experiment
 * when the experiment is enabled in the WP AI Experiments plugin settings.
 */
export const isAIEnabled =
	typeof window !== 'undefined' &&
	typeof window.prcSocialAI !== 'undefined' &&
	window.prcSocialAI.enabled;

/**
 * Default empty message item for a platform thread.
 */
export const EMPTY_MESSAGE = { text: '', imageId: null, imageUrl: '' };

/**
 * Default empty platform draft with per-platform scheduling and messages array.
 */
export const EMPTY_PLATFORM = {
	scheduledTime: '',
	messages: [{ ...EMPTY_MESSAGE }],
};

/**
 * Default empty draft state.
 */
export const EMPTY_DRAFTS = {
	selectedPlatforms: [],
	platformData: {
		twitter: { ...EMPTY_PLATFORM, messages: [{ ...EMPTY_MESSAGE }] },
		facebook: { ...EMPTY_PLATFORM, messages: [{ ...EMPTY_MESSAGE }] },
		threads: { ...EMPTY_PLATFORM, messages: [{ ...EMPTY_MESSAGE }] },
		bluesky: { ...EMPTY_PLATFORM, messages: [{ ...EMPTY_MESSAGE }] },
	},
};

/**
 * Format a relative "time ago" string from an ISO date.
 *
 * @param {string} iso ISO 8601 date string.
 * @return {string} Human-readable relative time.
 */
export function timeAgo(iso) {
	if (!iso) {
		return '';
	}
	const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 60) {
		return __('just now', 'prc-social');
	}
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return `${minutes}m ago`;
	}
	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours}h ago`;
	}
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}
