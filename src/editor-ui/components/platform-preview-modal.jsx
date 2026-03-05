/**
 * Platform preview modal component.
 *
 * @package PRC Social
 */

/**
 * External Dependencies
 */
import { SocialPreview } from '@prc/components';

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { Modal } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';

/**
 * Internal Dependencies
 */
import { PLATFORMS } from '../constants';

/**
 * Platform preview modal component.
 *
 * Renders a SocialPreview for a single platform inside a modal, showing
 * how the drafted message will look when published.
 *
 * @param {Object}   props             Component props.
 * @param {string}   props.platformKey The platform key (twitter, facebook, etc.).
 * @param {string}   props.text        The drafted message text.
 * @param {string}   props.imageUrl    Optional attached image URL.
 * @param {Function} props.onClose     Callback to close the modal.
 */
export default function PlatformPreviewModal({
	platformKey,
	text,
	imageUrl,
	onClose,
}) {
	const { postTitle, postExcerpt, postLink, featuredImageUrl } = useSelect(
		(select) => {
			const editor = select(editorStore);
			const featuredId = editor.getEditedPostAttribute('featured_media');
			let featImgUrl = null;
			if (featuredId) {
				const media = select('core').getMedia(featuredId, {
					context: 'view',
				});
				featImgUrl =
					media?.source_url ||
					media?.media_details?.sizes?.full?.source_url ||
					null;
			}
			return {
				postTitle: editor.getEditedPostAttribute('title') || '',
				postExcerpt: editor.getEditedPostAttribute('excerpt') || '',
				postLink: editor.getPermalink() || '',
				featuredImageUrl: featImgUrl,
			};
		},
		[]
	);

	// Platform-specific text prop name.
	const textPropMap = {
		twitter: 'tweetText',
		facebook: 'postText',
		bluesky: 'postText',
		threads: 'postText',
	};

	const previewImage = imageUrl || featuredImageUrl || '';
	const textPropName = textPropMap[platformKey] || 'postText';

	return (
		<Modal
			title={`${PLATFORMS[platformKey]?.name || platformKey} ${__('Preview', 'prc-social')}`}
			onRequestClose={onClose}
			shouldCloseOnEsc
			shouldCloseOnClickOutside
			style={{ width: '600px', maxWidth: '95vw' }}
		>
			<SocialPreview
				networks={[platformKey]}
				title={postTitle}
				description={postExcerpt}
				url={postLink}
				image={previewImage}
				{...{ [textPropName]: text }}
			/>
		</Modal>
	);
}
