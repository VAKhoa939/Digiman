import React from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "../smallComponents/Spinner";
import MangaCard from "../smallComponents/MangaCard";
import "../../custom.css";

export default function MangaList({
  title = "List",
  items = [],
  loading = false,
  error = null,
  viewAllPath = null,
  className = "",
}) {
  const navigate = useNavigate();

  const handleViewAll = () => {
    navigate(viewAllPath);
  };

  return (
    <section className={`manga-list ${className}`}>

      <div className="manga-list-header">

        <h5 className="manga-list-title">
          {title}
        </h5>

        {viewAllPath && !loading && !error && (
          <div className="manga-list-actions">

            <button
              className="catalog-btn"
              onClick={handleViewAll}
            >
              View All
            </button>

            <button
              className="btn btn-sm catalog-btn outline"
              onClick={handleViewAll}
            >
              View All
            </button>

          </div>
        )}

      </div>

      {loading && <Spinner />}

      {error ? (
        <p className="text-danger">
          {typeof error === "string"
            ? error
            : `Failed to load ${title.toLowerCase()}.`}
        </p>
      ) : (
        <div className="manga-list-grid">

          {items.map((item) => (
            <MangaCard
              key={item.id}
              {...item}
            />
          ))}

        </div>
      )}

    </section>
  );
}