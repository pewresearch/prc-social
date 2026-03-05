/**
 * Social Messages Context Provider
 *
 * Fetches social_messages and social_message_drafts via the REST API
 * and provides them via React context.
 */

/**
 * WordPress Dependencies
 */
import {
	useState,
	useContext,
	createContext,
	useEffect,
	useMemo,
} from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

const messagesContext = createContext();

/**
 * Internal hook that fetches social messages and drafts for a given post.
 *
 * @param {Object}  params          Hook parameters.
 * @param {string}  params.postId   The post ID.
 * @param {string}  params.postType The post type.
 * @param {boolean} params.enabled  Whether fetching is enabled.
 * @return {Object} Messages context value.
 */
const useProvideMessages = ({ postId, postType, enabled }) => {
	const [postTitle, setPostTitle] = useState('');
	const [postDate, setPostDate] = useState('');
	const [postStatus, setPostStatus] = useState('');
	const [postExcerpt, setPostExcerpt] = useState('');
	const [postLink, setPostLink] = useState('');
	const [featuredImageUrl, setFeaturedImageUrl] = useState('');
	const [messages, setMessages] = useState([]);
	const [drafts, setDrafts] = useState(null);
	const [processing, toggleProcessing] = useState(false);

	useEffect(() => {
		if (true !== enabled || 'number' !== typeof parseInt(postId, 10)) {
			return;
		}
		const pId = parseInt(postId, 10);
		if ('number' === typeof pId && false === processing) {
			toggleProcessing(true);
			apiFetch({
				path: `/wp/v2/${postType}s/${pId}?_fields=title,date,status,excerpt,link,social_messages,social_message_drafts&_embed=wp:featuredmedia`,
			})
				.then((data) => {
					const title =
						data?.title?.rendered || data?.title?.raw || '';
					const socialMessages = data?.social_messages || [];
					const socialDrafts = data?.social_message_drafts || null;
					const featImg =
						data?._embedded?.['wp:featuredmedia']?.[0]
							?.source_url || '';
					setPostTitle(title);
					setPostDate(data?.date || '');
					setPostStatus(data?.status || '');
					setPostExcerpt(
						data?.excerpt?.rendered || data?.excerpt?.raw || ''
					);
					setPostLink(data?.link || '');
					setFeaturedImageUrl(featImg);
					setMessages([...socialMessages]);
					setDrafts(socialDrafts);
					toggleProcessing(false);
				})
				.catch(() => {
					toggleProcessing(false);
				});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [postId, enabled]);

	const loading = useMemo(() => {
		return processing;
	}, [processing]);

	return {
		postId,
		postType,
		postTitle,
		postDate,
		postStatus,
		postExcerpt,
		postLink,
		featuredImageUrl,
		messages,
		drafts,
		loading,
	};
};

/**
 * Hook for child components to get the messages context.
 *
 * @return {Object} Messages context value.
 */
const useMessages = () => useContext(messagesContext);

/**
 * Provider component that makes messages available to any child component.
 *
 * @param {Object}  props          Component props.
 * @param {*}       props.children Child components.
 * @param {string}  props.postId   The post ID.
 * @param {string}  props.postType The post type.
 * @param {boolean} props.enabled  Whether fetching is enabled.
 * @return {JSX.Element} Provider component.
 */
function ProvideMessages({ children, postId, postType, enabled }) {
	const provider = useProvideMessages({ postId, postType, enabled });
	return (
		<messagesContext.Provider value={provider}>
			{children}
		</messagesContext.Provider>
	);
}

export { ProvideMessages, useMessages };
export default ProvideMessages;
