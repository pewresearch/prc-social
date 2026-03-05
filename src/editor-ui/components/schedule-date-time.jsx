/**
 * Schedule date/time picker component.
 *
 * @package PRC Social
 */

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	Button,
	DateTimePicker,
	Popover,
	__experimentalText as Text,
} from '@wordpress/components';
import { useState, useMemo } from '@wordpress/element';

/**
 * Internal Dependencies
 */
import { getMinScheduleTimestamp } from '../constants';
import { DateTimePickerWrapper } from '../styled';

/**
 * Schedule date/time picker component.
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.value    ISO date string.
 * @param {Function} props.onChange Change callback.
 * @param {string}   props.postDate ISO date string of the post's publication date.
 * @return {JSX.Element} Schedule picker component.
 */
export default function ScheduleDateTime({ value, onChange, postDate }) {
	const [showPicker, setShowPicker] = useState(false);

	const formattedDate = useMemo(() => {
		if (!value) {
			return __('Select date and time', 'prc-social');
		}
		return new Date(value).toLocaleString();
	}, [value]);

	// Minimum date is 5 minutes from now.
	const minDate = useMemo(
		() => new Date(getMinScheduleTimestamp()).toISOString(),
		[]
	);

	// If the post has a future scheduled date, highlight it on the calendar.
	const calendarEvents = useMemo(() => {
		if (!postDate) {
			return [];
		}
		const pubDate = new Date(postDate);
		if (pubDate.getTime() > Date.now()) {
			return [{ date: pubDate }];
		}
		return [];
	}, [postDate]);

	return (
		<div
			className="hootsuite-schedule-datetime"
			style={{ marginBottom: '16px' }}
		>
			<Text
				weight={600}
				size={12}
				style={{ marginBottom: '8px', display: 'block' }}
			>
				{__('Schedule Time', 'prc-social')}
			</Text>
			<Button
				variant="secondary"
				onClick={() => setShowPicker(!showPicker)}
				style={{ width: '100%', justifyContent: 'center' }}
			>
				{formattedDate}
			</Button>
			{showPicker && (
				<Popover
					onClose={() => setShowPicker(false)}
					placement="bottom-start"
				>
					<DateTimePickerWrapper>
						<DateTimePicker
							currentDate={value || minDate}
							onChange={(newDate) => {
								onChange(newDate);
								setShowPicker(false);
							}}
							is12Hour={true}
							isInvalidDate={(date) =>
								date.getTime() < getMinScheduleTimestamp()
							}
							events={calendarEvents}
						/>
					</DateTimePickerWrapper>
				</Popover>
			)}
		</div>
	);
}
