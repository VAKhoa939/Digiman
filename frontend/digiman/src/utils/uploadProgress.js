export default function uploadProgressHandler(ev, setUploadProgress) {
	if (!ev.lengthComputable) return
	setUploadProgress(Math.round((ev.loaded / ev.total) * 100))
}