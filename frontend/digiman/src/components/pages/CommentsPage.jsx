import React, {useEffect, useState} from 'react'
import {useParams, Link, useNavigate, useLocation} from 'react-router-dom'
import { loadComments, saveComments } from '../../utils/comments'
import Comment from '../smallComponents/Comment'
import { useAuth } from '../../context/AuthContext'

// Simple comments page using localStorage as a fallback for dev.
// Comments are stored under key `comments_<mangaId>_<chapterId>` as JSON array.

export default function CommentsPage(){
  const {mangaId, chapterId} = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, fetchUserLoading } = useAuth()
  const [comments, setComments] = useState([])
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState('')

  useEffect(()=>{
    const c = loadComments(mangaId, chapterId)
    setComments(c)
    // prefill name for logged-in users
    if (user && user.username) setName(user.username)
  }, [mangaId, chapterId, user])

  function addComment(e){
    e.preventDefault()
    if (!isAuthenticated) {
      // send user to login (preserve background so modal can appear)
      navigate('/login', { state: { background: location } })
      return
    }
    if(!text.trim()) return
    const newComment = {
      id: Date.now(),
      name: name?.trim() || (user && user.username) || 'Guest',
      text: text.trim(),
      created_at: new Date().toISOString()
    }
    const next = [newComment, ...comments]
    setComments(next)
    saveComments(mangaId, chapterId, next)
    setText('')
  }

  function startEdit(c){
    setEditId(c.id)
    setEditText(c.text)
  }

  function cancelEdit(){
    setEditId(null)
    setEditText('')
  }

  function saveEdit(id){
    if(!editText.trim()) return
    const next = comments.map(c => c.id === id ? {...c, text: editText, edited_at: new Date().toISOString()} : c)
    setComments(next)
    saveComments(mangaId, chapterId, next)
    setEditId(null)
    setEditText('')
  }

  function deleteComment(id){
    const next = comments.filter(c => c.id !== id)
    setComments(next)
    saveComments(mangaId, chapterId, next)
    if(editId === id) cancelEdit()
  }

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Comments</h3>
        <Link to={`/manga/${mangaId}/chapter/${chapterId}`} className="btn btn-outline-secondary btn-sm">Back to chapter</Link>
      </div>

      {/* comments list rendered below; posting UI moved to the bottom */}

      <div>
        {comments.length === 0 ? (
          <div className="text-muted">No comments yet. Be the first to comment!</div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="mb-2">
              {editId === c.id ? (
                <div className="card p-2 bg-transparent border-0">
                  <textarea className="form-control mb-2" rows={3} value={editText} onChange={e=>setEditText(e.target.value)} />
                  <div className="d-flex gap-2 justify-content-end">
                    <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit}>Cancel</button>
                    <button className="btn btn-sm btn-primary" onClick={()=>saveEdit(c.id)}>Save</button>
                  </div>
                </div>
              ) : (
                <div>
                  <Comment name={c.name} text={c.text} created_at={c.created_at} onClick={isAuthenticated && user && user.username === c.name ? ()=>startEdit(c) : undefined} />
                  {/* show edit/delete only for comment owner */}
                      {isAuthenticated && user && user.username && user.username === c.name && (
                        <div className="mt-2 d-flex gap-2">
                          {/* clicking the comment itself starts edit now */}
                          <button className="btn btn-sm btn-outline-danger" onClick={()=>deleteComment(c.id)}>Delete</button>
                        </div>
                      )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

          {/* Posting area moved to bottom */}
          <div className="mt-4">
            {fetchUserLoading ? (
              <div className="text-center py-3">Loading authentication…</div>
            ) : isAuthenticated ? (
              <div className="card mb-3">
                <div className="card-body">
                  <form onSubmit={addComment}>
                    <div className="mb-2">
                      <label className="form-label">Name</label>
                      <input className="form-control" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Comment</label>
                      <textarea className="form-control" rows={3} value={text} onChange={e=>setText(e.target.value)} placeholder="Write a comment..."></textarea>
                    </div>
                    <div className="text-end">
                      <button className="btn btn-primary" type="submit">Post comment</button>
                    </div>
                  </form>
                </div>
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
    </div>
  )
}
