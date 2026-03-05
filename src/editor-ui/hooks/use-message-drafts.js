/**
 * Custom hook to manage social message draft state persisted via post meta.
 *
 * @package PRC Social
 */

/**
 * WordPress Dependencies
 */
import { useMemo, useCallback } from '@wordpress/element';
import { useEntityProp } from '@wordpress/core-data';

/**
 * Internal Dependencies
 */
import { EMPTY_DRAFTS, EMPTY_MESSAGE, EMPTY_PLATFORM } from '../constants';

/**
 * Maximum number of messages per platform thread.
 */
const MAX_MESSAGES = 4;

/**
 * Migrate a legacy flat platform object `{ text, imageId, imageUrl }` into the
 * new shape `{ scheduledTime, messages: [{ text, imageId, imageUrl }] }`.
 *
 * @param {Object} data           The platform data (old or new format).
 * @param {string} legacySchedule The top-level scheduledTime from the old format.
 * @return {Object} Platform data in the new shape.
 */
function migratePlatformData(data, legacySchedule = '') {
	if (!data || typeof data !== 'object') {
		return { ...EMPTY_PLATFORM, messages: [{ ...EMPTY_MESSAGE }] };
	}

	// Already new format.
	if (Array.isArray(data.messages)) {
		return {
			scheduledTime: data.scheduledTime || '',
			messages:
				data.messages.length > 0
					? data.messages
					: [{ ...EMPTY_MESSAGE }],
		};
	}

	// Legacy format: { text, imageId, imageUrl } at root.
	if (typeof data.text === 'string' || data.text === undefined) {
		return {
			scheduledTime: legacySchedule,
			messages: [
				{
					text: data.text || '',
					imageId: data.imageId ?? null,
					imageUrl: data.imageUrl || '',
				},
			],
		};
	}

	return { ...EMPTY_PLATFORM, messages: [{ ...EMPTY_MESSAGE }] };
}

/**
 * Custom hook to manage social message draft state persisted via post meta.
 *
 * Reads and writes the `social_message_drafts` entity prop so that
 * draft messages survive editor reloads and are saved with the post.
 *
 * @param {string} postType The current post type.
 * @param {number} postId   The current post ID.
 * @return {Object} Draft state and updater functions.
 */
export default function useMessageDrafts(postType, postId) {
	const [savedDrafts, setSavedDrafts] = useEntityProp(
		'postType',
		postType,
		'social_message_drafts',
		postId
	);

	const drafts = useMemo(() => {
		if (
			savedDrafts &&
			typeof savedDrafts === 'object' &&
			Object.keys(savedDrafts).length > 0
		) {
			const legacySchedule = savedDrafts.scheduledTime || '';
			const rawPlatformData = savedDrafts.platformData || {};

			const platformData = {};
			for (const key of Object.keys(EMPTY_DRAFTS.platformData)) {
				platformData[key] = migratePlatformData(
					rawPlatformData[key],
					legacySchedule
				);
			}

			return {
				selectedPlatforms: Array.isArray(
					savedDrafts.selectedPlatforms
				)
					? savedDrafts.selectedPlatforms
					: EMPTY_DRAFTS.selectedPlatforms,
				platformData,
			};
		}
		return EMPTY_DRAFTS;
	}, [savedDrafts]);

	const updateDrafts = useCallback(
		(partial) => {
			const current =
				savedDrafts &&
				typeof savedDrafts === 'object' &&
				Object.keys(savedDrafts).length > 0
					? savedDrafts
					: EMPTY_DRAFTS;
			setSavedDrafts({ ...current, ...partial });
		},
		[savedDrafts, setSavedDrafts]
	);

	const setSelectedPlatforms = useCallback(
		(platforms) => updateDrafts({ selectedPlatforms: platforms }),
		[updateDrafts]
	);

	/**
	 * Update the scheduled time for a specific platform.
	 *
	 * @param {string} platformKey The platform key.
	 * @param {string} time        ISO date string.
	 */
	const handleScheduledTimeChange = useCallback(
		(platformKey, time) => {
			updateDrafts({
				platformData: {
					...drafts.platformData,
					[platformKey]: {
						...drafts.platformData[platformKey],
						scheduledTime: time,
					},
				},
			});
		},
		[drafts.platformData, updateDrafts]
	);

	/**
	 * Update a single message within a platform's messages array.
	 *
	 * @param {string} platformKey The platform key.
	 * @param {number} index       The message index.
	 * @param {Object} data        Partial data to merge into the message.
	 */
	const handleMessageChange = useCallback(
		(platformKey, index, data) => {
			const platform = drafts.platformData[platformKey];
			const messages = [...platform.messages];
			messages[index] = { ...messages[index], ...data };
			updateDrafts({
				platformData: {
					...drafts.platformData,
					[platformKey]: {
						...platform,
						messages,
					},
				},
			});
		},
		[drafts.platformData, updateDrafts]
	);

	/**
	 * Add a new empty message to a platform's thread (max 4).
	 *
	 * @param {string} platformKey The platform key.
	 */
	const handleAddMessage = useCallback(
		(platformKey) => {
			const platform = drafts.platformData[platformKey];
			if (platform.messages.length >= MAX_MESSAGES) {
				return;
			}
			updateDrafts({
				platformData: {
					...drafts.platformData,
					[platformKey]: {
						...platform,
						messages: [
							...platform.messages,
							{ ...EMPTY_MESSAGE },
						],
					},
				},
			});
		},
		[drafts.platformData, updateDrafts]
	);

	/**
	 * Remove a message from a platform's thread by index (minimum 1 message).
	 *
	 * @param {string} platformKey The platform key.
	 * @param {number} index       The message index to remove.
	 */
	const handleRemoveMessage = useCallback(
		(platformKey, index) => {
			const platform = drafts.platformData[platformKey];
			if (platform.messages.length <= 1) {
				return;
			}
			updateDrafts({
				platformData: {
					...drafts.platformData,
					[platformKey]: {
						...platform,
						messages: platform.messages.filter(
							(_, i) => i !== index
						),
					},
				},
			});
		},
		[drafts.platformData, updateDrafts]
	);

	/**
	 * Replace all messages for a platform (used by AI thread generation).
	 *
	 * @param {string} platformKey The platform key.
	 * @param {Array}  messages    Array of message objects.
	 */
	const handleSetMessages = useCallback(
		(platformKey, messages) => {
			const platform = drafts.platformData[platformKey];
			updateDrafts({
				platformData: {
					...drafts.platformData,
					[platformKey]: {
						...platform,
						messages:
							messages.length > 0
								? messages
								: [{ ...EMPTY_MESSAGE }],
					},
				},
			});
		},
		[drafts.platformData, updateDrafts]
	);

	const resetDrafts = useCallback(
		() => setSavedDrafts(EMPTY_DRAFTS),
		[setSavedDrafts]
	);

	return {
		selectedPlatforms: drafts.selectedPlatforms,
		platformData: drafts.platformData,
		setSelectedPlatforms,
		handleScheduledTimeChange,
		handleMessageChange,
		handleAddMessage,
		handleRemoveMessage,
		handleSetMessages,
		resetDrafts,
	};
}
