import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postComment, editComment } from '../services/commentServices'
import { toastSuccess, toastError, toastInfo } from '../utils/toast'

export default function useCreateEditComment() {
	const queryClient = useQueryClient()

	const createMutation = useMutation(
		({ 
			commentData, attachedImage = null, onUploadProgress = null, owner = null, queryKey = null
		}) => postComment(commentData, attachedImage, onUploadProgress),
		{
			// Optimistic update: insert a temporary comment into the cached
			// comments list so the UI shows the new comment immediately.
			onMutate: async (variables) => {
				const baseKey = ['comments', variables.commentData.manga_title, variables.commentData.chapter ?? null];
				const key = variables.queryKey || baseKey;
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData(key);

				// Avoid showing a fake/pending comment while an image file is still uploading.
				if (variables.attachedImage) {
					return { key, previous, baseKey };
				}

				const optimistic = {
					id: `optimistic-${Date.now()}`,
					parent_comment_id: variables.commentData.parent_comment || null,
					owner_name: 'You',
					owner_avatar: variables.owner.avatar || null,
					owner_id: variables.owner.id || null,
					text: variables.commentData.text || '',
					attached_image_url: variables.commentData.attached_image_url || null,
					created_at: new Date().toISOString(),
					status: 'active',
					is_edited: false,
					hidden_reasons: null,
				};

				const previousList = Array.isArray(previous)
					? previous
					: (Array.isArray(previous?.results) ? previous.results : []);
				const maxVisible = previousList.length > 0 ? previousList.length : undefined;
				const nextList = maxVisible ? [optimistic, ...previousList].slice(0, maxVisible) : [optimistic, ...previousList];
				const next = Array.isArray(previous)
					? nextList
					: {
						...(previous || {}),
						count: (previous?.count ?? previousList.length) + 1,
						results: nextList,
					};
				queryClient.setQueryData(key, next);
				return { key, previous, baseKey };
			},
			onError: (err, variables, context) => {
				try {
					if (context && context.key) queryClient.setQueryData(context.key, context.previous);
				} catch (e) {
					console.warn('useCreateEditComment rollback failed', e)
				}
			},
			onSettled: (data, error, variables) => {
				const key = ['comments', variables.commentData.manga_title, variables.commentData.chapter ?? null];
				queryClient.invalidateQueries({ queryKey: key });
			}
		}
	);

	const editMutation = useMutation(
		({ comment, commentData, attachedImage = null, onUploadProgress = null }) =>
			editComment(comment, commentData, attachedImage, onUploadProgress),
		{
			onSettled: (data, error, variables) => {
				const key = ['comments', variables.commentData.manga_title, variables.commentData.chapter ?? null]
				queryClient.invalidateQueries({ queryKey: key });
			}
		}
	);

	function notifyModerationStatus(comment) {
		if (!comment) return;
		const status = String(comment.moderation_status ?? comment.moderationStatus ?? '').toLowerCase();
		switch (status) {
			case 'flagged':
				toastInfo('This comment is flagged, waiting for admin moderation review.');
				break;
			case 'banned':
				toastError('This comment is banned. You are allowed to update the comment again.');
				break;
			case 'safe':
				toastSuccess('This comment passed the content moderation and is safe to display.');
				break;
			case 'failed':
				toastError('The content moderation process for the comment has failed or timed out. Please retry updating the comment later.');
				break;
			case 'pending':
			case 'processing':
				toastInfo('The content moderation for the comment is processing.');
				break;
			default:
				break;
		}
	}

	async function create({ 
		commentData, attachedImage = null, onUploadProgress = null, owner = null, queryKey = null
	} = {}) {
		try {
			const result = await createMutation.mutateAsync({ commentData, attachedImage, onUploadProgress, owner, queryKey });
			toastSuccess('Comment posted successfully.');
			notifyModerationStatus(result);
			return result;
		} catch (err) {
			console.error('Post comment failed.', err);
			toastError(err?.response?.data?.detail || err?.message || 'Failed to post comment. Please try again.');
			throw err;
		};
	}

	async function edit({ 
		comment, commentData, attachedImage = null, onUploadProgress = null,
	} = {}) {
		try {
			const isDelete = commentData.status === "deleted" ?? false;
			const result = await editMutation.mutateAsync({ comment, commentData, attachedImage, onUploadProgress });
			toastSuccess(isDelete ? 'Comment deleted successfully.' : 'Comment updated successfully.');
			if (!isDelete) notifyModerationStatus(result);
			return result;
		} catch (err) {
			console.error('Update comment failed.', err);
			toastError(err?.response?.data?.detail || err?.message || (
				isDeleted ? 'Failed to delete comment. Please try again.' 
				: 'Failed to update comment. Please try again.'
			));
			throw err;
		}
	}

	return { create, edit, };
}