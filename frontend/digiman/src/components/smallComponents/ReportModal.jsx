import React, { useEffect, useState } from "react";

const ReportModal = ({ show, onClose, onSubmit, loading = false, error = null, success = false, categories = [] }) => {
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [categoryError, setCategoryError] = useState("");

    useEffect(() => {
        if (!show) return;
        setCategory("");
        setDescription("");
        setCategoryError("");
        function onKey(e) {
            if (e.key === "Escape" && !loading) onClose();
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [show, loading, onClose]);

    if (!show) return null;

    function handleSubmit(e) {
        e.preventDefault();
        if (!category) {
            setCategoryError("Please select a category.");
            return;
        }
        setCategoryError("");
        onSubmit({ category, description });
    }

    return (
        <div>
            <div className="modal-backdrop fade show" onClick={loading ? undefined : onClose} />
            <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-label="Report">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Submit a Report</h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onClose}
                                aria-label="Close"
                                disabled={loading}
                            />
                        </div>

                        {success ? (
                            <div className="modal-body text-center py-4">
                                <p className="text-success fw-semibold mb-1">Report submitted!</p>
                                <p className="text-muted small">Thank you. Our team will review it shortly.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    {error && (
                                        <div className="alert alert-danger py-2 small mb-3">{error}</div>
                                    )}

                                    <div className="mb-3">
                                        <label htmlFor="report-category" className="form-label fw-semibold">
                                            Category <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            id="report-category"
                                            className={`form-select${categoryError ? " is-invalid" : ""}`}
                                            value={category}
                                            onChange={(e) => {
                                                setCategory(e.target.value);
                                                if (e.target.value) setCategoryError("");
                                            }}
                                            disabled={loading}
                                        >
                                            <option value="">— Select a category —</option>
                                            {categories.map((c) => (
                                                <option key={c.value} value={c.value}>
                                                    {c.label}
                                                </option>
                                            ))}
                                        </select>
                                        {categoryError && (
                                            <div className="invalid-feedback">{categoryError}</div>
                                        )}
                                    </div>

                                    <div className="mb-1">
                                        <label htmlFor="report-description" className="form-label fw-semibold">
                                            Description <span className="text-muted fw-normal">(optional)</span>
                                        </label>
                                        <textarea
                                            id="report-description"
                                            className="form-control"
                                            rows={3}
                                            placeholder="Provide additional details..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            disabled={loading}
                                            maxLength={1000}
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={onClose}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-danger"
                                        disabled={loading}
                                    >
                                        {loading ? "Submitting…" : "Submit Report"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;
