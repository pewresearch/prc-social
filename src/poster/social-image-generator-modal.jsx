/**
 * Social Image Generator Modal
 *
 * PRC-specific modal that wraps SocialImageGenerator with useSocial() context,
 * PRC logo, fonts, platform sizes, and media library upload.
 */

/**
 * WordPress Dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { Modal } from '@wordpress/components';
import { useCallback, useMemo } from '@wordpress/element';
import { uploadMedia } from '@wordpress/media-utils';

/**
 * External Dependencies
 */
import { SocialImageGenerator } from '@prc/components';

/**
 * Internal Dependencies
 */
import { useSocial } from '../editor-ui/context';
import {
	logoWhiteSvg,
	PRC_FONT_FAMILY_OPTIONS,
	PRC_PLATFORM_SIZES,
} from './prc-poster-config';

/**
 * Modal wrapper for the Social Image Generator with PRC context and config.
 *
 * @param {Object}   props                - Component props.
 * @param {string}   props.platformKey    - Platform key (e.g. 'twitter', 'instagram').
 * @param {string}   [props.platformName] - Display name for modal title (e.g. 'Twitter / X').
 * @param {Function} props.onGenerated    - Callback when image is generated and uploaded; receives { id, url, rawUrl, ... }.
 * @param {Function} props.onClose        - Callback to close the modal.
 */
export default function SocialImageGeneratorModal({
	platformKey,
	platformName,
	onGenerated,
	onClose,
}) {
	const {
		postId,
		postTitle,
		getSourceImageUrl,
		hasSourceOverride,
		setSourceOverride,
		clearSourceOverride,
		setPlatformImage,
	} = useSocial();

	const sourceImageUrl = useMemo(
		() => getSourceImageUrl(platformKey),
		[getSourceImageUrl, platformKey]
	);

	const hasOverride = useMemo(
		() => hasSourceOverride(platformKey),
		[hasSourceOverride, platformKey]
	);

	const handleSelectOverride = useCallback(
		(imageData) => setSourceOverride(platformKey, imageData),
		[setSourceOverride, platformKey]
	);

	const handleClearOverride = useCallback(
		() => clearSourceOverride(platformKey),
		[clearSourceOverride, platformKey]
	);

	const platformConfig = PRC_PLATFORM_SIZES[platformKey];

	const handleGenerate = useCallback(
		async ({ file, platformType }) => {
			const config = PRC_PLATFORM_SIZES[platformType];
			if (!config) return;

			uploadMedia({
				allowedTypes: ['image'],
				filesList: [file],
				additionalData: { post: postId },
				onFileChange: ([image]) => {
					if (image?.id) {
						const posterData = {
							id: image.id,
							rawUrl: image.url,
							url: image.url,
							width: config.width,
							height: config.height,
							caption: '',
							chartArt: false,
						};
						setPlatformImage(platformType, posterData);
						onGenerated?.(posterData);
						onClose?.();
					}
				},
				onError: () => {
					// Error state could be surfaced via context or local state
				},
			});
		},
		[postId, setPlatformImage, onGenerated, onClose]
	);

	if (!platformConfig) {
		return null;
	}

	const title = sprintf(
		/* translators: %s: platform name (e.g. Twitter, Facebook) */
		__('Generate %s Image', 'prc-social'),
		platformName || platformConfig?.name || platformKey
	);

	return (
		<Modal
			title={title}
			onRequestClose={onClose}
			shouldCloseOnEsc={true}
			shouldCloseOnClickOutside={true}
			className="prc-social__poster-modal"
			style={{ width: '900px', maxWidth: '95vw' }}
		>
			<SocialImageGenerator
				platformType={platformKey}
				sourceImageUrl={sourceImageUrl}
				title={postTitle || ''}
				logoSrc={logoWhiteSvg}
				platformSizes={PRC_PLATFORM_SIZES}
				fontFamilyOptions={PRC_FONT_FAMILY_OPTIONS}
				onGenerate={handleGenerate}
				onSourceImageSelect={handleSelectOverride}
				onSourceImageClear={handleClearOverride}
				hasSourceOverride={hasOverride}
			/>
		</Modal>
	);
}
