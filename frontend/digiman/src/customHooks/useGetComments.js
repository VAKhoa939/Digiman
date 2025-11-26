import { useQuery } from "@tanstack/react-query";
import { fetchCommentsByChapter, fetchCommentsByMangaTitle } from "../services/commentServices";
import { mapComment } from "../utils/transform";


export default function useGetComments(mangaId, chapterId) {
	const { data, isLoading, error } = useQuery({
		queryKey: ["comments", mangaId, chapterId],
		queryFn: () => (
			chapterId ? 
			fetchCommentsByChapter(chapterId) : 
			fetchCommentsByMangaTitle(mangaId)),
		staleTime: 1000 * 60 * 5,
		retry: navigator.onLine ? 1 : 0,
		enabled: navigator.onLine
	});

	return {
		comments: data?.results?.map(mapComment) || [],
		isLoading,
		error,
	};
}