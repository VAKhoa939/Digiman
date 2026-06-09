import React, { useMemo, useState } from 'react'
import { useParams, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import Comment from '../smallComponents/Comment'
import CommentComposer from '../smallComponents/CommentComposer'
import Pagination from '../smallComponents/Pagination'
import { useAuth } from '../../context/AuthContext'
import useGetComments from '../../customHooks/useGetComments'
import Spinner from '../smallComponents/Spinner'
import useCreateEditComment from '../../customHooks/useCreateEditComment'
import { mapInputCommentData } from '../../utils/transform'
import uploadProgressHandler from '../../utils/uploadProgress'

const COMMENTS_PAGE_SIZE = 20

export default function CommentsPage({ inline = false }) {
  const { mangaId, chapterId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, user, fetchUserLoading } = useAuth()

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [editId, setEditId] = useState(null)
  const [editUploading, setEditUploading] = useState(false)
  const [editUploadProgress, setEditUploadProgress] = useState(0)

  const [sortMode, setSortMode] = useState('newest')
  const [replyToId, setReplyToId] = useState(null)
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyUploadProgress, setReplyUploadProgress] = useState(0)
  const currentCommentsPage = Math.max(1, Number(searchParams.get('comments_page')) || 1)
  const commentOrdering = sortMode === 'newest' ? '-created_at' : 'created_at'
  const commentQueryKey = ['comments', mangaId, chapterId ?? null, currentCommentsPage, COMMENTS_PAGE_SIZE, commentOrdering]

  const { comments, total, isLoading, error } = useGetComments(
    mangaId,
    chapterId,
    currentCommentsPage,
    COMMENTS_PAGE_SIZE,
    commentOrdering
  )
  const { create, edit } = useCreateEditComment()

  const commentsById = useMemo(() => new Map(comments.map((c) => [c.id, c])), [comments])

  function setCommentsPage(page) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (page <= 1) next.delete('comments_page')
      else next.set('comments_page', String(page))
      return next
    })
  }

  function handleSortChange(nextSortMode) {
    if (nextSortMode === sortMode) return
    setSortMode(nextSortMode)
    setCommentsPage(1)
    cancelReply()
    cancelEdit()
  }

  async function handlePostSubmit({ text, attachedImage }) {
    if (uploading) return
    if (!isAuthenticated) {
      navigate('/login', { state: { background: location } })
      throw new Error('Authentication required')
    }
    if (!text.trim() && !attachedImage) return

    const commentData = mapInputCommentData(text, mangaId, chapterId)

    setUploading(true)
    setUploadProgress(0)

    try {
      await create({
        commentData,
        attachedImage,
        owner: user,
        onUploadProgress: (ev) => uploadProgressHandler(ev, setUploadProgress),
        queryKey: commentQueryKey,
      })
      if (commentOrdering === '-created_at' && currentCommentsPage !== 1) setCommentsPage(1)
      setUploadProgress(100)
    } catch (err) {
      console.error('post comment failed', err)
      throw err
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  function startEdit(c) {
    setEditId(c.id)
    setEditUploading(false)
    setEditUploadProgress(0)
  }

  function cancelEdit() {
    setEditId(null)
  }

  function startReply(commentId) {
    setReplyToId(commentId)
  }

  function cancelReply() {
    setReplyToId(null)
    setReplySubmitting(false)
    setReplyUploadProgress(0)
  }

  async function submitReply(parentCommentId, text, attachedImage) {
    if (replySubmitting) return
    if (!text.trim() && !attachedImage) return

    const commentData = mapInputCommentData(
      text,
      mangaId,
      chapterId,
      null,
      false,
      parentCommentId
    )

    setReplySubmitting(true)
    setReplyUploadProgress(0)
    try {
      await create({
        commentData,
        attachedImage: attachedImage || null,
        manga_title_id: mangaId,
        onUploadProgress: (ev) => uploadProgressHandler(ev, setReplyUploadProgress),
        queryKey: commentQueryKey,
      })
      if (commentOrdering === '-created_at' && currentCommentsPage !== 1) setCommentsPage(1)
      setReplyUploadProgress(100)
      cancelReply()
    } catch (err) {
      console.error('reply comment failed', err)
      setReplySubmitting(false)
      setReplyUploadProgress(0)
      throw err
    }
  }

  async function saveEdit(id, text, previewUrl, attachedImage = null) {
    if (!text.trim() && !previewUrl && !attachedImage) return // no changes

    const commentData = mapInputCommentData(
      text,
      mangaId,
      chapterId,
      previewUrl || null,
    )

    setEditUploading(true)
    setEditUploadProgress(0)

    try {
      await edit({
        comment: id,
        commentData,
        attachedImage,
        onUploadProgress: (ev) => uploadProgressHandler(ev, setEditUploadProgress),
      })
      setEditUploadProgress(100)
      setEditId(null)
    } catch (err) {
      console.error('edit comment failed', err)
    } finally {
      setEditUploading(false)
      setEditUploadProgress(0)
    }
  }

  async function deleteComment(id) {
    if (!window.confirm('Are you sure you want to delete this comment?')) return

    setEditUploading(true)
    setEditUploadProgress(0)

    try {
      await edit({
        comment: id,
        commentData: mapInputCommentData('', mangaId, chapterId, null, true),
        attachedImage: null,
      })
      setEditId(null)
      setEditUploadProgress(100)
    } catch (err) {
      console.error('delete comment failed', err)
    } finally {
      setEditUploading(false)
      setEditUploadProgress(0)
    }
  }

  const rootClass = inline ? 'comments-section' : 'container my-4 comments-section'
  return (
    <div className={rootClass}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Comments</h3>
        {!inline && (
          <Link to={`/manga/${mangaId}/chapter/${chapterId}`} className="btn btn-outline-secondary btn-sm">Back to chapter</Link>
        )}
      </div>

      {!navigator.onLine ? <div className="alert alert-danger">You are offline, comments section will not be displayed.</div> :
      <>
        <div className="mb-4">
          {fetchUserLoading ? (
            <div className="text-center py-3">Loading authentication…</div>
          ) : isAuthenticated ? (
            <div className="comment-post-area mb-3">
              <CommentComposer
                onSubmit={handlePostSubmit}
                submitting={uploading}
                uploadProgress={uploadProgress}
                placeholder="Write a comment..."
                submitLabel="POST"
                className="post-box"
              />
            </div>
          ) : (
            <div className="card mb-3">
              <div className="card-body">
                <p className="mb-2">You must be logged in to post comments.</p>
                <div>
                  <button className="btn btn-primary me-2" onClick={() => navigate('/login', { state: { background: location } })}>Log in</button>
                  <button className="btn btn-outline-secondary" onClick={() => navigate('/register', { state: { background: location } })}>Register</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="comment-list-controls">
          <div className="small text-muted">{total} Responses</div>
          <div className="comment-sort ms-auto" role="tablist" aria-label="Comment order">
            <button
              type="button"
              className={`comment-sort-btn ${sortMode === 'newest' ? 'is-active' : ''}`}
              onClick={() => handleSortChange('newest')}
              role="tab"
              aria-selected={sortMode === 'newest'}
            >
              Newest
            </button>
            <button
              type="button"
              className={`comment-sort-btn ${sortMode === 'oldest' ? 'is-active' : ''}`}
              onClick={() => handleSortChange('oldest')}
              role="tab"
              aria-selected={sortMode === 'oldest'}
            >
              Oldest
            </button>
          </div>
        </div>

        {/* Comment list */}
        <div>
          {isLoading && <Spinner />}
          {error ? <p className="text-center py-3 text-danger">Failed to load comments.</p> :
          (comments && comments.length > 0 ? (
            comments.map((comment) => {
              const parentComment = comment.parentCommentId ? commentsById.get(comment.parentCommentId) : null
              const isReplyBoxOpen = replyToId === comment.id

              return (
                <div key={comment.id} className={comment.parentCommentId ? 'comment-thread-reply' : 'comment-thread-root'}>
                  {/* Edit form */}
                  {editId === comment.id ? (
                    <CommentComposer
                      initialText={comment.text}
                      initialPreviewUrl={comment.imageUrl || ''}
                      onSubmit={({ text, attachedImage, previewUrl }) => saveEdit(comment.id, text, previewUrl, attachedImage)}
                      submitting={editUploading}
                      uploadProgress={editUploadProgress}
                      placeholder="Edit comment..."
                      submitLabel="Save"
                      showCancel={true}
                      onCancel={cancelEdit}
                      className="card p-2 bg-transparent border-0"
                    />
                  ) : (
                    <Comment
                      ownerName={comment.ownerName}
                      text={comment.text}
                      createdAt={comment.createdAt}
                      imageUrl={comment.imageUrl}
                      avatar={comment.avatar}
                      status={comment.status}
                      isEdited={comment.isEdited}
                      isOwner={isAuthenticated && user && user.id === comment.ownerId}
                      hiddenReasons={comment.hiddenReasons}
                      moderationStatus={comment.moderationStatus}
                      commentId={comment.id}
                      ownerId={comment.ownerId}
                      isAuthenticated={isAuthenticated}
                      replyTargetName={parentComment?.ownerName || null}
                      replyTargetText={parentComment?.text || null}
                      onReply={() => startReply(comment.id)}
                      onEdit={() => startEdit(comment)}
                      onDelete={() => deleteComment(comment.id)}
                    />
                  )}

                  {/* Reply box */}
                  {isReplyBoxOpen && (
                    <CommentComposer
                      onSubmit={({ text, attachedImage }) => submitReply(comment.id, text, attachedImage)}
                      submitting={replySubmitting}
                      uploadProgress={replyUploadProgress}
                      placeholder="Add a reply..."
                      submitLabel="Reply"
                      showCancel={true}
                      onCancel={cancelReply}
                      className="reply-inline-box"
                    />
                  )}
                </div>
              )
            })
          ) : (
            <div className="text-muted">No comments yet. Be the first to comment!</div>
          ))}
        </div>

        <Pagination
          total={total}
          page={currentCommentsPage}
          pageSize={COMMENTS_PAGE_SIZE}
          pageParam="comments_page"
          pageSizeParam="comments_page_size"
          manageHeadLinks={!inline}
          onPageChange={() => {
            cancelReply()
            cancelEdit()
          }}
        />
      </>}
    </div>
  )
}
