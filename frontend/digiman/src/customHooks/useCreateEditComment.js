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
				onSuccess: (data, variables) => {
					const key = ['comments', variables.manga_title_id, variables.chapter_id ?? null]
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