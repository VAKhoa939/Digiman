import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postComment, editComment } from '../services/commentServices'
import { mapComment } from '../utils/transform'

export default function useCreateEditComment() {
    const queryClient = useQueryClient()

    const createMutation = useMutation(
			({ commentData, attachedImage = null, manga_title_id = undefined, chapter_id = undefined, onUploadProgress = null }) =>
				postComment(commentData, attachedImage, onUploadProgress),
			{
				onSuccess: (data, variables) => {
					// update the exact cached list immediately instead of invalidating/refetching
					const key = ['comments', variables.manga_title_id, variables.chapter_id ?? null]
					console.log('Successfully created comment:', data);
					queryClient.setQueryData(key, old => {
						const oldResults = old?.results ?? []
						return {
							...old,
							results: [mapComment(data), ...oldResults],
						}
					})
				}
			}
    )

    const editMutation = useMutation(
			({ commentId, commentData, attachedImage = null, manga_title_id = undefined, chapter_id = undefined, onUploadProgress = null }) =>
				editComment(commentId, commentData, attachedImage, onUploadProgress),
			{
				onSuccess: (data, variables) => {
					// update the exact cached list immediately instead of invalidating/refetching
					const key = ['comments', variables.manga_title_id, variables.chapter_id ?? null]
					console.log('Successfully edited comment:', data);
					queryClient.setQueryData(key, old => {
						const oldResults = old?.results ?? []
						return {
							...old,
							results: [mapComment(data), ...oldResults],
						}
					})
				}
			}
    )

    async function create({ commentData, attachedImage = null, manga_title_id = undefined, chapter_id = undefined, onUploadProgress = null } = {}) {
			console.log('Creating comment with data:', commentData);
      return createMutation.mutateAsync({ commentData, attachedImage, manga_title_id, chapter_id, onUploadProgress })
    }

    async function edit({ commentId, commentData, attachedImage = null, manga_title_id = undefined, chapter_id = undefined, onUploadProgress = null } = {}) {
			console.log('Editing comment with data:', commentData);
      return editMutation.mutateAsync({ commentId, commentData, attachedImage, manga_title_id, chapter_id, onUploadProgress })
    }

    return { create, edit, }
}