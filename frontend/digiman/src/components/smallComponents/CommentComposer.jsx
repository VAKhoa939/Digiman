import React, { useEffect, useRef, useState } from 'react'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined'
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS'
import ImageIcon from '@mui/icons-material/Image'
import emitToast from '../../utils/toast'

export default function CommentComposer({
  onSubmit,
  submitting = false,
  uploadProgress = 0,
  placeholder = 'Write a comment...',
  submitLabel = 'POST',
  showCancel = false,
  onCancel,
  className = '',
  initialText = '',
  initialPreviewUrl = '',
}) {
  const [text, setText] = useState(initialText)
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl)
  const postRef = useRef(null)
  const fileRef = useRef(null)

  function wrapSelection(tag) {
    const ta = postRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = ta.value.substring(0, start)
    const sel = ta.value.substring(start, end) || 'text'
    const after = ta.value.substring(end)
    const insert = `<${tag}>${sel}</${tag}>`
    const next = before + insert + after
    setText(next)

    requestAnimationFrame(() => {
      ta.focus()
      const pos = before.length + insert.length
      ta.setSelectionRange(pos, pos)
    })
  }

  function onImgClick() {
    if (fileRef.current) fileRef.current.click()
  }

  function onFileChange(e) {
    const f = e.target.files && e.target.files[0]
    if (!f) return

    const MAX = 5 * 1024 * 1024
    if (f.size > MAX) {
      emitToast('error', 'Image too large (max 5MB)')
      e.target.value = ''
      return
    }

    setSelectedImage(f)
    const reader = new FileReader()
    reader.onload = function (ev) {
      setPreviewUrl(ev.target.result)
    }
    reader.readAsDataURL(f)
  }

  useEffect(() => {
    setText(initialText)
    setSelectedImage(null)
    setPreviewUrl(initialPreviewUrl)
    if (fileRef.current) fileRef.current.value = ''
  }, [initialText, initialPreviewUrl])

  function clearImage() {
    setSelectedImage(null)
    setPreviewUrl('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    if (!text.trim() && !selectedImage && !previewUrl) return

    await onSubmit({ text, attachedImage: selectedImage, previewUrl })

    // Reset only after successful submit.
    setText('')
    clearImage()
  }

  return (
    <form onSubmit={handleSubmit} className={className || 'post-box'}>
      <div>
        <textarea
          ref={postRef}
          className="form-control post-textarea"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={submitting}
        ></textarea>

        <div className="mt-2 d-flex align-items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            disabled={submitting}
          />
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={clearImage}
            disabled={submitting}
          >
            Clear
          </button>
        </div>

        {previewUrl && (
          <div className="mt-2">
            <div className="small text-muted">Selected image preview:</div>
            <img src={previewUrl} alt="preview" className="comment-image" style={{ marginTop: 6, borderRadius: 6 }} />
          </div>
        )}
      </div>

      <div className="toolbar">
        <div className="d-flex align-items-center gap-2">
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Bold" onClick={() => wrapSelection('b')} disabled={submitting}>
            <FormatBoldIcon fontSize="small" />
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Italic" onClick={() => wrapSelection('i')} disabled={submitting}>
            <FormatItalicIcon fontSize="small" />
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Underline" onClick={() => wrapSelection('u')} disabled={submitting}>
            <FormatUnderlinedIcon fontSize="small" />
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Strikethrough" onClick={() => wrapSelection('s')} disabled={submitting}>
            <StrikethroughSIcon fontSize="small" />
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Insert image" onClick={onImgClick} disabled={submitting}>
            <ImageIcon fontSize="small" />
          </button>
        </div>

        <div className="ms-auto d-flex align-items-center gap-2">
          {submitting && uploadProgress > 0 && (
            <div style={{ width: 160 }}>
              <div className="progress" style={{ height: 8 }}>
                <div className="progress-bar" role="progressbar" style={{ width: `${uploadProgress}%` }} aria-valuenow={uploadProgress} aria-valuemin="0" aria-valuemax="100"></div>
              </div>
            </div>
          )}
          {showCancel && (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
          )}
          <button className="post-submit btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? `${submitLabel}...` : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}
