import React, { useState } from 'react'
import { useReport } from '../../customHooks/useReport'
import ReportModal from './ReportModal'

// Simple presentational Comment component. Accepts props to render a comment.
export default function Comment({
	ownerName = 'Guest', 
	text = '', 
	createdAt = null, 
	avatar = null, 
	className, 
	isOwner = false, 
	imageUrl, 
	status = 'active', 
	hiddenReasons = [],
	moderationStatus = 'safe', 
	isEdited = false, 
	isAdminView = false, 
	commentId = null, 
	isAuthenticated = false, 
	ownerId = null,
	replyTargetName = null,
	replyTargetText = null,
	onReply = () => {},
	onEdit = () => {}, 
	onDelete = () => {}, 
	
}){
	const [revealed, setRevealed] = useState(false);
	const report = useReport({ targetContentType: "comment", targetContentId: commentId });
	const userReport = useReport({ targetContentType: "user", targetContentId: ownerId });
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
	const isBanned = moderationStatus === 'banned';
	const isFlagged = moderationStatus === 'flagged';
	const isFailed = moderationStatus === 'failed';
	const hiddenReasonsList = Array.isArray(hiddenReasons) ? hiddenReasons : hiddenReasons ? [hiddenReasons] : [];
	const notDeletedOrHidden = !isDeleted && !isHidden;
	const showEdited = notDeletedOrHidden && isEdited;
	const showEditButton = notDeletedOrHidden && isOwner;
	const showDeleteButton = notDeletedOrHidden && isOwner && moderationStatus !== 'banned';
	const showBannedMessage = notDeletedOrHidden && isBanned;
	const showFlaggedTag = notDeletedOrHidden && isFlagged;
	const showFailedMessage = notDeletedOrHidden && isFailed && isOwner;
	const showReportButton = notDeletedOrHidden && !isBanned && !isFailed && !isOwner && isAuthenticated;
	const showReplyComment = notDeletedOrHidden && !isBanned && !isFailed && replyTargetName;
	const showReplyButton = notDeletedOrHidden && !isBanned && !isFailed && !isOwner && isAuthenticated;

	return (
		<div className={`comment-rect ${className||''}`}>
			<div className="comment-row">
				{avatar ? (
					<img src={avatar} alt={ownerName} className="me-3" loading="eager" style={{width:48, height:48, objectFit:'cover', borderRadius:8}} />
				) : (
					<div className="comment-avatar me-3" style={{background: avatarColor(ownerName)}}>
						{ownerName ? ownerName.charAt(0).toUpperCase() : 'G'}
					</div>
				)}

				<div className="flex-grow-1">
					<div className="d-flex align-items-start">
						<div>
							<span className="comment-username">{ownerName}</span>
							<span className="comment-meta"> • {createdAt ? new Date(createdAt).toLocaleString() : ''}</span>
							{showEdited && <span className="text-muted"> (edited)</span>}
							{showFlaggedTag && <span className="badge bg-warning text-dark ms-2" style={{fontSize:'0.7rem'}}>Flagged</span>}

							{/* report button: visible to authenticated non-owners on active comments */}
							{showReportButton && (
								<button
									type="button"
									className="btn btn-sm btn-link p-0 text-muted ms-1"
									title="Report user"
									style={{ fontSize: '0.7rem', verticalAlign: 'middle' }}
									onClick={(e) => { e.stopPropagation(); userReport.openReport(); }}
								>Report user</button>
							)}
						</div>

						{/* owner comment actions: edit / delete */}
						<div className="comment-actions">
							{(showEditButton || showDeleteButton) && (
								<div className="d-flex gap-2 align-items-center">
									{showEditButton && (
									<button type="button" className="btn btn-sm btn-link p-0 text-muted" title="Edit comment" onClick={(e)=>{ e.stopPropagation(); onEdit && onEdit(); }}>
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.854a.5.5 0 0 1 .708 0l2.292 2.292a.5.5 0 0 1 0 .708l-9.193 9.193a.5.5 0 0 1-.168.11l-4 1.5a.5.5 0 0 1-.65-.65l1.5-4a.5.5 0 0 1 .11-.168L12.146.854zM11.207 2L3 10.207V12h1.793L14 3.793 11.207 2z"/></svg>
									</button>
									)}
									{showDeleteButton && (
									<button type="button" className="btn btn-sm btn-link p-0 text-danger" title="Delete comment" onClick={(e)=>{ e.stopPropagation(); onDelete && onDelete(); }}>
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 5h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-7zM14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 1 1 0-2H5.5l.71-1.42A1 1 0 0 1 7.07 0h1.86c.34 0 .66.18.85.48L10.5 2H13.5a1 1 0 0 1 1 1z"/></svg>
									</button>
									)}
								</div>
							)}
						</div>

						{/* report button: visible to authenticated non-owners on active comments */}
						{showReportButton && (
							<button
								type="button"
								className="btn btn-sm btn-link p-0 text-muted ms-1"
								title="Report comment"
								onClick={(e) => { e.stopPropagation(); report.openReport(); }}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
									<path d="M14.778.085A.5.5 0 0 1 15 .5V8a.5.5 0 0 1-.314.464L14.5 8l.186.464-.003.001-.006.003-.023.009a12 12 0 0 1-.397.15c-.264.095-.631.223-1.047.35-.816.252-1.879.523-2.71.523-.847 0-1.548-.28-2.158-.525l-.028-.01C7.68 8.71 7.14 8.5 6.5 8.5c-.7 0-1.638.23-2.437.477A20 20 0 0 0 3 9.342V15.5a.5.5 0 0 1-1 0V.5a.5.5 0 0 1 1 0v.282c.226-.079.496-.17.79-.26C4.606.272 5.67 0 6.5 0c.84 0 1.524.277 2.121.519l.043.018C9.286.788 9.828 1 10.5 1c.7 0 1.638-.23 2.437-.477a20 20 0 0 0 1.349-.476l.019-.007.004-.002h.001"/>
								</svg>
							</button>
						)}
					</div>

					<div className="comment-body">
						{/* reply quote */}
						{showReplyComment && (
							<div className="comment-reply-quote">
								<div className="comment-reply-quote-header">
									<span className="comment-reply-quote-name">{replyTargetName}</span>
									<span className="comment-reply-quote-said">said:</span>
								</div>
								<div className="comment-reply-quote-body">
									{replyTargetText ? 
										<div dangerouslySetInnerHTML={{ __html: sanitizeHTML(replyTargetText) }} />
										: 'Original comment unavailable'
									}
								</div>
							</div>
						)}

						{/* Main comment content */}
						{isDeleted ? (
							<span className="text-muted">
								This message is deleted by the owner
							</span>
						) : ( isHidden ? (
							<span className="text-muted">
								This message is hidden by admin.
								{hiddenReasonsList.length > 0 && (
									<div className="mt-1">
										<strong>Reasons:</strong>
										<ul className="mb-0">
											{hiddenReasonsList.map((reason, index) => (
												<li key={index}>{reason}</li>
											))}
										</ul>
									</div>
								)}
							</span>
						) : showBannedMessage ? (
							<span className="text-muted">
								This comment is banned.
								{isOwner && ' You are allowed to update the comment again.'}
								{isOwner && hiddenReasonsList.length > 0 && (
									<div className="mt-1">
										<strong>Reasons:</strong>
										<ul className="mb-0">
											{hiddenReasonsList.map((reason, index) => (
												<li key={index}>{reason}</li>
											))}
										</ul>
									</div>
								)}
							</span>
						) : showFailedMessage ? (
							<span className="text-muted">
								The comment moderation process is failed or timeout. Please retry updating the comment again.
							</span>
						) : (
							<>
								{/* Comment text and image */}
								<div dangerouslySetInnerHTML={{ __html: sanitizeHTML(text) }} />
								{imageUrl && <div className="mt-2">
									<img
										src={imageUrl}
										alt="comment"
										className={`comment-image ${revealed ? 'revealed' : ''}`}
										onClick={() => setRevealed(r => !r)}
									/>
								</div>}
							</>
						) ) }
					</div>

					{/* Reply button */}
					{showReplyButton && (
						<div className="comment-footer-actions">
							<button
								type="button"
								className="btn btn-sm btn-link p-0 comment-reply-btn"
								onClick={(e)=>{ e.stopPropagation(); onReply(); }}
							>
								Reply
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Report comment modal */}
			<ReportModal
				show={report.show}
				onClose={report.closeReport}
				onSubmit={report.handleSubmit}
				loading={report.loading}
				error={report.error}
				success={report.success}
				categories={report.categories}
			/>

			{/* Report user modal */}
			<ReportModal
				show={userReport.show}
				onClose={userReport.closeReport}
				onSubmit={userReport.handleSubmit}
				loading={userReport.loading}
				error={userReport.error}
				success={userReport.success}
				categories={userReport.categories}
			/>
		</div>
	)
}

// Minimal sanitizer: remove script tags to reduce XSS risk. This is NOT a full sanitizer.
function sanitizeHTML(s){
	if(!s) return '';
	try{
		// remove <script>...</script>
		return s.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
	}catch{
		return '';
	};
}