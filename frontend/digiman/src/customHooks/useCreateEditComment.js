import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postComment, editComment } from '../services/commentServices'

export default function useCreateEditComment() {
	const queryClient = useQueryClient()

	const createMutation = useMutation(
		({ 
			commentData, attachedImage = null, manga_title_id = undefined, 
			chapter_id = undefined, onUploadProgress = null, current_user_id = null
		}) => postComment(commentData, attachedImage, onUploadProgress),
		{
			// Optimistic update: insert a temporary comment into the cached
			// comments list so the UI shows the new comment immediately.
			onMutate: async (variables) => {
				const key = ['comments', variables.manga_title_id, variables.chapter_id ?? null];
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData(key);

				// Avoid showing a fake/pending comment while an image file is still uploading.
				if (variables.attachedImage) {
					return { key, previous };
				}

				const optimistic = {
					id: `optimistic-${Date.now()}`,
					parent_comment_id: variables.commentData.parent_comment ?? null,
					owner_name: 'You',
					owner_avatar: null,
					owner_id: variables.current_user_id,
					text: variables.commentData.text || '',
					attached_image_url: null,
					created_at: new Date().toISOString(),
					status: 'active',
					is_edited: false,
					hidden_reasons: null,
				};

				const previousList = Array.isArray(previous)
					? previous
					: (Array.isArray(previous?.results) ? previous.results : []);
				const next = [optimistic, ...previousList];
				queryClient.setQueryData(key, next);
				return { key, previous };
			},
			onError: (err, variables, context) => {
				try {
					if (context && context.key) queryClient.setQueryData(context.key, context.previous);
				} catch (e) {}
			},
			onSettled: (data, error, variables) => {
				const key = ['comments', variables.manga_title_id, variables.chapter_id ?? null];
				queryClient.invalidateQueries({ queryKey: key });
			}
		}
	);

	const editMutation = useMutation(
		({ comment, commentData, attachedImage = null, manga_title_id = undefined, chapter_id = undefined, onUploadProgress = null }) =>
			editComment(comment, commentData, attachedImage, onUploadProgress),
		{
			onSettled: (data, error, variables) => {
				const key = ['comments', variables.manga_title_id, variables.chapter_id ?? null]
				queryClient.invalidateQueries({ queryKey: key });
			}
		}
	);

	async function create({ 
		commentData, attachedImage = null, manga_title_id = undefined, 
		chapter_id = undefined, onUploadProgress = null, current_user_id = null
	} = {}) {
		return createMutation.mutateAsync({ commentData, attachedImage, manga_title_id, chapter_id, onUploadProgress, current_user_id })
	}

	async function edit({ 
		comment, commentData, attachedImage = null, manga_title_id = undefined, 
		chapter_id = undefined, onUploadProgress = null 
	} = {}) {
		return editMutation.mutateAsync({ comment, commentData, attachedImage, manga_title_id, chapter_id, onUploadProgress })
	}

	return { create, edit, }
}