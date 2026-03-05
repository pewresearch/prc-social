/**
 * PRC-specific configuration for the Social Image Generator.
 * Merges default platform sizes with PRC brand fonts and provides the logo asset.
 */

import { DEFAULT_PLATFORM_SIZES } from '@prc/components';

import logoWhiteSvg from '../assets/logo-white.svg';

/**
 * PRC brand font family options (Georgia, Franklin Gothic URW, Abril Text).
 */
export const PRC_FONT_FAMILY_OPTIONS = [
	{
		label: 'Georgia (Default)',
		value: "Georgia, 'Times New Roman', Times, serif",
	},
	{
		label: 'Franklin Gothic URW',
		value: "'franklin-gothic-urw', Verdana, Geneva, sans-serif",
	},
	{
		label: 'Abril Text',
		value: "'abril-text', Georgia, 'Times New Roman', Times, serif",
	},
];

/**
 * Default PRC title font (Georgia).
 */
const PRC_DEFAULT_FONT = "Georgia, 'Times New Roman', Times, serif";

/**
 * Merge default platform sizes with PRC title font family.
 *
 * @param {Object} sizes      - Platform sizes from @prc/components.
 * @param {string} fontFamily - Font family string for title.
 * @return {Object} Merged platform sizes.
 */
function mergeFontFamily(sizes, fontFamily) {
	const out = {};
	for (const [key, config] of Object.entries(sizes)) {
		out[key] = {
			...config,
			layout: {
				...config.layout,
				title: {
					...config.layout.title,
					fontFamily,
				},
			},
		};
	}
	return out;
}

/**
 * Platform sizes with PRC brand default font.
 */
export const PRC_PLATFORM_SIZES = mergeFontFamily(
	DEFAULT_PLATFORM_SIZES,
	PRC_DEFAULT_FONT
);

/**
 * Logo asset URL for canvas rendering (PRC white logo).
 */
export { logoWhiteSvg };
