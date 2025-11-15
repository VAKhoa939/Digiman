import React from 'react'

// Simple presentational Comment component. Accepts props to render a comment.
export default function Comment({name = 'Guest', text = '', created_at = null, avatar = null, onClick, className}){
    // High-contrast rectangular container for comments.
    const containerStyle = {
        backgroundColor: '#ffffff', // bright background for contrast on dark themes
        color: '#111',
        padding: '12px',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        border: '1px solid rgba(0,0,0,0.08)'
    }
    const nameStyle = { marginRight: 8 }

    return (
            <div style={containerStyle} className={`comment-rect ${className||''}`} onClick={onClick}>
                <div className="d-flex" style={onClick ? {cursor: 'pointer'} : {}}>
                {avatar ? (
                    <img src={avatar} alt={name} className="rounded-circle me-3" style={{width:48, height:48, objectFit:'cover'}} />
                ) : (
                    <div className="rounded-circle bg-primary me-3 d-flex align-items-center justify-content-center text-white" style={{width:48, height:48}}>
                        {name ? name.charAt(0).toUpperCase() : 'G'}
                    </div>
                )}

                <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                        <div style={nameStyle}><strong>{name}</strong></div>
                        <small className="text-muted">{created_at ? new Date(created_at).toLocaleString() : ''}</small>
                    </div>
                    <div style={{whiteSpace: 'pre-wrap'}}>{text}</div>
                </div>
                    </div>
                </div>
    )
}
