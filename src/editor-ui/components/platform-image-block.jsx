/**
 * Platform image preview with change/remove controls.
 *
 * @package PRC Social
 */

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { closeSmall } from '@wordpress/icons';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';

/**
 * Internal Dependencies
 */
import { ImagePreview, RemoveImageButton } from '../styled';

/**
 * Renders image preview with change/remove controls for a platform.
 *
 * @param {Object}   root0               - Component props.
 * @param {Object}   root0.data          - Platform image data (imageId, imageUrl).
 * @param {Function} root0.onImageSelect - Callback when image is selected.
 * @param {Function} root0.onImageRemove - Callback to remove image.
 */
export default function PlatformImageBlock({
	data,
	onImageSelect,
	onImageRemove,
}) {
	return (
		<ImagePreview>
			<MediaUploadCheck>
				<MediaUpload
					onSelect={onImageSelect}
					allowedTypes={['image']}
					value={data.imageId}
					render={({ open }) => (
						<button
							type="button"
							className="image-preview-button"
							style={{
								all: 'unset',
								cursor: 'pointer',
								display: 'block',
							}}
							onClick={open}
							aria-label={__(
								'Change selected image',
								'prc-social'
							)}
						>
							<img
								src={data.imageUrl}
								alt={__('Selected image', 'prc-social')}
							/>
						</button>
					)}
				/>
			</MediaUploadCheck>
			<RemoveImageButton
				icon={closeSmall}
				onClick={onImageRemove}
				size="small"
				label={__('Remove image', 'prc-social')}
			/>
		</ImagePreview>
	);
}
