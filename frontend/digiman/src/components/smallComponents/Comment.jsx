import React from 'react'

// Simple presentational Comment component. Accepts props to render a comment.
export default function Comment({
	name = 'Guest', text = '', created_at = null, avatar = null, 
	className, isOwner = false, imageUrl, 
	status = 'active', hiddenReasons = '', isEdited = false, isAdminView = false, 
	onEdit = () => {}, onDelete = () => {}, onToggleHidden = () => {},
}){
	// helper to derive avatar color from name
	function avatarColor(n){
		if(!n) return 'var(--accent)'
		const code = n.split('').reduce((s,c)=>c.charCodeAt(0)+((s<<5)-s),0)
		const hue = Math.abs(code) % 360
		return `hsl(${hue} 75% 45%)`
	}

	// Determine if the comment is deleted or hidden
	const isDeleted = status === 'deleted';
	const isHidden = status === 'hidden';


	return (
		<div className={`comment-rect ${className||''}`}>
			<div className="comment-row">
				{avatar ? (
					<img src={avatar} alt={name} className="me-3" style={{width:48, height:48, objectFit:'cover', borderRadius:8}} />
				) : (
					<div className="comment-avatar me-3" style={{background: avatarColor(name)}}>
						{name ? name.charAt(0).toUpperCase() : 'G'}
					</div>
				)}

				<div className="flex-grow-1">
					<div className="d-flex align-items-start">
						<div>
								<span className="comment-username">{name}</span>
								<span className="comment-meta"> • {created_at ? new Date(created_at).toLocaleString() : ''}</span>
								{!isDeleted && !isHidden && isEdited && <span className="text-muted"> (edited)</span>}
						</div>
						<div className="comment-actions">
						{/* owner actions: edit / delete */}
						{!isDeleted && isOwner && (
						<div className="d-flex gap-2 align-items-center">
							<button type="button" className="btn btn-sm btn-link p-0 text-muted" title="Edit comment" onClick={(e)=>{ e.stopPropagation(); onEdit && onEdit(); }}>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.854a.5.5 0 0 1 .708 0l2.292 2.292a.5.5 0 0 1 0 .708l-9.193 9.193a.5.5 0 0 1-.168.11l-4 1.5a.5.5 0 0 1-.65-.65l1.5-4a.5.5 0 0 1 .11-.168L12.146.854zM11.207 2L3 10.207V12h1.793L14 3.793 11.207 2z"/></svg>
							</button>
							<button type="button" className="btn btn-sm btn-link p-0 text-danger" title="Delete comment" onClick={(e)=>{ e.stopPropagation(); onDelete && onDelete(); }}>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 5h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-7zM14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 1 1 0-2H5.5l.71-1.42A1 1 0 0 1 7.07 0h1.86c.34 0 .66.18.85.48L10.5 2H13.5a1 1 0 0 1 1 1z"/></svg>
							</button>
						</div>
						)}
						</div>
					</div>
					<div className="comment-body">
						{isDeleted ? (
							<span className="text-muted">
								This message is deleted by the owner
							</span>
						) : ( isHidden ? (
							<span className="text-muted">
								This message is hidden by admin. {hiddenReasons && `Reason: ${hiddenReasons}`}
							</span>
						) : (
							<div dangerouslySetInnerHTML={{ __html: sanitizeHTML(text) }} />
						) ) }
					</div>
					{!isDeleted && !isHidden && imageUrl && (
						<div className="mt-2">
							<img src={imageUrl} alt="comment" style={{maxWidth:'100%', borderRadius:8}} />
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

// Minimal sanitizer: remove script tags to reduce XSS risk. This is NOT a full sanitizer.
function sanitizeHTML(s){
	if(!s) return ''
	try{
			// remove <script>...</script>
		return s.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
	}catch(e){
		return ''
	}
}
