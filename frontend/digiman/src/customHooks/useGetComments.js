import { useQuery } from "@tanstack/react-query";
import { fetchCommentsByChapter, fetchCommentsByMangaTitle } from "../services/commentServices";
import { mapComment } from "../utils/transform";


export default function useGetComments(mangaId, chapterId) {
	// Normalize chapterId to `null` when missing so the query key
	// matches the keys used when creating/editing comments which use
	// `chapter_id ?? null`. This ensures `invalidateQueries` targets
	// the same cache entry and causes an immediate refetch.
	const normalizedChapterId = chapterId ?? null;
	const { data, isLoading, error } = useQuery({
		queryKey: ["comments", mangaId, normalizedChapterId],
		queryFn: () => (
			// Use the normalized chapter id when deciding which
			// fetch to call — treat `null` as no chapter selected.
			normalizedChapterId ? 
			fetchCommentsByChapter(normalizedChapterId) : 
			fetchCommentsByMangaTitle(mangaId)),
		staleTime: 1000 * 60 * 5,
		retry: navigator.onLine ? 1 : 0,
		enabled: navigator.onLine
	});

	if (data && data.results) console.log("fetched comments", data.results);

	return {
		comments: data?.results?.map(mapComment) || [],
		isLoading,
		error,
	};
}