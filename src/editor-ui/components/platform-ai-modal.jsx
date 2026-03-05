/**
 * AI message generation modal for a single platform.
 *
 * @package PRC Social
 */

/**
 * External Dependencies
 */
import {
	useAISuggest,
	AISuggestModal,
	AISuggestionsList,
} from '@prc/components';

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { useState, useCallback, useMemo, useEffect } from '@wordpress/element';

/**
 * Internal Dependencies
 */
import { PLATFORMS } from '../constants';

/**
 * AI message generation modal extracted from PerNetworkPostEditor
 * to keep each component under the max-lines-per-function limit.
 *
 * @param {Object}   props
 * @param {string}   props.platformKey The platform this modal generates for.
 * @param {number}   props.postId      Current editor post ID.
 * @param {Function} props.onSelect    Callback receiving the chosen text.
 * @param {Function} props.onClose     Callback to close the modal.
 */
export default function PlatformAIModal({
	platformKey,
	postId,
	onSelect,
	onClose,
}) {
	const [selectedIds, setSelectedIds] = useState(new Set());

	const { isLoading, error, result, fetch, reset, dismissError } =
		useAISuggest({
			abilityName: 'prc-social/generate-message',
			transformResult: (raw) => {
				if (Array.isArray(raw.options)) {
					return raw.options.map((text, idx) => ({
						id: idx,
						text,
					}));
				}
				if (raw.generatedText) {
					return [{ id: 0, text: raw.generatedText }];
				}
				return [];
			},
		});

	const options = useMemo(() => result || [], [result]);

	// Auto-select the first option when results arrive.
	useEffect(() => {
		if (options.length > 0 && !isLoading) {
			setSelectedIds(new Set([options[0].id]));
		}
	}, [options, isLoading]);

	// Kick off the fetch when the modal mounts.
	useEffect(() => {
		if (platformKey) {
			const charLimit = PLATFORMS[platformKey]?.charLimit;
			fetch({ postId, maxCharacters: charLimit });
		}
		// Only run on mount (platformKey won't change while open).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleApply = useCallback(() => {
		let selectedText = '';
		if (options.length === 1) {
			selectedText = options[0].text;
		} else {
			const selected = options.find((opt) => selectedIds.has(opt.id));
			if (selected) {
				selectedText = selected.text;
			}
		}
		if (selectedText) {
			onSelect(selectedText);
		}
		reset();
		onClose();
	}, [options, selectedIds, onSelect, onClose, reset]);

	const handleClose = useCallback(() => {
		reset();
		onClose();
	}, [reset, onClose]);

	return (
		<AISuggestModal
			title={__('AI Generated Messages', 'prc-social')}
			isOpen
			onClose={handleClose}
			isLoading={isLoading}
			loadingMessage={__('Generating message options…', 'prc-social')}
			error={error}
			onDismissError={dismissError}
			footer={
				options.length > 0 ? (
					<>
						<Button variant="tertiary" onClick={handleClose}>
							{__('Cancel', 'prc-social')}
						</Button>
						<Button
							variant="primary"
							onClick={handleApply}
							disabled={selectedIds.size === 0}
						>
							{__('Use Selected', 'prc-social')}
						</Button>
					</>
				) : null
			}
		>
			{options.length > 0 && (
				<>
					<p
						style={{
							color: '#666',
							fontSize: '13px',
							marginTop: 0,
						}}
					>
						{__('Select a message to use:', 'prc-social')}
					</p>
					<AISuggestionsList
						suggestions={options}
						selectedIds={selectedIds}
						onToggle={(id) => {
							setSelectedIds(new Set([id]));
						}}
						getId={(opt) => opt.id}
						renderItem={(opt) => (
							<span
								style={{
									fontSize: '13px',
									lineHeight: '1.5',
								}}
							>
								{opt.text}
							</span>
						)}
					/>
				</>
			)}
		</AISuggestModal>
	);
}
