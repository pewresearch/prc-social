/**
 * Social Image Generator (PRC integration)
 *
 * Exports the modal wrapper that connects SocialImageGenerator to useSocial()
 * and PRC-specific config (logo, fonts, platform sizes).
 */

export { default as SocialImageGeneratorModal } from './social-image-generator-modal';
export {
	PRC_FONT_FAMILY_OPTIONS,
	PRC_PLATFORM_SIZES,
	logoWhiteSvg,
} from './prc-poster-config';
