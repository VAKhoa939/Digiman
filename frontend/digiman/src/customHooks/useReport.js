import { useState, useCallback } from "react";
import { getReportCategories, submitReport } from "../services/reportService";

const DUPLICATE_LABELS = {
    comment: "comment",
    manga_title: "manga title",
    chapter: "chapter",
    user: "user",
};

/**
 * @param {{ targetContentType: string, targetContentId: string }} target
 */
export function useReport({ targetContentType, targetContentId }) {
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const categories = getReportCategories(targetContentType);

    const openReport = useCallback(() => {
        setShow(true);
        setError(null);
        setSuccess(false);
    }, []);

    const closeReport = useCallback(() => {
        if (loading) return;
        setShow(false);
        setError(null);
        setSuccess(false);
    }, [loading]);

    const handleSubmit = useCallback(
        async ({ category, description }) => {
            setLoading(true);
            setError(null);
            try {
                await submitReport({
                    category,
                    description,
                    target_content_type: targetContentType,
                    target_content_id: targetContentId,
                });
                setSuccess(true);
                // Auto-close after a short delay so the user sees the success message
                setTimeout(() => {
                    setShow(false);
                    setSuccess(false);
                }, 2000);
            } catch (err) {
                const data = err?.response?.data;
                // DRF ValidationError returns an array, PermissionDenied returns { detail: "..." }
                const serverMsg = Array.isArray(data)
                    ? data[0]
                    : (data?.detail || err?.message || "");
                const isDuplicate = serverMsg.toLowerCase().includes("already submitted") ||
                    serverMsg.toLowerCase().includes("pending report");
                if (isDuplicate) {
                    const label = DUPLICATE_LABELS[targetContentType] || "this content";
                    setError(`You have already reported this ${label}.`);
                } else {
                    setError(serverMsg || "Failed to submit report.");
                }
            } finally {
                setLoading(false);
            }
        },
        [targetContentType, targetContentId]
    );

    return {
        categories,
        show,
        loading,
        error,
        success,
        openReport,
        closeReport,
        handleSubmit,
    };
}
