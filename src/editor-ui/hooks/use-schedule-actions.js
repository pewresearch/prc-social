/**
 * Hook encapsulating Hootsuite scheduling, cancellation, and sync operations.
 *
 * @package PRC Social
 */

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState, useCallback, useMemo, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal Dependencies
 */
import { PLATFORMS, getMinScheduleTimestamp } from '../constants';

/**
 * Generate a UUID v4 string.
 *
 * @return {string} UUID string.
 */
function generateUUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
		/[xy]/g,
		function (c) {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		}
	);
}

/**
 * Hook encapsulating Hootsuite scheduling, cancellation, and sync operations.
 *
 * Now supports per-platform validation and thread-aware scheduling where each
 * platform has its own scheduledTime and messages array.
 *
 * @param {Object}   opts
 * @param {number}   opts.postId            Current post ID.
 * @param {Array}    opts.selectedPlatforms Selected platform keys.
 * @param {Object}   opts.platformData      Per-platform draft data (new shape).
 * @param {Array}    opts.socialMessages    Existing scheduled messages.
 * @param {Function} opts.setSocialMessages Setter for social messages entity prop.
 * @param {Function} opts.resetDrafts       Callback to clear draft state.
 * @return {Object} Schedule action handlers and transient state.
 */
export default function useScheduleActions({
	postId,
	selectedPlatforms,
	platformData,
	socialMessages,
	setSocialMessages,
	resetDrafts,
}) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCancelling, setIsCancelling] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(null);

	useEffect(() => {
		if (error) {
			const t = setTimeout(() => setError(null), 5000);
			return () => clearTimeout(t);
		}
	}, [error]);

	useEffect(() => {
		if (success) {
			const t = setTimeout(() => setSuccess(null), 3000);
			return () => clearTimeout(t);
		}
	}, [success]);

	/**
	 * Validate all selected platforms: each must have its own scheduledTime,
	 * and every message must have non-empty text within char limit.
	 */
	const isValid = useMemo(() => {
		if (selectedPlatforms.length === 0) {
			return false;
		}
		for (const key of selectedPlatforms) {
			const pd = platformData[key];
			if (!pd) {
				return false;
			}

			// Per-platform scheduled time check.
			if (!pd.scheduledTime) {
				return false;
			}
			if (
				new Date(pd.scheduledTime).getTime() <=
				getMinScheduleTimestamp()
			) {
				return false;
			}

			// Validate messages array.
			if (!Array.isArray(pd.messages) || pd.messages.length === 0) {
				return false;
			}
			const charLimit = PLATFORMS[key]?.charLimit || Infinity;
			for (const msg of pd.messages) {
				if (!msg?.text?.trim()) {
					return false;
				}
				if (msg.text.length > charLimit) {
					return false;
				}
			}
		}
		return true;
	}, [selectedPlatforms, platformData]);

	/**
	 * Schedule posts for all selected platforms. Each platform schedules
	 * its messages sequentially (thread order matters), but platforms
	 * are scheduled in parallel.
	 */
	const handleSchedule = useCallback(async () => {
		if (!isValid || isSubmitting) {
			return;
		}
		setIsSubmitting(true);
		setError(null);
		try {
			// Build schedule calls per platform, respecting thread ordering.
			const platformPromises = selectedPlatforms.map(
				async (platform) => {
					const pd = platformData[platform];
					const msgs = pd.messages;
					const threadId =
						msgs.length > 1 ? generateUUID() : '';

					// Schedule messages sequentially within each platform to preserve order.
					const results = [];
					for (let i = 0; i < msgs.length; i++) {
						const msg = msgs[i];
						const result = await apiFetch({
							path: '/prc-social/v1/hootsuite/schedule',
							method: 'POST',
							data: {
								post_id: postId,
								platform,
								text: msg.text,
								scheduled_time: pd.scheduledTime,
								media_url: msg.imageUrl || '',
								thread_id: threadId,
								thread_order: i,
							},
						});
						results.push(result.message);
					}
					return results;
				}
			);

			const allResults = await Promise.all(platformPromises);
			const newMessages = allResults.flat();

			const cur = Array.isArray(socialMessages) ? socialMessages : [];
			setSocialMessages([...cur, ...newMessages]);
			resetDrafts();
			setSuccess(__('Posts scheduled successfully!', 'prc-social'));
		} catch (err) {
			setError(
				err.message || __('Failed to schedule posts.', 'prc-social')
			);
		} finally {
			setIsSubmitting(false);
		}
	}, [
		isValid,
		isSubmitting,
		selectedPlatforms,
		postId,
		platformData,
		socialMessages,
		setSocialMessages,
		resetDrafts,
	]);

	const handleCancel = useCallback(
		async (messageId) => {
			setIsCancelling(true);
			setError(null);
			try {
				await apiFetch({
					path: `/prc-social/v1/hootsuite/schedule/${messageId}?post_id=${postId}`,
					method: 'DELETE',
				});
				const cur = Array.isArray(socialMessages) ? socialMessages : [];
				setSocialMessages(cur.filter((m) => m.id !== messageId));
				setSuccess(__('Post cancelled.', 'prc-social'));
			} catch (err) {
				setError(
					err.message || __('Failed to cancel post.', 'prc-social')
				);
			} finally {
				setIsCancelling(false);
			}
		},
		[postId, socialMessages, setSocialMessages]
	);

	/**
	 * Cancel all messages in a thread at once.
	 *
	 * @param {string} threadId The thread UUID to cancel.
	 */
	const handleCancelThread = useCallback(
		async (threadId) => {
			if (!threadId) {
				return;
			}
			setIsCancelling(true);
			setError(null);
			try {
				const cur = Array.isArray(socialMessages) ? socialMessages : [];
				const threadMessages = cur.filter(
					(m) =>
						m.thread_id === threadId && m.status === 'scheduled'
				);
				// Cancel each message in the thread.
				await Promise.all(
					threadMessages.map((m) =>
						apiFetch({
							path: `/prc-social/v1/hootsuite/schedule/${m.id}?post_id=${postId}`,
							method: 'DELETE',
						})
					)
				);
				setSocialMessages(
					cur.filter(
						(m) =>
							m.thread_id !== threadId ||
							m.status !== 'scheduled'
					)
				);
				setSuccess(__('Thread cancelled.', 'prc-social'));
			} catch (err) {
				setError(
					err.message ||
						__('Failed to cancel thread.', 'prc-social')
				);
			} finally {
				setIsCancelling(false);
			}
		},
		[postId, socialMessages, setSocialMessages]
	);

	const handleSync = useCallback(
		async (messageId) => {
			try {
				const response = await apiFetch({
					path: `/prc-social/v1/hootsuite/sync/${messageId}?post_id=${postId}`,
					method: 'GET',
				});
				const cur = Array.isArray(socialMessages) ? socialMessages : [];
				setSocialMessages(
					cur.map((m) =>
						m.id === messageId ? response.message : m
					)
				);
			} catch (err) {
				setError(
					err.message || __('Failed to sync status.', 'prc-social')
				);
			}
		},
		[postId, socialMessages, setSocialMessages]
	);

	/**
	 * Bulk-sync all scheduled messages for this post via the Hootsuite API.
	 * Updates every message that still has status "scheduled" in one request.
	 */
	const handleSyncAll = useCallback(async () => {
		if (isSyncing) {
			return;
		}
		setIsSyncing(true);
		try {
			const response = await apiFetch({
				path: `/prc-social/v1/hootsuite/sync-all?post_id=${postId}`,
				method: 'GET',
			});
			if (response?.messages) {
				setSocialMessages(response.messages);
			}
		} catch (err) {
			setError(
				err.message || __('Failed to refresh statuses.', 'prc-social')
			);
		} finally {
			setIsSyncing(false);
		}
	}, [isSyncing, postId, setSocialMessages]);

	const messages = useMemo(
		() => (Array.isArray(socialMessages) ? socialMessages : []),
		[socialMessages]
	);

	// Auto-sync statuses when the panel mounts and there are scheduled messages.
	const hasScheduledMessages = useMemo(
		() => messages.some((m) => m.status === 'scheduled'),
		[messages]
	);

	// Track whether we've already auto-synced for this post to avoid repeated calls.
	const [hasAutoSynced, setHasAutoSynced] = useState(false);

	useEffect(() => {
		if (hasScheduledMessages && !hasAutoSynced && !isSyncing) {
			setHasAutoSynced(true);
			handleSyncAll();
		}
	}, [hasScheduledMessages, hasAutoSynced, isSyncing, handleSyncAll]);

	return {
		isSubmitting,
		isCancelling,
		isSyncing,
		error,
		setError,
		success,
		setSuccess,
		isValid,
		messages,
		handleSchedule,
		handleCancel,
		handleCancelThread,
		handleSync,
		handleSyncAll,
	};
}
