import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postComment, editComment } from '../services/commentServices'

export default function useCreateEditComment() {
    const queryClient = useQueryClient()

	const createMutation = useMutation(
			({ 
				commentData, attachedImage = null, manga_title_id = undefined, 
				chapter_id = undefined, onUploadProgress = null 
			}) => postComment(commentData, attachedImage, onUploadProgress),
			{
				// Optimistic update: insert a temporary comment into the cached
				// comments list so the UI shows the new comment immediately.
				onMutate: async (variables) => {
					const key = ['comments', variables.manga_title_id, variables.chapter_id ?? null];
					await queryClient.cancelQueries({ queryKey: key });
					const previous = queryClient.getQueryData(key);

					const optimistic = {
						id: `optimistic-${Date.now()}`,
						owner_name: 'You',
						owner_avatar: null,
						owner_id: null,
						text: variables.commentData.text || '',
						attached_image_url: null,
						created_at: new Date().toISOString(),
						status: 'active',
						is_edited: false,
						hidden_reasons: null,
					};

					const next = previous ? { ...previous, results: [optimistic, ...(previous.results || [])] } : { results: [optimistic] };
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
				onSuccess: (data, variables) => {
					const key = ['comments', variables.manga_title_id, variables.chapter_id ?? null]
					queryClient.invalidateQueries({ queryKey: key });
				}
			}
    );

    async function create({ 
			commentData, attachedImage = null, manga_title_id = undefined, 
			chapter_id = undefined, onUploadProgress = null 
		} = {}) {
      return createMutation.mutateAsync({ commentData, attachedImage, manga_title_id, chapter_id, onUploadProgress })
    }

    async function edit({ 
			comment, commentData, attachedImage = null, manga_title_id = undefined, 
			chapter_id = undefined, onUploadProgress = null 
		} = {}) {
      return editMutation.mutateAsync({ comment, commentData, attachedImage, manga_title_id, chapter_id, onUploadProgress })
    }

    return { create, edit, }
}