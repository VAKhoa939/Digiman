import React, { useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

function buildUrl(location, page, pageSize) {
  const url = new URL(window.location.origin + location.pathname + location.search);
  const params = url.searchParams;
  if (page == null) params.delete('page'); else params.set('page', String(page));
  if (pageSize == null) params.delete('page_size'); else params.set('page_size', String(pageSize));
  return url.pathname + (params.toString() ? `?${params.toString()}` : '');
}

export default function Pagination({ total = 0, page = 1, pageSize = 20, onPageChange, maxPagesToShow = 9 }) {
  const location = useLocation();
  const navigate = useNavigate();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Number(page) || 1), totalPages);

  // compute range of pages to show
  const pages = useMemo(() => {
    const half = Math.floor(maxPagesToShow / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(totalPages, start + maxPagesToShow - 1);
    start = Math.max(1, Math.min(start, end - maxPagesToShow + 1));
    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [current, totalPages, maxPagesToShow]);

  useEffect(() => {
    // SEO rel prev/next links: update document head links
    // remove existing ones we created
    const removeRel = () => {
      ['prev', 'next', 'canonical'].forEach((rel) => {
        const found = document.querySelector(`link[rel="${rel}"]`);
        if (found && found.dataset && found.dataset.fromPagination === '1') found.remove();
      });
    };

    removeRel();

    const addLink = (rel, targetPage) => {
      if (targetPage < 1 || targetPage > totalPages) return;
      const href = buildUrl(location, targetPage, pageSize);
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      link.dataset.fromPagination = '1';
      document.head.appendChild(link);
    };

    addLink('prev', current - 1);
    addLink('next', current + 1);
    // canonical: point to the current page URL
    const canonicalHref = buildUrl(location, current, pageSize);
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = canonicalHref;
    canonical.dataset.fromPagination = '1';
    document.head.appendChild(canonical);

    return () => removeRel();
  }, [current, totalPages, pageSize, location]);

  const go = (p) => {
    const url = buildUrl(location, p, pageSize);
    if (onPageChange) onPageChange(p);
    // update URL so that it is crawlable and shareable
    navigate(url, { replace: false });
  };

  if (totalPages <= 1) return null;

  return (
    <nav className="pagination-component my-3" aria-label="Pagination">
      <ul className="pagination justify-content-center">
        <li className={`page-item ${current === 1 ? 'disabled' : ''}`}>
          <Link className="page-link" to={buildUrl(location, current - 1, pageSize)} onClick={(e) => { e.preventDefault(); go(current - 1); }} aria-label="Previous page">&laquo;</Link>
        </li>

        {pages[0] > 1 && (
          <li className="page-item">
            <Link className="page-link" to={buildUrl(location, 1, pageSize)} onClick={(e) => { e.preventDefault(); go(1); }}>1</Link>
          </li>
        )}

        {pages[0] > 2 && (
          <li className="page-item disabled"><span className="page-link">…</span></li>
        )}

        {pages.map((p) => (
          <li key={p} className={`page-item ${p === current ? 'active' : ''}`} aria-current={p === current ? 'page' : undefined}>
            <Link className="page-link" to={buildUrl(location, p, pageSize)} onClick={(e) => { e.preventDefault(); go(p); }}>{p}</Link>
          </li>
        ))}

        {pages[pages.length - 1] < totalPages - 1 && (
          <li className="page-item disabled"><span className="page-link">…</span></li>
        )}

        {pages[pages.length - 1] < totalPages && (
          <li className="page-item">
            <Link className="page-link" to={buildUrl(location, totalPages, pageSize)} onClick={(e) => { e.preventDefault(); go(totalPages); }}>{totalPages}</Link>
          </li>
        )}

        <li className={`page-item ${current === totalPages ? 'disabled' : ''}`}>
          <Link className="page-link" to={buildUrl(location, current + 1, pageSize)} onClick={(e) => { e.preventDefault(); go(current + 1); }} aria-label="Next page">&raquo;</Link>
        </li>
      </ul>
    </nav>
  );
}

Pagination.propTypes = {
  total: PropTypes.number,
  page: PropTypes.number,
  pageSize: PropTypes.number,
  onPageChange: PropTypes.func,
  maxPagesToShow: PropTypes.number,
};
