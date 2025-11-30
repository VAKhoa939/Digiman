import React, {useEffect, useState, useRef} from 'react'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined'
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS'
import ImageIcon from '@mui/icons-material/Image'
import {useParams, Link, useNavigate, useLocation} from 'react-router-dom'
import Comment from '../smallComponents/Comment'
import { useAuth } from '../../context/AuthContext'
import useGetComments from '../../customHooks/useGetComments'
import Spinner from '../smallComponents/Spinner'
import useCreateEditComment from '../../customHooks/useCreateEditComment'
import { mapInputCommentData } from '../../utils/transform'
import uploadProgressHandler from '../../utils/uploadProgress'

export default function CommentsPage({ inline = false }){
  const {mangaId, chapterId} = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, fetchUserLoading } = useAuth()
  const [text, setText] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editImage, setEditImage] = useState(null)
  const [editPreview, setEditPreview] = useState('')
  const [editUploading, setEditUploading] = useState(false)
  const [editUploadProgress, setEditUploadProgress] = useState(0)

  const { comments, isLoading, error } = useGetComments(mangaId, chapterId);
  const { create, edit } = useCreateEditComment();

  function addComment(e){
    e.preventDefault()
    if (!isAuthenticated) {
      // send user to login (preserve background so modal can appear)
      navigate('/login', { state: { background: location } })
      return
    }
    if(!text.trim() && !selectedImage) return

    const commentData = mapInputCommentData(text, mangaId, chapterId)

    setUploading(true)
    setUploadProgress(0)

    create({
      commentData,
      attachedImage: selectedImage,
      manga_title_id: mangaId,
      chapter_id: chapterId ?? null,
      onUploadProgress: (ev) => uploadProgressHandler(ev, setUploadProgress)
    }).then(() => {
      // success: clear form — the hook updates the cached list
      setText('')
      setSelectedImage(null)
      setPreviewUrl('')
    }).catch(err => {
      console.error('post comment failed', err)
      // optional: show UI error
    }).finally(() => {
      setUploading(false)
      setUploadProgress(0)
    })
  }

  // Formatting helpers for the post textarea
  const postRef = useRef(null)
  const fileRef = useRef(null)

  function wrapSelection(tag){
    const ta = postRef.current
    if(!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = ta.value.substring(0, start)
    const sel = ta.value.substring(start, end) || 'text'
    const after = ta.value.substring(end)
    const insert = `<${tag}>${sel}</${tag}>`
    const next = before + insert + after
    setText(next)
    // move caret after inserted content
    requestAnimationFrame(()=>{
      ta.focus()
      const pos = before.length + insert.length
      ta.setSelectionRange(pos, pos)
    })
  }

  function onImgClick(){
    if(fileRef.current) fileRef.current.click()
  }

  function onFileChange(e){
    const f = e.target.files && e.target.files[0]
    if(!f) return
    // limit to 5MB for safety
    const MAX = 5 * 1024 * 1024
    if(f.size > MAX){
      try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: 'Image too large (max 5MB)' } })); } catch(_){}
      e.target.value = ''
      return
    }
    setSelectedImage(f)
    const reader = new FileReader()
    reader.onload = function(ev){
      const data = ev.target.result
      setPreviewUrl(data)
    }
    reader.readAsDataURL(f)
  }

  function startEdit(c){
    setEditId(c.id)
    setEditText(c.text)
    setEditPreview(c.imageUrl || '')
    setEditImage(null)
    setEditUploading(false)
    setEditUploadProgress(0)
  }

  function cancelEdit(){
    setEditId(null)
    setEditText('')
  }

  function saveEdit(id, isDeleted=false){
    if(!editText.trim() && !editPreview && !isDeleted) return

    const commentData = mapInputCommentData(
      editText, mangaId, chapterId, editPreview || null, isDeleted
    );

    setEditUploading(true)
    setEditUploadProgress(0)

    edit({
      comment: id,
      commentData,
      attachedImage: editImage,
      manga_title_id: mangaId,
      chapter_id: chapterId ?? null,
      onUploadProgress: (ev) => uploadProgressHandler(ev, setEditUploadProgress)
    }).then(() => {
      // Clear edit UI — the hook already updated cache
      setEditId(null)
      setEditText('')
      setEditImage(null)
      setEditPreview('')
    }).catch(err => {
      console.error('edit comment failed', err)
    }).finally(() => {
      setEditUploading(false)
      setEditUploadProgress(0)
    })
  }

  function deleteComment(id){
    if (!window.confirm('Are you sure you want to delete this comment?')) return
    saveEdit(id, true)
  }

  const rootClass = inline ? 'comments-section' : 'container my-4 comments-section'
  console.log('comments', comments)
  console.log('user', user)
  return (
    <div className={rootClass}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Comments</h3>
        {!inline && (
          <Link to={`/manga/${mangaId}/chapter/${chapterId}`} className="btn btn-outline-secondary btn-sm">Back to chapter</Link>
        )}
      </div>

      {/* Handle offline */}
      {!navigator.onLine ? <div className="alert alert-danger">You are offline, comments section will not be displayed.</div> : 
      <>
        {/* Posting area */}
        <div className="mb-4">
          {fetchUserLoading ? (
            <div className="text-center py-3">Loading authentication…</div>
          ) : isAuthenticated ? (
            <div className="comment-post-area mb-3">
              <form onSubmit={addComment} className="post-box">
                <div>
                  <textarea ref={postRef} className="form-control post-textarea" rows={4} value={text} onChange={e=>setText(e.target.value)} placeholder="Write a comment..."></textarea>
                  <div className="mt-2 d-flex align-items-center gap-2">
                    <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} />
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=>{ setSelectedImage(null); setPreviewUrl(''); if(fileRef.current) fileRef.current.value=''; }}>Clear</button>
                  </div>
                  {previewUrl && (
                    <div className="mt-2">
                      <div className="small text-muted">Selected image preview:</div>
                      <img src={previewUrl} alt="preview" style={{maxWidth:'100%', borderRadius:6, marginTop:6}} />
                    </div>
                  )}
                </div>
                <div className="toolbar">
                  <div className="d-flex align-items-center gap-2">
                    <button type="button" className="btn btn-sm btn-outline-secondary" title="Bold" onClick={()=>wrapSelection('b')}>
                      <FormatBoldIcon fontSize="small" />
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" title="Italic" onClick={()=>wrapSelection('i')}>
                      <FormatItalicIcon fontSize="small" />
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" title="Underline" onClick={()=>wrapSelection('u')}>
                      <FormatUnderlinedIcon fontSize="small" />
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" title="Strikethrough" onClick={()=>wrapSelection('s')}>
                      <StrikethroughSIcon fontSize="small" />
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" title="Insert image" onClick={onImgClick}>
                      <ImageIcon fontSize="small" />
                    </button>
                  </div>
                  <div className="ms-auto d-flex align-items-center gap-2">
                    <label className="small text-muted"><input type="checkbox" className="me-1"/> Blur images in comments (Avoid spoilers)</label>
                    {uploading && (
                      <div style={{width:160}}>
                        <div className="progress" style={{height:8}}>
                          <div className="progress-bar" role="progressbar" style={{width: `${uploadProgress}%`}} aria-valuenow={uploadProgress} aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                      </div>
                    )}
                    <button className="post-submit btn btn-primary" type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'POST'}</button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="card mb-3">
              <div className="card-body">
                <p className="mb-2">You must be logged in to post comments.</p>
                <div>
                  <button className="btn btn-primary me-2" onClick={()=>navigate('/login', { state: { background: location } })}>Log in</button>
                  <button className="btn btn-outline-secondary" onClick={()=>navigate('/register', { state: { background: location } })}>Register</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="comment-list-controls">
          <div className="small text-muted">{comments.length} Responses</div>
          <div className="ms-auto d-flex gap-2">
            <a href="#">Upvotes</a>
            <a href="#">Newest</a>
            <a href="#">Oldest</a>
          </div>
        </div>

        {/* comments list */}
        <div>
          {isLoading && <Spinner/>}
          {error ? <p className="text-center py-3 text-danger">Failed to load comments.</p> :
          (comments && comments.length > 0 ? (
            comments.map(c => (
              <div key={c.id} className="mb-2">
                {editId === c.id ? (
                  <div className="card p-2 bg-transparent border-0">
                    <textarea className="form-control mb-2" rows={3} value={editText} onChange={e=>setEditText(e.target.value)} />
                    <div className="mt-2 d-flex align-items-center gap-2">
                      <input type="file" accept="image/*" onChange={(e)=>{
                        const f = e.target.files && e.target.files[0]
                        if(!f) return
                        const MAX = 5 * 1024 * 1024
                        if(f.size > MAX){ try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: 'Image too large (max 5MB)' } })); } catch(_){} e.target.value=''; return }
                        setEditImage(f)
                        const r = new FileReader()
                        r.onload = ev => setEditPreview(ev.target.result)
                        r.readAsDataURL(f)
                      }} />
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=>{ setEditImage(null); setEditPreview('') }}>Remove image</button>
                      {editPreview && <div style={{maxWidth:120}}><img src={editPreview} alt="preview" style={{maxWidth:'100%', borderRadius:6}} /></div>}
                    </div>
                    {editUploading && (
                      <div className="mt-2" style={{width:200}}>
                        <div className="progress" style={{height:8}}>
                          <div className="progress-bar" role="progressbar" style={{width: `${editUploadProgress}%`}} aria-valuenow={editUploadProgress} aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                      </div>
                    )}
                    <div className="d-flex gap-2 justify-content-end mt-2">
                      <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit} disabled={editUploading}>Cancel</button>
                      <button className="btn btn-sm btn-primary" onClick={()=>saveEdit(c.id)} disabled={editUploading}>{editUploading ? 'Uploading...' : 'Save'}</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Comment
                      name={c.name}
                      text={c.text}
                      created_at={c.created_at}
                      imageUrl={c.imageUrl}
                      avatar={c.avatar}
                      status={c.status}
                      isEdited={c.isEdited}
                      isOwner={isAuthenticated && user && user.id === c.ownerId}
                      onEdit={() => startEdit(c)}
                      onDelete={() => deleteComment(c.id)}
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-muted">No comments yet. Be the first to comment!</div>
          ))}
        </div>
      </>}
    </div>
  )
}
