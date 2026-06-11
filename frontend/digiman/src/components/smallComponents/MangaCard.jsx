import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getTimeAgo } from "../../utils/formatTime";
import "../../custom.css";

const MangaCard = ({
  id,
  title,
  status,
  coverUrl,
  author,
  chapterCount,
  dateUpdated,
  averageRating = 0,
  readCount = 0
}) => {

  const [imgSrc, setImgSrc] = useState(
    coverUrl || "https://via.placeholder.com/210x300?text=No+Cover"
  );

  const relativeTime = getTimeAgo(dateUpdated);

  return (
    <Link
      to={`/manga/${id}`}
      className="manga-card text-decoration-none"
    >
      <div className="card bg-card text-white">
        <img
          src={imgSrc}
          alt={`${title} cover`}
          className="card-img-top manga-card-image"
          onError={() =>
            setImgSrc(
              "https://via.placeholder.com/210x300?text=No+Cover"
            )
          }
          loading="lazy"
        />

        <div className="card-body manga-card-body">

          <h6
            className="manga-card-title"
            title={title}
          >
            {title}
          </h6>

          <div className="manga-card-meta">

            <div className="manga-card-info">

              {author && (
                <div className="text-muted small">
                  {author}
                </div>
              )}

              <div className="text-muted small">
                {chapterCount} chapters
              </div>

              {relativeTime && (
                <div className="text-muted small">
                  {relativeTime}
                </div>
              )}

            </div>

            {status && (
              <span className="badge">
                {status}
              </span>
            )}

          </div>

          <div className="manga-card-footer">

            <span className="manga-rating">
              ★ {averageRating > 0
                ? averageRating.toFixed(1)
                : "—"}
            </span>

            <span className="text-muted small">
              {readCount} reads
            </span>

          </div>

        </div>
      </div>
    </Link>
  );
};

export default MangaCard;