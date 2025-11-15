// Utilities for loading/saving comments in localStorage used by the dev UI.
export function loadComments(mangaId, chapterId){
  try{
    const raw = localStorage.getItem(`comments_${mangaId}_${chapterId}`)
    if(!raw) return []
    return JSON.parse(raw)
  }catch(e){
    console.error('Failed to load comments', e)
    return []
  }
}

export function saveComments(mangaId, chapterId, comments){
  try{
    localStorage.setItem(`comments_${mangaId}_${chapterId}`, JSON.stringify(comments))
  }catch(e){
    console.error('Failed to save comments', e)
  }
}
