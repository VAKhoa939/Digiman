import React, { useMemo, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import Comment from '../smallComponents/Comment'
import CommentComposer from '../smallComponents/CommentComposer'
import { useAuth } from '../../context/AuthContext'
import useGetComments from '../../customHooks/useGetComments'
import Spinner from '../smallComponents/Spinner'
import useCreateEditComment from '../../customHooks/useCreateEditComment'
import { mapInputCommentData } from '../../utils/transform'
import uploadProgressHandler from '../../utils/uploadProgress'
import emitToast from '../../utils/toast'

export default function CommentsPage({ inline = false }) {
  const { mangaId, chapterId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, fetchUserLoading } = useAuth()

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editImage, setEditImage] = useState(null)
  const [editPreview, setEditPreview] = useState('')
  const [editUploading, setEditUploading] = useState(false)
  const [editUploadProgress, setEditUploadProgress] = useState(0)

  const [sortMode, setSortMode] = useState('newest')
  const [replyToId, setReplyToId] = useState(null)
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyUploadProgress, setReplyUploadProgress] = useState(0)

  const { comments, isLoading, error } = useGetComments(mangaId, chapterId)
  const { create, edit } = useCreateEditComment()

  const commentsById = useMemo(() => new Map(comments.map((c) => [c.id, c])), [comments])

  const sortedComments = useMemo(() => {
    const list = [...comments]
    list.sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime()
      const bTime = new Date(b.created_at || 0).getTime()
      return sortMode === 'newest' ? bTime - aTime : aTime - bTime
    })
    return list
  }, [comments, sortMode])

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
        manga_title_id: mangaId,
        chapter_id: chapterId ?? null,
        current_user_id: user?.id ?? null,
        onUploadProgress: (ev) => uploadProgressHandler(ev, setUploadProgress),
      })
      setUploadProgress(100)
    } catch (err) {
      console.error('post comment failed', err)
      emitToast('error', err?.response?.data?.detail || err?.message || 'Failed to post comment. Please try again.')
      throw err
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  function startEdit(c) {
    setEditId(c.id)
    setEditText(c.text)
    setEditPreview(c.imageUrl || '')
    setEditImage(null)
    setEditUploading(false)
    setEditUploadProgress(0)
  }

  function cancelEdit() {
    setEditId(null)
    setEditText('')
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
        chapter_id: chapterId ?? null,
        current_user_id: user?.id ?? null,
        onUploadProgress: (ev) => uploadProgressHandler(ev, setReplyUploadProgress),
      })
      setReplyUploadProgress(100)
      cancelReply()
    } catch (err) {
      console.error('reply comment failed', err)
      emitToast('error', err?.response?.data?.detail || err?.message || 'Failed to post reply. Please try again.')
      setReplySubmitting(false)
      setReplyUploadProgress(0)
      throw err
    }
  }

  function saveEdit(id, isDeleted = false) {
    if (!editText.trim() && !editPreview && !isDeleted) return

    const commentData = mapInputCommentData(
      editText,
      mangaId,
      chapterId,
      editPreview || null,
      isDeleted
    )

    setEditUploading(true)
    setEditUploadProgress(0)

    edit({
      comment: id,
      commentData,
      attachedImage: editImage,
      manga_title_id: mangaId,
      chapter_id: chapterId ?? null,
      onUploadProgress: (ev) => uploadProgressHandler(ev, setEditUploadProgress),
    }).then(() => {
      setEditUploadProgress(100)
      setEditId(null)
      setEditText('')
      setEditImage(null)
      setEditPreview('')
    }).catch((err) => {
      console.error('edit comment failed', err)
      emitToast('error', err?.response?.data?.detail || err?.message || 'Failed to edit comment. Please try again.')
    }).finally(() => {
      setEditUploading(false)
      setEditUploadProgress(0)
    })
  }

  function deleteComment(id) {
    if (!window.confirm('Are you sure you want to delete this comment?')) return
    saveEdit(id, true)
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
          <div className="small text-muted">{comments.length} Responses</div>
          <div className="comment-sort ms-auto" role="tablist" aria-label="Comment order">
            <button
              type="button"
              className={`comment-sort-btn ${sortMode === 'newest' ? 'is-active' : ''}`}
              onClick={() => setSortMode('newest')}
              role="tab"
              aria-selected={sortMode === 'newest'}
            >
              Newest
            </button>
            <button
              type="button"
              className={`comment-sort-btn ${sortMode === 'oldest' ? 'is-active' : ''}`}
              onClick={() => setSortMode('oldest')}
              role="tab"
              aria-selected={sortMode === 'oldest'}
            >
              Oldest
            </button>
          </div>
        </div>

        <div>
          {isLoading && <Spinner />}
          {error ? <p className="text-center py-3 text-danger">Failed to load comments.</p> :
          (sortedComments && sortedComments.length > 0 ? (
            sortedComments.map((comment) => {
              const parentComment = comment.parentCommentId ? commentsById.get(comment.parentCommentId) : null
              const isReplyBoxOpen = replyToId === comment.id

              return (
                <div key={comment.id} className={comment.parentCommentId ? 'comment-thread-reply' : 'comment-thread-root'}>
                  {editId === comment.id ? (
                    <div className="card p-2 bg-transparent border-0">
                      <textarea className="form-control mb-2" rows={3} value={editText} onChange={e => setEditText(e.target.value)} />
                      <div className="mt-2 d-flex align-items-center gap-2">
                        <input type="file" accept="image/*" onChange={(e) => {
                          const f = e.target.files && e.target.files[0]
                          if (!f) return
                          const MAX = 5 * 1024 * 1024
                          if (f.size > MAX) {
                            emitToast('error', 'Image too large (max 5MB)')
                            e.target.value = ''
                            return
                          }
                          setEditImage(f)
                          const r = new FileReader()
                          r.onload = ev => setEditPreview(ev.target.result)
                          r.readAsDataURL(f)
                        }} />
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setEditImage(null); setEditPreview('') }}>Remove image</button>
                        {editPreview && <div style={{ maxWidth: 120 }}><img src={editPreview} alt="preview" style={{ maxWidth: '100%', borderRadius: 6 }} /></div>}
                      </div>
                      {editUploading && (
                        <div className="mt-2" style={{ width: 200 }}>
                          <div className="progress" style={{ height: 8 }}>
                            <div className="progress-bar" role="progressbar" style={{ width: `${editUploadProgress}%` }} aria-valuenow={editUploadProgress} aria-valuemin="0" aria-valuemax="100"></div>
                          </div>
                        </div>
                      )}
                      <div className="d-flex gap-2 justify-content-end mt-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit} disabled={editUploading}>Cancel</button>
                        <button className="btn btn-sm btn-primary" onClick={() => saveEdit(comment.id)} disabled={editUploading}>{editUploading ? 'Uploading...' : 'Save'}</button>
                      </div>
                    </div>
                  ) : (
                    <Comment
                      name={comment.name}
                      text={comment.text}
                      created_at={comment.created_at}
                      imageUrl={comment.imageUrl}
                      avatar={comment.avatar}
                      status={comment.status}
                      isEdited={comment.isEdited}
                      isOwner={isAuthenticated && user && user.id === comment.ownerId}
                      commentId={comment.id}
                      ownerId={comment.ownerId}
                      isAuthenticated={isAuthenticated}
                      replyTargetName={parentComment?.name || null}
                      replyTargetText={parentComment?.text || null}
                      onReply={() => startReply(comment.id)}
                      onEdit={() => startEdit(comment)}
                      onDelete={() => deleteComment(comment.id)}
                    />
                  )}

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
      </>}
    </div>
  )
}
