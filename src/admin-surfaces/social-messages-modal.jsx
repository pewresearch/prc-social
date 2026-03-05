/**
 * Social Messages Modal
 *
 * Reusable modal displaying all social messages and drafts with platform-specific
 * SocialPreview cards, status indicators, scheduled times, and links.
 */

/**
 * External Dependencies
 */
import styled from '@emotion/styled';
import { SocialPreview } from '@prc/components';

/**
 * WordPress Dependencies
 */
import { useMemo } from '@wordpress/element';
import { Modal as WPComModal, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal Dependencies
 */
import { useMessages } from './context';

/**
 * Status indicator colors.
 */
const STATUS_COLORS = {
	scheduled: '#F0B429',
	posted: '#22C55E',
	error: '#EF4444',
	draft: '#9CA3AF',
};

/**
 * Platform display names.
 */
const PLATFORM_NAMES = {
	twitter: 'Twitter / X',
	facebook: 'Facebook',
	threads: 'Threads',
	bluesky: 'Bluesky',
};

/**
 * Status display labels.
 */
const STATUS_LABELS = {
	scheduled: __('Scheduled', 'prc-social'),
	posted: __('Published', 'prc-social'),
	error: __('Error', 'prc-social'),
	draft: __('Draft', 'prc-social'),
};

/**
 * Maps platform keys to the SocialPreview text prop name.
 */
const TEXT_PROP_MAP = {
	twitter: 'tweetText',
	facebook: 'postText',
	bluesky: 'postText',
	threads: 'postText',
};

const Modal = styled(WPComModal)`
	* {
		font-family: 'Open Sans', sans-serif;
	}
`;

const ModalInner = styled.div`
	width: 60vw;
	min-height: 40vh;
	max-height: 80vh;
	overflow-y: auto;
`;

const SectionHeading = styled.h3`
	font-size: 13px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: #666;
	margin: 16px 0 8px;
	padding-bottom: 4px;
	border-bottom: 1px solid #eee;
`;

const MessageCard = styled.div`
	border: 1px solid #ddd;
	border-radius: 4px;
	margin-bottom: 12px;
	background: ${(props) => (props.isDraft ? '#f5f5f0' : '#fafafa')};
	${(props) =>
		props.isDraft &&
		`
		border-style: dashed;
	`}
`;

const MessageHeader = styled.div`
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	padding: 10px 12px;
	border-bottom: 1px solid #eee;
	font-size: 11px;
	color: #666;
`;

const PreviewWrapper = styled.div`
	padding: 12px;
`;

const MessageFooter = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border-top: 1px solid #eee;
	font-size: 11px;
	color: #666;
`;

const StatusDot = styled.span`
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background-color: ${(props) => STATUS_COLORS[props.status] || '#999'};
	flex-shrink: 0;
`;

const PlatformBadge = styled.span`
	display: inline-block;
	background: #e0e0e0;
	padding: 2px 6px;
	border-radius: 3px;
	font-size: 11px;
	text-transform: capitalize;
`;

const StatusLabel = styled.span`
	font-weight: 600;
	color: ${(props) => STATUS_COLORS[props.status] || '#999'};
`;

const ViewLink = styled.a`
	font-size: 11px;
	color: #2271b1;
	text-decoration: none;
	&:hover {
		text-decoration: underline;
	}
`;

const ErrorText = styled.span`
	font-size: 11px;
	color: #ef4444;
	font-style: italic;
`;

const PubDateBanner = styled.div`
	background: #f0f6fc;
	border: 1px solid #c3d8ed;
	border-radius: 4px;
	padding: 10px 14px;
	margin-bottom: 16px;
	font-size: 13px;
	color: #1e1e1e;
	display: flex;
	align-items: center;
	gap: 6px;
`;

const PubDateLabel = styled.span`
	font-weight: 600;
	color: #1d4ed8;
`;

const TimeDiff = styled.span`
	font-size: 10px;
	color: #1d4ed8;
	background: #eff6ff;
	padding: 1px 5px;
	border-radius: 3px;
	white-space: nowrap;
`;

/**
 * Formats the time difference between two dates into a human-readable string.
 *
 * @param {Date} dateA The earlier date.
 * @param {Date} dateB The later date.
 * @return {string} Formatted time difference (e.g. "2h 30m after pub").
 */
function formatTimeDiff(dateA, dateB) {
	const diffMs = dateB.getTime() - dateA.getTime();
	const absDiff = Math.abs(diffMs);
	const suffix =
		diffMs >= 0
			? __('after pub', 'prc-social')
			: __('before pub', 'prc-social');

	const totalMinutes = Math.round(absDiff / 60000);
	if (totalMinutes < 1) {
		return __('at pub time', 'prc-social');
	}
	const days = Math.floor(totalMinutes / 1440);
	const hours = Math.floor((totalMinutes % 1440) / 60);
	const minutes = totalMinutes % 60;

	const parts = [];
	if (days > 0) {
		parts.push(`${days}d`);
	}
	if (hours > 0) {
		parts.push(`${hours}h`);
	}
	if (minutes > 0) {
		parts.push(`${minutes}m`);
	}
	return `${parts.join(' ')} ${suffix}`;
}

/**
 * Renders the list of sent/scheduled messages with SocialPreview cards.
 *
 * @param {Object}    props              Component props.
 * @param {Array}     props.messages     Sorted array of message objects.
 * @param {Date|null} props.pubDate      The post's publication date, if available.
 * @param {Object}    props.previewProps Shared SocialPreview props (title, description, url, image).
 * @return {JSX.Element} Messages list.
 */
function MessagesList({ messages, pubDate, previewProps }) {
	return messages.map((message) => {
		const platformName =
			PLATFORM_NAMES[message.platform] || message.platform;
		const statusLabel = STATUS_LABELS[message.status] || message.status;
		const scheduledTime = message.scheduled_time
			? new Date(message.scheduled_time).toLocaleString()
			: '';
		const timeDiff =
			pubDate && message.scheduled_time
				? formatTimeDiff(pubDate, new Date(message.scheduled_time))
				: null;
		const textPropName = TEXT_PROP_MAP[message.platform] || 'postText';
		const previewImage = message.media_url || previewProps.image || '';

		const hasFooter =
			(message.status === 'posted' && message.published_url) ||
			(message.status === 'error' && message.error_message);

		return (
			<MessageCard key={message.id}>
				<MessageHeader>
					<StatusDot status={message.status} />
					<PlatformBadge>{platformName}</PlatformBadge>
					<StatusLabel status={message.status}>
						{statusLabel}
					</StatusLabel>
					{scheduledTime && <span>{scheduledTime}</span>}
					{timeDiff && <TimeDiff>{timeDiff}</TimeDiff>}
				</MessageHeader>
				<PreviewWrapper>
					<SocialPreview
						networks={[message.platform]}
						{...previewProps}
						image={previewImage}
						{...{ [textPropName]: message.text }}
					/>
				</PreviewWrapper>
				{hasFooter && (
					<MessageFooter>
						{message.status === 'posted' &&
							message.published_url && (
								<ViewLink
									href={message.published_url}
									target="_blank"
									rel="noopener noreferrer"
								>
									{__('View on platform', 'prc-social')}
								</ViewLink>
							)}
						{message.status === 'error' &&
							message.error_message && (
								<ErrorText>{message.error_message}</ErrorText>
							)}
					</MessageFooter>
				)}
			</MessageCard>
		);
	});
}

/**
 * Renders the list of draft messages with SocialPreview cards.
 *
 * @param {Object}    props              Component props.
 * @param {Array}     props.drafts       Array of normalized draft objects.
 * @param {Date|null} props.pubDate      The post's publication date, if available.
 * @param {Object}    props.previewProps Shared SocialPreview props (title, description, url, image).
 * @return {JSX.Element} Drafts list.
 */
function DraftsList({ drafts, pubDate, previewProps }) {
	return drafts.map((draft) => {
		const platformName = PLATFORM_NAMES[draft.platform] || draft.platform;
		const scheduledTime = draft.scheduledTime
			? new Date(draft.scheduledTime).toLocaleString()
			: '';
		const timeDiff =
			pubDate && draft.scheduledTime
				? formatTimeDiff(pubDate, new Date(draft.scheduledTime))
				: null;
		const textPropName = TEXT_PROP_MAP[draft.platform] || 'postText';
		const previewImage = draft.imageUrl || previewProps.image || '';

		return (
			<MessageCard key={draft.platform} isDraft>
				<MessageHeader>
					<StatusDot status="draft" />
					<PlatformBadge>{platformName}</PlatformBadge>
					<StatusLabel status="draft">
						{STATUS_LABELS.draft}
					</StatusLabel>
					{scheduledTime && <span>{scheduledTime}</span>}
					{timeDiff && <TimeDiff>{timeDiff}</TimeDiff>}
				</MessageHeader>
				<PreviewWrapper>
					<SocialPreview
						networks={[draft.platform]}
						{...previewProps}
						image={previewImage}
						{...{ [textPropName]: draft.text }}
					/>
				</PreviewWrapper>
			</MessageCard>
		);
	});
}

/**
 * Strips HTML tags from a string.
 *
 * @param {string} html HTML string.
 * @return {string} Plain text string.
 */
function stripHtml(html) {
	// eslint-disable-next-line no-undef
	const doc = new DOMParser().parseFromString(html, 'text/html');
	return doc.body.textContent || '';
}

/**
 * Social Messages Modal component.
 *
 * @param {Object}   props         Component props.
 * @param {Function} props.onClose Callback when the modal is closed.
 * @return {JSX.Element} Modal component.
 */
export default function SocialMessagesModal({ onClose }) {
	const {
		messages,
		drafts,
		postTitle,
		postDate,
		postStatus,
		postExcerpt,
		postLink,
		featuredImageUrl,
		loading,
	} = useMessages();

	const pubDate = useMemo(() => {
		return postDate ? new Date(postDate) : null;
	}, [postDate]);

	// Shared props for every SocialPreview instance.
	const previewProps = useMemo(
		() => ({
			title: postTitle,
			description: stripHtml(postExcerpt),
			url: postLink,
			image: featuredImageUrl,
		}),
		[postTitle, postExcerpt, postLink, featuredImageUrl]
	);

	const sortedMessages = useMemo(() => {
		if (!messages || messages.length === 0) {
			return [];
		}
		return [...messages].sort((a, b) => {
			const timeA = a.scheduled_time
				? new Date(a.scheduled_time).getTime()
				: 0;
			const timeB = b.scheduled_time
				? new Date(b.scheduled_time).getTime()
				: 0;
			return timeA - timeB;
		});
	}, [messages]);

	const normalizedDrafts = useMemo(() => {
		if (
			!drafts?.selectedPlatforms ||
			drafts.selectedPlatforms.length === 0
		) {
			return [];
		}
		const platformData = drafts.platformData || {};
		return drafts.selectedPlatforms
			.map((platform) => {
				const data = platformData[platform] || {};
				return {
					platform,
					text: data.text || '',
					imageId: data.imageId || null,
					imageUrl: data.imageUrl || '',
					scheduledTime: drafts.scheduledTime || '',
				};
			})
			.filter((d) => d.text.trim().length > 0);
	}, [drafts]);

	const hasMessages = sortedMessages.length > 0;
	const hasDrafts = normalizedDrafts.length > 0;
	const hasContent = hasMessages || hasDrafts;

	const modalTitle = useMemo(() => {
		if (postTitle) {
			return `Social Schedule: "${postTitle}"`;
		}
		return __('Social Schedule', 'prc-social');
	}, [postTitle]);

	const pubDateLabel = useMemo(() => {
		if (postStatus === 'future') {
			return __('Scheduled Pub Date:', 'prc-social');
		}
		if (postStatus === 'publish') {
			return __('Published:', 'prc-social');
		}
		return __('Pub Date:', 'prc-social');
	}, [postStatus]);

	return (
		<Modal title={modalTitle} onRequestClose={onClose}>
			<ModalInner>
				{loading && (
					<p>
						{__('Loading…', 'prc-social')} <Spinner />
					</p>
				)}
				{!loading && pubDate && (
					<PubDateBanner>
						<PubDateLabel>{pubDateLabel}</PubDateLabel>
						{pubDate.toLocaleString()}
					</PubDateBanner>
				)}
				{!loading && !hasContent && (
					<p>
						{__(
							'No social messages or drafts found.',
							'prc-social'
						)}
					</p>
				)}
				{!loading && hasDrafts && (
					<>
						<SectionHeading>
							{__('Drafts', 'prc-social')}
						</SectionHeading>
						<DraftsList
							drafts={normalizedDrafts}
							pubDate={pubDate}
							previewProps={previewProps}
						/>
					</>
				)}
				{!loading && hasMessages && (
					<>
						{hasDrafts && (
							<SectionHeading>
								{__('Sent & Scheduled', 'prc-social')}
							</SectionHeading>
						)}
						<MessagesList
							messages={sortedMessages}
							pubDate={pubDate}
							previewProps={previewProps}
						/>
					</>
				)}
			</ModalInner>
		</Modal>
	);
}
