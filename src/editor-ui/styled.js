/**
 * Styled-component definitions for the Social Scheduler.
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
import { Button } from '@wordpress/components';

/**
 * Internal Dependencies
 */
import { STATUS_COLORS } from './constants';

/**
 * @param {Object} props        Component props.
 * @param {string} props.status The status of the post.
 * @return {JSX.Element} The styled component.
 */
export const StatusIndicator = styled.span`
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background-color: ${(props) => STATUS_COLORS[props.status] || '#999'};
	margin-right: 8px;
	flex-shrink: 0;
`;

export const ScheduledPostItem = styled.div`
	display: flex;
	align-items: flex-start;
	padding: 12px;
	border: 1px solid #ddd;
	border-radius: 4px;
	margin-bottom: 8px;
	background: #fafafa;
`;

export const PostContent = styled.div`
	flex: 1;
	min-width: 0;
`;

export const PostText = styled.p`
	margin: 0 0 4px 0;
	font-size: 13px;
	word-break: break-word;
`;

export const PostMeta = styled.div`
	font-size: 11px;
	color: #666;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
`;

export const PostThumbnail = styled.img`
	width: 40px;
	height: 40px;
	object-fit: cover;
	border-radius: 4px;
	border: 1px solid #ddd;
	margin-right: 8px;
	flex-shrink: 0;
`;

export const PlatformBadge = styled.span`
	display: inline-block;
	background: #e0e0e0;
	padding: 2px 6px;
	border-radius: 3px;
	font-size: 11px;
	text-transform: capitalize;
`;

export const CharacterCount = styled.span`
	font-size: 12px;
	color: ${(props) => (props.isOverLimit ? '#EF4444' : '#666')};
	margin-left: 8px;
`;

export const DateTimePickerWrapper = styled.div`
	.components-datetime {
		padding: 1em;
	}
`;

export const PlatformSection = styled.div`
	border: 1px solid #ddd;
	border-radius: 4px;
	padding: 12px;
	margin-bottom: 12px;
	background: #fafafa;
`;

export const ImagePreview = styled.div`
	position: relative;
	display: inline-block;
	margin-top: 8px;

	img {
		max-width: 100%;
		max-height: 120px;
		border-radius: 4px;
		border: 1px solid #ddd;
		cursor: pointer;
	}
`;

export const RemoveImageButton = styled(Button)`
	position: absolute;
	top: -8px;
	right: -8px;
	background: #fff;
	border-radius: 50%;
	padding: 0;
	min-width: 24px;
	width: 24px;
	height: 24px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

	&:hover {
		background: #f0f0f0;
	}
`;
