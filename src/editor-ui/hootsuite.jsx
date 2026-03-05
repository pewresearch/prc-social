/**
 * Hootsuite Social Media Scheduler Panel
 *
 * Provides the main panel interface for scheduling social media posts to
 * Twitter, Facebook, Threads, and Bluesky via Hootsuite's API.
 */

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	Button,
	Notice,
	Spinner,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { useEntityProp } from '@wordpress/core-data';

/**
 * Internal Dependencies
 */
import useMessageDrafts from './hooks/use-message-drafts';
import useScheduleActions from './hooks/use-schedule-actions';
import NetworkSection from './components/network-section';
import ScheduledPostsList from './components/scheduled-posts-list';

/**
 * Main Hootsuite Panel Component.
 *
 * @return {JSX.Element} Hootsuite panel component.
 */
export default function HootsuitePanel() {
	const { postId, postType, postDate } = useSelect(
		(select) => ({
			postId: select(editorStore).getCurrentPostId(),
			postType: select(editorStore).getCurrentPostType(),
			postDate: select(editorStore).getEditedPostAttribute('date'),
		}),
		[]
	);

	const [socialMessages, setSocialMessages] = useEntityProp(
		'postType',
		postType,
		'social_messages',
		postId
	);

	const {
		selectedPlatforms,
		platformData,
		setSelectedPlatforms,
		handleScheduledTimeChange,
		handleMessageChange,
		handleAddMessage,
		handleRemoveMessage,
		handleSetMessages,
		resetDrafts,
	} = useMessageDrafts(postType, postId);

	const {
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
	} = useScheduleActions({
		postId,
		selectedPlatforms,
		platformData,
		socialMessages,
		setSocialMessages,
		resetDrafts,
	});

	return (
		<div className="hootsuite-panel" style={{ padding: '0' }}>
			{error && (
				<Notice
					status="error"
					isDismissible
					onRemove={() => setError(null)}
				>
					{error}
				</Notice>
			)}
			{success && (
				<Notice
					status="success"
					isDismissible
					onRemove={() => setSuccess(null)}
				>
					{success}
				</Notice>
			)}

			<div style={{ marginBottom: '16px' }}>
				<NetworkSection
					selectedPlatforms={selectedPlatforms}
					onTogglePlatform={setSelectedPlatforms}
					platformData={platformData}
					onScheduledTimeChange={handleScheduledTimeChange}
					onMessageChange={handleMessageChange}
					onAddMessage={handleAddMessage}
					onRemoveMessage={handleRemoveMessage}
					onSetMessages={handleSetMessages}
					postId={postId}
					postDate={postDate}
				/>
			</div>

			<Button
				variant="primary"
				onClick={handleSchedule}
				disabled={!isValid || isSubmitting}
				isBusy={isSubmitting}
				style={{
					width: '100%',
					justifyContent: 'center',
					marginBottom: '16px',
				}}
			>
				{isSubmitting ? <Spinner /> : __('Schedule Post', 'prc-social')}
			</Button>

			<hr style={{ margin: '16px 0' }} />

			<ScheduledPostsList
				messages={messages}
				onCancel={handleCancel}
				onCancelThread={handleCancelThread}
				onSync={handleSync}
				onSyncAll={handleSyncAll}
				isCancelling={isCancelling}
				isSyncing={isSyncing}
			/>
		</div>
	);
}
