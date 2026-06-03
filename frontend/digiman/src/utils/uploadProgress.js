export default function uploadProgressHandler(ev, setUploadProgress) {
	if (!ev.lengthComputable) return
	const raw = Math.round((ev.loaded / ev.total) * 100)
	// Keep at most 95% until the request fully resolves.
	setUploadProgress(Math.min(raw, 95))
}