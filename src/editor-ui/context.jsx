/**
 * Social Images Context Provider
 *
 * Manages social images state using the art direction social image as source
 * (with featured image as fallback) and stores generated images in prc_social_images post meta.
 */

/**
 * WordPress Dependencies
 */
import {
	useContext,
	useMemo,
	useCallback,
	createContext,
} from '@wordpress/element';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';

const socialContext = createContext();

/**
 * Hook to provide social images context functionality.
 *
 * @return {Object} Social images context value.
 */
const useSocialContextProvider = () => {
	const { postId, postType } = useSelect((select) => {
		return {
			postId: select(editorStore).getCurrentPostId(),
			postType: select(editorStore).getCurrentPostType(),
		};
	}, []);

	// Get featured image data from core
	const { featuredImageId, featuredImageUrl, postTitle, postSlug } =
		useSelect((select) => {
			const editor = select(editorStore);
			const featuredId = editor.getEditedPostAttribute('featured_media');
			let imageUrl = null;

			if (featuredId) {
				const media = select('core').getMedia(featuredId, {
					context: 'view',
				});
				// Use the full size URL for poster generation
				imageUrl =
					media?.source_url ||
					media?.media_details?.sizes?.full?.source_url ||
					null;
			}

			return {
				featuredImageId: featuredId,
				featuredImageUrl: imageUrl,
				postTitle: editor.getEditedPostAttribute('title'),
				postSlug:
					editor.getEditedPostAttribute('slug') ||
					`post-${editor.getCurrentPostId()}`,
			};
		}, []);

	// Use the REST field 'social_images' via useEntityProp
	const [socialImages, setSocialImages] = useEntityProp(
		'postType',
		postType,
		'social_images',
		postId
	);

	// Get art direction data via useEntityProp (same pattern as prc-art-direction)
	const [artDirection] = useEntityProp(
		'postType',
		postType,
		'art_direction',
		postId
	);

	/**
	 * Get the art direction social image URL (primary source for poster generation).
	 * Uses rawUrl for full resolution.
	 */
	const artDirectionSocialUrl = useMemo(() => {
		return artDirection?.social?.rawUrl || null;
	}, [artDirection]);

	/**
	 * Check if we have an art direction social image available.
	 */
	const hasArtDirectionSocial = useMemo(() => {
		return !!artDirectionSocialUrl;
	}, [artDirectionSocialUrl]);

	/**
	 * Check if we have a featured image available (fallback).
	 */
	const hasFeaturedImage = useMemo(() => {
		return !!featuredImageUrl;
	}, [featuredImageUrl]);

	/**
	 * Check if we have any source image available (art direction social or featured image).
	 */
	const hasSourceImage = useMemo(() => {
		return hasArtDirectionSocial || hasFeaturedImage;
	}, [hasArtDirectionSocial, hasFeaturedImage]);

	/**
	 * Get social image data for a specific platform.
	 *
	 * @param {string} platform - The platform key (e.g., 'instagram', 'twitter').
	 * @return {Object|null} The platform image data or null.
	 */
	const getPlatformImage = useCallback(
		(platform) => {
			return socialImages?.[platform] || null;
		},
		[socialImages]
	);

	/**
	 * Set social image data for a specific platform.
	 *
	 * @param {string} platform  - The platform key.
	 * @param {Object} imageData - The image data object with id, url, width, height, etc.
	 */
	const setPlatformImage = useCallback(
		(platform, imageData) => {
			const currentSocialImages = socialImages || {};
			setSocialImages({
				...currentSocialImages,
				[platform]: imageData,
			});
		},
		[socialImages, setSocialImages]
	);

	/**
	 * Check if a platform has a generated image.
	 *
	 * @param {string} platform - The platform key.
	 * @return {boolean} Whether the platform has an image.
	 */
	const hasPlatformImage = useCallback(
		(platform) => {
			return !!socialImages?.[platform]?.id;
		},
		[socialImages]
	);

	/**
	 * Clear social image for a specific platform.
	 *
	 * @param {string} platform - The platform key.
	 */
	const clearPlatformImage = useCallback(
		(platform) => {
			if (!socialImages) {
				return;
			}
			const { [platform]: removed, ...rest } = socialImages;
			setSocialImages(Object.keys(rest).length > 0 ? rest : null);
		},
		[socialImages, setSocialImages]
	);

	/**
	 * Get the source image URL for a specific platform.
	 * Priority: 1) Platform-specific override, 2) Art direction social image, 3) Featured image.
	 *
	 * @param {string} platform - The platform key.
	 * @return {string|null} The source image URL or null.
	 */
	const getSourceImageUrl = useCallback(
		(platform) => {
			// First priority: platform-specific source override
			const override = socialImages?.[platform]?.sourceOverride;
			if (override?.url) {
				return override.url;
			}
			// Second priority: art direction social image
			if (artDirectionSocialUrl) {
				return artDirectionSocialUrl;
			}
			// Fallback: featured image
			return featuredImageUrl;
		},
		[socialImages, artDirectionSocialUrl, featuredImageUrl]
	);

	/**
	 * Check if a platform has a source image override.
	 *
	 * @param {string} platform - The platform key.
	 * @return {boolean} Whether the platform has a source override.
	 */
	const hasSourceOverride = useCallback(
		(platform) => {
			return !!socialImages?.[platform]?.sourceOverride?.id;
		},
		[socialImages]
	);

	/**
	 * Set source image override for a specific platform.
	 *
	 * @param {string} platform  - The platform key.
	 * @param {Object} imageData - The override image data with id and url.
	 */
	const setSourceOverride = useCallback(
		(platform, imageData) => {
			const currentSocialImages = socialImages || {};
			const currentPlatformData = currentSocialImages[platform] || {};
			setSocialImages({
				...currentSocialImages,
				[platform]: {
					...currentPlatformData,
					sourceOverride: {
						id: imageData.id,
						url: imageData.url,
					},
				},
			});
		},
		[socialImages, setSocialImages]
	);

	/**
	 * Clear source image override for a specific platform (revert to art direction social or featured image).
	 *
	 * @param {string} platform - The platform key.
	 */
	const clearSourceOverride = useCallback(
		(platform) => {
			if (!socialImages?.[platform]?.sourceOverride) {
				return;
			}
			const currentSocialImages = { ...socialImages };
			const { sourceOverride, ...restPlatformData } =
				currentSocialImages[platform];
			currentSocialImages[platform] = restPlatformData;
			setSocialImages(currentSocialImages);
		},
		[socialImages, setSocialImages]
	);

	return {
		postId,
		postType,
		postTitle,
		postSlug,
		// Art direction social image as primary source
		artDirectionSocialUrl,
		hasArtDirectionSocial,
		// Featured image as fallback source
		featuredImageId,
		featuredImageUrl,
		hasFeaturedImage,
		// Combined source availability check
		hasSourceImage,
		// Social images state
		socialImages: socialImages || {},
		getPlatformImage,
		setPlatformImage,
		hasPlatformImage,
		clearPlatformImage,
		// Source image override
		getSourceImageUrl,
		hasSourceOverride,
		setSourceOverride,
		clearSourceOverride,
	};
};

/**
 * Custom hook to access the social context.
 *
 * @return {Object} Social context value.
 */
const useSocial = () => useContext(socialContext);

/**
 * Social context provider component.
 *
 * @param {Object} props          - Component props.
 * @param {*}      props.children - Child components.
 * @return {JSX.Element} Provider component.
 */
function ProvideSocial({ children }) {
	const provider = useSocialContextProvider();

	return (
		<socialContext.Provider value={provider}>
			{children}
		</socialContext.Provider>
	);
}

export { ProvideSocial, useSocial };
export default ProvideSocial;
