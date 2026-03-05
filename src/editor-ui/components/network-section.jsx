/* eslint-disable max-lines-per-function */
/**
 * Network section: one toggle per platform with editing UI inline below when enabled.
 *
 * Each platform now has its own ScheduleDateTime and supports multiple messages
 * (threads) with add/remove/reorder controls.
 *
 * @package
 */

/**
 * External Dependencies
 */
import { AISuggestButton as AISuggestButtonComponent } from '@prc/components';

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	Button,
	ToggleControl,
	TextareaControl,
	__experimentalText as Text,
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
} from '@wordpress/components';
import { useState, useCallback } from '@wordpress/element';
import {
	image as imageIcon,
	seen,
	create,
	trash,
	chevronUp,
	chevronDown,
	plus,
} from '@wordpress/icons';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';

/**
 * Internal Dependencies
 */
import { PLATFORMS, isAIEnabled, EMPTY_MESSAGE } from '../constants';
import { CharacterCount, PlatformSection } from '../styled';
import PlatformImageBlock from './platform-image-block';
import PlatformPreviewModal from './platform-preview-modal';
import PlatformAIModal from './platform-ai-modal';
import ThreadAIModal from './thread-ai-modal';
import ScheduleDateTime from './schedule-date-time';
import { SocialImageGeneratorModal } from '../../poster';

/**
 * Network section component.
 *
 * @param {Object}   props                       Component props.
 * @param {Array}    props.selectedPlatforms     Selected platform keys.
 * @param {Function} props.onTogglePlatform      Callback when platform selection changes.
 * @param {Object}   props.platformData          Per-platform draft data (new shape).
 * @param {Function} props.onScheduledTimeChange Callback for per-platform schedule time.
 * @param {Function} props.onMessageChange       Callback to update a single message.
 * @param {Function} props.onAddMessage          Callback to add a message to thread.
 * @param {Function} props.onRemoveMessage       Callback to remove a message from thread.
 * @param {Function} props.onSetMessages         Callback to replace all messages for a platform.
 * @param {number}   props.postId                Current post ID.
 * @param {string}   props.postDate              ISO date string of the post's publication date.
 * @return {JSX.Element} Network section component.
 */
export default function NetworkSection({
	selectedPlatforms,
	onTogglePlatform,
	platformData,
	onScheduledTimeChange,
	onMessageChange,
	onAddMessage,
	onRemoveMessage,
	onSetMessages,
	postId,
	postDate,
}) {
	const [aiModalPlatform, setAiModalPlatform] = useState(null);
	const [aiModalMsgIndex, setAiModalMsgIndex] = useState(0);
	const [threadAiPlatform, setThreadAiPlatform] = useState(null);
	const [previewPlatform, setPreviewPlatform] = useState(null);
	const [posterModalPlatform, setPosterModalPlatform] = useState(null);
	const [posterModalMsgIndex, setPosterModalMsgIndex] = useState(0);

	const handleToggle = useCallback(
		(platformKey) => {
			if (selectedPlatforms.includes(platformKey)) {
				onTogglePlatform(
					selectedPlatforms.filter((p) => p !== platformKey)
				);
			} else {
				onTogglePlatform([...selectedPlatforms, platformKey]);
			}
		},
		[selectedPlatforms, onTogglePlatform]
	);

	/**
	 * Swap two messages in a platform to reorder.
	 */
	const handleReorder = useCallback(
		(platformKey, fromIndex, toIndex) => {
			const pd = platformData[platformKey];
			if (!pd || !Array.isArray(pd.messages)) {
				return;
			}
			if (
				toIndex < 0 ||
				toIndex >= pd.messages.length ||
				fromIndex === toIndex
			) {
				return;
			}
			const newMessages = [...pd.messages];
			const temp = newMessages[fromIndex];
			newMessages[fromIndex] = newMessages[toIndex];
			newMessages[toIndex] = temp;
			onSetMessages(platformKey, newMessages);
		},
		[platformData, onSetMessages]
	);

	return (
		<>
			<VStack spacing={0}>
				{Object.values(PLATFORMS).map((platform) => {
					const platformKey = platform.key;
					const isSelected = selectedPlatforms.includes(platformKey);
					const pd = platformData[platformKey] || {
						scheduledTime: '',
						messages: [{ ...EMPTY_MESSAGE }],
					};
					const messages = pd.messages || [{ ...EMPTY_MESSAGE }];
					const charLimit = platform.charLimit;

					return (
						<PlatformSection key={platformKey}>
							<ToggleControl
								label={platform.name}
								checked={isSelected}
								onChange={() => handleToggle(platformKey)}
							/>
							{isSelected && (
								<VStack
									spacing={3}
									style={{ marginTop: '8px' }}
								>
									{/* Per-platform schedule time */}
									<ScheduleDateTime
										value={pd.scheduledTime}
										onChange={(time) =>
											onScheduledTimeChange(
												platformKey,
												time
											)
										}
										postDate={postDate}
									/>

									{/* Messages (thread) */}
									{messages.map((msg, msgIndex) => {
										const charCount = (msg.text || '')
											.length;
										const isOverLimit =
											charCount > charLimit;
										const isThread = messages.length > 1;
										const label = isThread
											? `${msgIndex + 1}/${messages.length}`
											: null;

										return (
											<VStack
												key={msgIndex}
												spacing={2}
												style={{
													padding: isThread
														? '8px'
														: '0',
													border: isThread
														? '1px solid #e0e0e0'
														: 'none',
													borderRadius: '4px',
													background: isThread
														? '#fff'
														: 'transparent',
												}}
											>
												<HStack alignment="spaceBetween">
													{label && (
														<Text
															size={11}
															weight={600}
															style={{
																color: '#666',
															}}
														>
															{__(
																'Message',
																'prc-social'
															)}{' '}
															{label}
														</Text>
													)}
													<HStack
														alignment="right"
														spacing={1}
													>
														{isThread && (
															<>
																<Button
																	icon={
																		chevronUp
																	}
																	size="small"
																	disabled={
																		msgIndex ===
																		0
																	}
																	onClick={() =>
																		handleReorder(
																			platformKey,
																			msgIndex,
																			msgIndex -
																				1
																		)
																	}
																	label={__(
																		'Move up',
																		'prc-social'
																	)}
																/>
																<Button
																	icon={
																		chevronDown
																	}
																	size="small"
																	disabled={
																		msgIndex ===
																		messages.length -
																			1
																	}
																	onClick={() =>
																		handleReorder(
																			platformKey,
																			msgIndex,
																			msgIndex +
																				1
																		)
																	}
																	label={__(
																		'Move down',
																		'prc-social'
																	)}
																/>
																<Button
																	icon={trash}
																	size="small"
																	isDestructive
																	onClick={() =>
																		onRemoveMessage(
																			platformKey,
																			msgIndex
																		)
																	}
																	label={__(
																		'Remove message',
																		'prc-social'
																	)}
																/>
															</>
														)}
														<CharacterCount
															isOverLimit={
																isOverLimit
															}
														>
															{charCount} /{' '}
															{charLimit}
														</CharacterCount>
													</HStack>
												</HStack>
												<TextareaControl
													value={msg.text || ''}
													onChange={(text) =>
														onMessageChange(
															platformKey,
															msgIndex,
															{ text }
														)
													}
													rows={3}
													placeholder={
														messages.length > 1
															? `${platform.name} message ${msgIndex + 1}…`
															: `Write your ${platform.name} post…`
													}
													__nextHasNoMarginBottom
												/>
												<HStack
													alignment="left"
													style={{
														marginTop: '4px',
													}}
												>
													<MediaUploadCheck>
														<MediaUpload
															onSelect={(media) =>
																onMessageChange(
																	platformKey,
																	msgIndex,
																	{
																		imageId:
																			media.id,
																		imageUrl:
																			media.url,
																	}
																)
															}
															allowedTypes={[
																'image',
															]}
															value={msg.imageId}
															render={({
																open,
															}) => (
																<Button
																	variant="secondary"
																	onClick={
																		open
																	}
																	icon={
																		imageIcon
																	}
																	size="small"
																	label={__(
																		'Select image',
																		'prc-social'
																	)}
																/>
															)}
														/>
													</MediaUploadCheck>
													<Button
														variant="secondary"
														onClick={() => {
															setPosterModalPlatform(
																platformKey
															);
															setPosterModalMsgIndex(
																msgIndex
															);
														}}
														icon={create}
														size="small"
														label={__(
															'Generate image',
															'prc-social'
														)}
													/>
													{msgIndex === 0 && (
														<Button
															variant="secondary"
															onClick={() =>
																setPreviewPlatform(
																	platformKey
																)
															}
															icon={seen}
															size="small"
															label={__(
																'Preview',
																'prc-social'
															)}
														/>
													)}
													{isAIEnabled && (
														<AISuggestButtonComponent
															text={null}
															label={__(
																'Suggest with AI',
																'prc-social'
															)}
															onClick={() => {
																setAiModalPlatform(
																	platformKey
																);
																setAiModalMsgIndex(
																	msgIndex
																);
															}}
															fullWidth={false}
															size="small"
														/>
													)}
												</HStack>
												{msg.imageUrl && (
													<PlatformImageBlock
														data={msg}
														onImageSelect={(
															media
														) =>
															onMessageChange(
																platformKey,
																msgIndex,
																{
																	imageId:
																		media.id,
																	imageUrl:
																		media.url,
																}
															)
														}
														onImageRemove={() =>
															onMessageChange(
																platformKey,
																msgIndex,
																{
																	imageId:
																		null,
																	imageUrl:
																		'',
																}
															)
														}
													/>
												)}
											</VStack>
										);
									})}

									{/* Add message / AI thread buttons */}
									<VStack spacing={2}>
										{messages.length < 4 && (
											<Button
												variant="tertiary"
												icon={plus}
												onClick={() =>
													onAddMessage(platformKey)
												}
												size="small"
											>
												{__(
													'Add message',
													'prc-social'
												)}
											</Button>
										)}
										{isAIEnabled && (
											<Button
												variant="tertiary"
												onClick={() =>
													setThreadAiPlatform(
														platformKey
													)
												}
												size="small"
											>
												{__(
													'Create thread from post',
													'prc-social'
												)}
											</Button>
										)}
									</VStack>
								</VStack>
							)}
						</PlatformSection>
					);
				})}
			</VStack>

			{aiModalPlatform && (
				<PlatformAIModal
					platformKey={aiModalPlatform}
					postId={postId}
					onSelect={(text) => {
						onMessageChange(aiModalPlatform, aiModalMsgIndex, {
							text,
						});
					}}
					onClose={() => setAiModalPlatform(null)}
				/>
			)}

			{previewPlatform && (
				<PlatformPreviewModal
					platformKey={previewPlatform}
					text={
						platformData[previewPlatform]?.messages?.[0]?.text || ''
					}
					imageUrl={
						platformData[previewPlatform]?.messages?.[0]
							?.imageUrl || ''
					}
					onClose={() => setPreviewPlatform(null)}
				/>
			)}

			{posterModalPlatform && (
				<SocialImageGeneratorModal
					platformKey={posterModalPlatform}
					platformName={PLATFORMS[posterModalPlatform]?.name}
					onGenerated={(imageData) => {
						onMessageChange(
							posterModalPlatform,
							posterModalMsgIndex,
							{
								imageId: imageData.id,
								imageUrl: imageData.url || imageData.rawUrl,
							}
						);
					}}
					onClose={() => setPosterModalPlatform(null)}
				/>
			)}

			{threadAiPlatform && (
				<ThreadAIModal
					platformKey={threadAiPlatform}
					postId={postId}
					onApply={(messages) => {
						onSetMessages(threadAiPlatform, messages);
					}}
					onClose={() => setThreadAiPlatform(null)}
				/>
			)}
		</>
	);
}
