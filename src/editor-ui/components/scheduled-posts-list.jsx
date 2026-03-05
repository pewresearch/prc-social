/**
 * Scheduled posts list component.
 *
 * Groups messages by thread_id with visual thread indicators.
 *
 * @package PRC Social
 */

/**
 * External Dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	Button,
	Tooltip,
	Flex,
	FlexItem,
	__experimentalText as Text,
	__experimentalHStack as HStack,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { trash, external } from '@wordpress/icons';
import { useMemo } from '@wordpress/element';

/**
 * Internal Dependencies
 */
import { PLATFORMS, STATUS_COLORS, STATUS_LABELS, timeAgo } from '../constants';
import {
	StatusIndicator,
	ScheduledPostItem,
	PostContent,
	PostText,
	PostMeta,
	PostThumbnail,
	PlatformBadge,
} from '../styled';

/**
 * Styled thread connector line.
 */
const ThreadGroup = styled.div`
	border-left: 3px solid #ddd;
	padding-left: 12px;
	margin-bottom: 12px;
`;

const ThreadHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8px;
`;

const ThreadOrderBadge = styled.span`
	display: inline-block;
	background: #e0e0e0;
	padding: 1px 5px;
	border-radius: 3px;
	font-size: 10px;
	font-weight: 600;
	color: #555;
	margin-right: 6px;
`;

/**
 * Render a single message row.
 *
 * @param {Object}   props              Component props.
 * @param {Object}   props.message      The message object.
 * @param {Function} props.onCancel     Cancel callback.
 * @param {Function} props.onSync       Sync callback.
 * @param {boolean}  props.isCancelling Whether cancel is in progress.
 * @param {string}   props.threadLabel  Optional thread order label.
 */
function MessageRow({ message, onCancel, onSync, isCancelling, threadLabel }) {
	const statusLabel =
		STATUS_LABELS[message.status] ??
		(message.error_message || __('Unknown', 'prc-social'));
	const tooltipText =
		message.status === 'error' && message.error_message
			? `${statusLabel}: ${message.error_message}`
			: statusLabel;
	const updatedAgo = message.updated_at ? timeAgo(message.updated_at) : '';

	return (
		<ScheduledPostItem>
			<Tooltip text={tooltipText}>
				<StatusIndicator status={message.status} />
			</Tooltip>
			{message.media_url && (
				<PostThumbnail
					src={message.media_url}
					alt={__('Post image', 'prc-social')}
				/>
			)}
			<PostContent>
				<PostText>
					{threadLabel && <ThreadOrderBadge>{threadLabel}</ThreadOrderBadge>}
					{message.text}
				</PostText>
				<PostMeta>
					<PlatformBadge>
						{PLATFORMS[message.platform]?.name || message.platform}
					</PlatformBadge>
					<span
						style={{
							fontWeight: 600,
							color: STATUS_COLORS[message.status] || '#999',
						}}
					>
						{statusLabel}
					</span>
					<span>
						{new Date(message.scheduled_time).toLocaleString()}
					</span>
					{updatedAgo && (
						<span style={{ fontStyle: 'italic' }}>
							{`${__('synced', 'prc-social')} ${updatedAgo}`}
						</span>
					)}
				</PostMeta>
			</PostContent>
			<Flex gap={2}>
				{message.status === 'posted' && message.published_url && (
					<FlexItem>
						<Button
							icon={external}
							href={message.published_url}
							target="_blank"
							rel="noopener noreferrer"
							size="small"
							label={__('View post', 'prc-social')}
						/>
					</FlexItem>
				)}
				{message.status === 'scheduled' && (
					<>
						<FlexItem>
							<Button
								variant="tertiary"
								size="small"
								onClick={() => onSync(message.id)}
								label={__('Sync status', 'prc-social')}
							>
								{__('Sync', 'prc-social')}
							</Button>
						</FlexItem>
						<FlexItem>
							<Button
								icon={trash}
								isDestructive
								size="small"
								onClick={() => onCancel(message.id)}
								disabled={isCancelling}
								label={__(
									'Cancel scheduled post',
									'prc-social'
								)}
							/>
						</FlexItem>
					</>
				)}
			</Flex>
		</ScheduledPostItem>
	);
}

/**
 * Scheduled posts list component.
 *
 * @param {Object}   props                  Component props.
 * @param {Array}    props.messages         Array of scheduled messages.
 * @param {Function} props.onCancel         Callback to cancel a message.
 * @param {Function} props.onCancelThread   Callback to cancel all messages in a thread.
 * @param {Function} props.onSync           Callback to sync a single message status.
 * @param {Function} props.onSyncAll        Callback to bulk-sync all message statuses.
 * @param {boolean}  props.isCancelling     Whether a cancel operation is in progress.
 * @param {boolean}  props.isSyncing        Whether a bulk sync is in progress.
 * @return {JSX.Element} Scheduled posts list component.
 */
export default function ScheduledPostsList({
	messages,
	onCancel,
	onCancelThread,
	onSync,
	onSyncAll,
	isCancelling,
	isSyncing,
}) {
	/**
	 * Group messages: threads (thread_id present) are grouped together,
	 * standalone messages are kept individually.
	 */
	const groups = useMemo(() => {
		if (!messages || messages.length === 0) {
			return [];
		}

		const threadMap = {};
		const standalone = [];

		for (const msg of messages) {
			if (msg.thread_id) {
				if (!threadMap[msg.thread_id]) {
					threadMap[msg.thread_id] = [];
				}
				threadMap[msg.thread_id].push(msg);
			} else {
				standalone.push({ type: 'standalone', message: msg });
			}
		}

		const result = [];

		// Add thread groups sorted by thread_order.
		for (const [threadId, threadMessages] of Object.entries(threadMap)) {
			const sorted = [...threadMessages].sort(
				(a, b) => (a.thread_order || 0) - (b.thread_order || 0)
			);
			result.push({ type: 'thread', threadId, messages: sorted });
		}

		// Add standalone messages.
		result.push(...standalone);

		return result;
	}, [messages]);

	if (!messages || messages.length === 0) {
		return (
			<Text size={12} style={{ color: '#666', fontStyle: 'italic' }}>
				{__('No scheduled posts yet.', 'prc-social')}
			</Text>
		);
	}

	return (
		<div className="hootsuite-scheduled-posts">
			<HStack alignment="center" style={{ marginBottom: '8px' }}>
				<Text weight={600} size={12}>
					{__('Scheduled Posts', 'prc-social')}
				</Text>
				<Button
					variant="tertiary"
					size="small"
					onClick={onSyncAll}
					disabled={isSyncing}
					isBusy={isSyncing}
				>
					{isSyncing
						? __('Refreshing…', 'prc-social')
						: __('Refresh All', 'prc-social')}
				</Button>
			</HStack>

			{groups.map((group) => {
				if (group.type === 'thread') {
					const hasScheduledInThread = group.messages.some(
						(m) => m.status === 'scheduled'
					);
					return (
						<ThreadGroup key={group.threadId}>
							<ThreadHeader>
								<Text
									size={11}
									weight={600}
									style={{ color: '#555' }}
								>
									{__('Thread', 'prc-social')} (
									{group.messages.length}{' '}
									{__('messages', 'prc-social')})
								</Text>
								{hasScheduledInThread && onCancelThread && (
									<Button
										variant="tertiary"
										isDestructive
										size="small"
										onClick={() =>
											onCancelThread(group.threadId)
										}
										disabled={isCancelling}
									>
										{__('Cancel thread', 'prc-social')}
									</Button>
								)}
							</ThreadHeader>
							<VStack spacing={1}>
								{group.messages.map((msg, idx) => (
									<MessageRow
										key={msg.id}
										message={msg}
										onCancel={onCancel}
										onSync={onSync}
										isCancelling={isCancelling}
										threadLabel={`${idx + 1}/${group.messages.length}`}
									/>
								))}
							</VStack>
						</ThreadGroup>
					);
				}

				// Standalone message.
				return (
					<MessageRow
						key={group.message.id}
						message={group.message}
						onCancel={onCancel}
						onSync={onSync}
						isCancelling={isCancelling}
					/>
				);
			})}
		</div>
	);
}
