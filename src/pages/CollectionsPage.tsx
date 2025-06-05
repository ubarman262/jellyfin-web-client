import React, { useState } from "react";
import Navbar from "../components/layout/Navbar";
import MediaCard from "../components/ui/MediaCard";
import { useMediaData } from "../hooks/useMediaData";

const PAGE_SIZE = 24;

const CollectionsPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const { items, isLoading, totalItems } = useMediaData("collections", {
    limit: PAGE_SIZE,
    startIndex: page * PAGE_SIZE,
  });

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16 pl-16 pr-16">
        {(() => {
          if (isLoading) {
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => {
                  const skeletonKey = `skeleton-${page}-${i}`;
                  return (
                    <div
                      key={skeletonKey}
                      className="w-full aspect-[2/3] bg-gray-800 animate-pulse rounded-md"
                    ></div>
                  );
                })}
              </div>
            );
          } else if (items.length > 0) {
            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {items.map((item) => (
                    <MediaCard key={item.Id} item={item} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center mt-8 gap-2">
                    <button
                      className="px-4 py-2 rounded bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      className="px-4 py-2 rounded bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={page >= totalPages - 1}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            );
          } else {
            return (
              <div className="text-center py-12 text-gray-400">
                No movies found.
              </div>
            );
          }
        })()}
      </div>
    </div>
  );
};

export default CollectionsPage;
