import { useQuery } from "@tanstack/react-query";
import { fetchCommentsByChapter, fetchCommentsByMangaTitle } from "../services/commentServices";
import { mapComment } from "../utils/transform";


export default function useGetComments(mangaId, chapterId, page = 1, pageSize = 20, ordering = '-created_at') {
	// Normalize chapterId to `null` when missing so the query key
	// matches the keys used when creating/editing comments which use
	// `chapter_id ?? null`. This ensures `invalidateQueries` targets
	// the same cache entry and causes an immediate refetch.
	const normalizedChapterId = chapterId ?? null;
	const { data, isLoading, error } = useQuery({
		queryKey: ["comments", mangaId, normalizedChapterId, page, pageSize, ordering],
		queryFn: () => (
			// Use the normalized chapter id when deciding which
			// fetch to call — treat `null` as no chapter selected.
			normalizedChapterId ? 
			fetchCommentsByChapter(normalizedChapterId, page, pageSize, ordering) : 
			fetchCommentsByMangaTitle(mangaId, page, pageSize, ordering)),
		staleTime: 1000 * 60 * 5,
		retry: navigator.onLine ? 1 : 0,
		enabled: navigator.onLine
	});

	const commentsData = Array.isArray(data)
		? data
		: (Array.isArray(data?.results) ? data.results : []);
	const total = typeof data?.count === 'number' ? data.count : commentsData.length;

	return {
		comments: commentsData.map(mapComment),
		total,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(total / pageSize)),
		isLoading,
		error,
	};
}