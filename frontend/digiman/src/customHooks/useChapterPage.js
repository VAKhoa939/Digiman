import { useQuery } from "@tanstack/react-query";
import { fetchChapter, fetchMangaTitleChapters, fetchChapterPages } from "../services/mangaService";
import { mapChapter, mapPage } from "../utils/transform";
import { mockChapter, mockList } from "../data/chapterMock"
import { useState, useEffect } from "react";
import { loadDownloadedChapter } from "../utils/downloads";

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export default function useChapterPage(chapterId, mangaId) { 
  const [chapter, setChapter] = useState(null);
  const [chaptersList, setChaptersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
	
  // --- API Setup ---

  const staleTime = 1000 * 60 * 5; // Cache result for 5 minutes

	const {
		data: chaptersListData,
		isLoading: chaptersListIsLoading,
		error: chaptersListError,
	} = useQuery({
		queryKey: ["chapters", mangaId],
		queryFn: () => fetchMangaTitleChapters(mangaId),
		staleTime: staleTime,
		retry: 1,
		enabled: !useMock,
	});

	const { 
		data: chapterMeta, 
		isLoading: chapterMetaIsLoading, 
		error: chapterMetaError 
	} = useQuery({
		queryKey: ["chapter", chapterId],
		queryFn: () => fetchChapter(chapterId),
		staleTime: staleTime,
		retry: 1,
		enabled: !useMock,
	});

	const {
		data: pages,
		isLoading: pagesIsLoading,
		error: pagesError,
	} = useQuery({
		queryKey: ["pages", chapterId],
		queryFn: () => fetchChapterPages(chapterId),
		staleTime: staleTime,
		retry: 1,
		enabled: !useMock,
	});

	useEffect(() => {
		let mounted = true;
		const createdUrls = [];

		async function load() {
			// --- Downloaded version ---
			try{
				const saved = await loadDownloadedChapter(mangaId, chapterId);
				if (saved && mounted){
					const pages = saved.blobUrls || saved.chapter.pages || []

					// remember urls so we can revoke them on cleanup
					if (Array.isArray(saved.blobUrls)) createdUrls.push(...saved.blobUrls)

					setChapter({...saved.chapter, pages})
					setChaptersList([]); // No chapters list for downloaded chapters
					setLoading(false);
					return // Exit early if downloaded chapter is found
				}
			}catch(e){ /* ignore and fall back to backend */ }

			// --- Mock data version ---
			if (useMock && mounted) {
				setChapter(mockChapter);
				setChaptersList(mockList);
				setLoading(false);
				return;
			}
			
			// --- Live API version ---
			if (chapterMeta && pages && mounted) {
				setChapter({
					...mapChapter(chapterMeta),
					pages: pages.map(mapPage),
				});
				setChaptersList(chaptersListData?.results?.map(mapChapter) || []);
				setError(chapterMetaError || pagesError || chaptersListError);
				setLoading(false);
				console.log("Loaded chapter: ", chapterMeta);
				console.log("Loaded chapters list: ", chaptersListData);
				return;
			}

			// --- Handle errors ---
			if (mounted) {
				setLoading(chapterMetaIsLoading || pagesIsLoading || chaptersListIsLoading);
				setError(chapterMetaError || pagesError || chaptersListError);	
			}
		}

		load();
		return () => { 
			// cleanup on unmount
			mounted = false; 
			createdUrls.forEach(url => {
				try {
					URL.revokeObjectURL(url);
				} catch (_) {}
			}); 
		};
	}, [
		mangaId, chapterId,
		chapterMeta, pages, chaptersListData, 
	]);

	return { chapter, chaptersList, loading, error };
}