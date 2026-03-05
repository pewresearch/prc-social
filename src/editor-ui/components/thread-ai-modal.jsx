/**
 * AI thread generation modal.
 *
 * Calls the prc-social/generate-thread ability to generate a thread of 2-4
 * messages from the article content, then lets the user accept/reject
 * individual messages before applying them.
 *
 * @package PRC Social
 */

/**
 * External Dependencies
 */
import {
	useAISuggest,
	AISuggestModal,
} from '@prc/components';

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	Button,
	CheckboxControl,
	__experimentalText as Text,
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
} from '@wordpress/components';
import { useState, useCallback, useMemo, useEffect } from '@wordpress/element';

/**
 * Internal Dependencies
 */
import { PLATFORMS } from '../constants';

/**
 * Thread AI modal component.
 *
 * @param {Object}   props
 * @param {string}   props.platformKey  The platform to generate a thread for.
 * @param {number}   props.postId       Current editor post ID.
 * @param {Function} props.onApply      Callback receiving the accepted messages array.
 * @param {Function} props.onClose      Callback to close the modal.
 */
export default function ThreadAIModal({
	platformKey,
	postId,
	onApply,
	onClose,
}) {
	const [acceptedIndices, setAcceptedIndices] = useState(new Set());

	const { isLoading, error, result, fetch, reset, dismissError } =
		useAISuggest({
			abilityName: 'prc-social/generate-thread',
			transformResult: (raw) => {
				if (Array.isArray(raw.messages)) {
					return raw.messages.map((msg, idx) => ({
						id: idx,
						text: msg.text || '',
					}));
				}
				return [];
			},
		});

	const threadMessages = useMemo(() => result || [], [result]);

	// Auto-accept all messages when results arrive.
	useEffect(() => {
		if (threadMessages.length > 0 && !isLoading) {
			setAcceptedIndices(
				new Set(threadMessages.map((_, idx) => idx))
			);
		}
	}, [threadMessages, isLoading]);

	// Kick off the fetch when the modal mounts.
	useEffect(() => {
		if (platformKey) {
			fetch({
				postId,
				platform: platformKey,
				maxMessages: 4,
			});
		}
		// Only run on mount.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleToggleMessage = useCallback(
		(idx) => {
			setAcceptedIndices((prev) => {
				const next = new Set(prev);
				if (next.has(idx)) {
					next.delete(idx);
				} else {
					next.add(idx);
				}
				return next;
			});
		},
		[]
	);

	const handleRegenerate = useCallback(() => {
		reset();
		setAcceptedIndices(new Set());
		fetch({
			postId,
			platform: platformKey,
			maxMessages: 4,
		});
	}, [reset, fetch, postId, platformKey]);

	const handleApply = useCallback(() => {
		const accepted = threadMessages
			.filter((_, idx) => acceptedIndices.has(idx))
			.map((msg) => ({
				text: msg.text,
				imageId: null,
				imageUrl: '',
			}));
		if (accepted.length > 0) {
			onApply(accepted);
		}
		reset();
		onClose();
	}, [threadMessages, acceptedIndices, onApply, onClose, reset]);

	const handleClose = useCallback(() => {
		reset();
		onClose();
	}, [reset, onClose]);

	const acceptedCount = acceptedIndices.size;
	const platformName = PLATFORMS[platformKey]?.name || platformKey;

	return (
		<AISuggestModal
			title={`${__('AI Thread for', 'prc-social')} ${platformName}`}
			isOpen
			onClose={handleClose}
			isLoading={isLoading}
			loadingMessage={__('Generating thread…', 'prc-social')}
			error={error}
			onDismissError={dismissError}
			footer={
				threadMessages.length > 0 ? (
					<HStack alignment="right" spacing={2}>
						<Button variant="tertiary" onClick={handleRegenerate}>
							{__('Regenerate', 'prc-social')}
						</Button>
						<Button variant="tertiary" onClick={handleClose}>
							{__('Cancel', 'prc-social')}
						</Button>
						<Button
							variant="primary"
							onClick={handleApply}
							disabled={acceptedCount === 0}
						>
							{acceptedCount === threadMessages.length
								? __('Use Thread', 'prc-social')
								: `${__('Use', 'prc-social')} ${acceptedCount} ${__('messages', 'prc-social')}`}
						</Button>
					</HStack>
				) : null
			}
		>
			{threadMessages.length > 0 && (
				<VStack spacing={3}>
					<Text
						size={13}
						style={{ color: '#666', marginTop: 0 }}
					>
						{__(
							'Review the generated thread. Uncheck messages you want to exclude:',
							'prc-social'
						)}
					</Text>
					{threadMessages.map((msg, idx) => {
						const isAccepted = acceptedIndices.has(idx);
						const charCount = msg.text.length;
						const charLimit =
							PLATFORMS[platformKey]?.charLimit || 280;
						const isOverLimit = charCount > charLimit;

						return (
							<div
								key={msg.id}
								style={{
									padding: '12px',
									border: `1px solid ${isAccepted ? '#007cba' : '#ddd'}`,
									borderRadius: '4px',
									background: isAccepted
										? '#f0f7fc'
										: '#fafafa',
									opacity: isAccepted ? 1 : 0.6,
								}}
							>
								<HStack alignment="spaceBetween">
									<CheckboxControl
										label={`${__('Message', 'prc-social')} ${idx + 1}/${threadMessages.length}`}
										checked={isAccepted}
										onChange={() =>
											handleToggleMessage(idx)
										}
										__nextHasNoMarginBottom
									/>
									<Text
										size={11}
										style={{
											color: isOverLimit
												? '#EF4444'
												: '#666',
										}}
									>
										{charCount} / {charLimit}
									</Text>
								</HStack>
								<Text
									size={13}
									style={{
										lineHeight: '1.5',
										marginTop: '8px',
										display: 'block',
									}}
								>
									{msg.text}
								</Text>
							</div>
						);
					})}
				</VStack>
			)}
		</AISuggestModal>
	);
}
