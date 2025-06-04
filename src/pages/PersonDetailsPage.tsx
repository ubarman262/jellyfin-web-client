import { Calendar } from "lucide-react";
import React, { Suspense, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useRecoilState } from "recoil";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";
import isDrawerOpen from "../states/atoms/DrawerOpen";
import { MediaItem } from "../types/jellyfin";

const ShowMoreText: React.FC<{ text: string; maxLength?: number }> = ({
  text,
  maxLength = 300,
}) => {
  const [expanded, setExpanded] = useState(false);
  if (!text || text.length <= maxLength) {
    return <p className="text-gray-300">{text}</p>;
  }
  return (
    <div>
      <p className="text-gray-300">
        {expanded ? text : text.slice(0, maxLength) + "..."}{" "}
      </p>
      <button
        className="text-red-400 hover:underline mt-2 text-sm block"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
};

function getAge(birthDateStr?: string): string | null {
  if (!birthDateStr) return null;
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age}`;
}

// Lazy load AppearsInSection
const AppearsInSection = React.lazy(
  () => import("../components/ui/AppearsInSection")
);

const PersonDetailsPage: React.FC = () => {
  const { personId } = useParams<{ personId: string }>();
  const { api } = useAuth();
  const [person, setPerson] = useState<MediaItem | null>(null);
  const [personLoading, setPersonLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  const [drawerState, setDrawerState] = useRecoilState(isDrawerOpen);

  useEffect(() => {
    if (drawerState) {
      setDrawerState(false);
    }
  }, [drawerState, setDrawerState]);

  useEffect(() => {
    if (!api || !personId) return;
    setPersonLoading(true);

    api
      .getMediaItem(personId)
      .then((personData) => {
        setPerson(personData);
      })
      .catch(() => {
        setPerson(null);
      })
      .finally(() => setPersonLoading(false));
  }, [api, personId]);

  if (!api) return null;

  const personImage = (person: MediaItem | null) => {
    return person?.ImageTags?.Primary && !imgError ? (
      <img
        src={api.getImageUrlProps({itemId: person.Id, imageType: "Primary", maxWidth: 400, quality: 60})}
        alt={person.Name}
        className="w-40 h-40 rounded-full object-cover border border-gray-700"
        onError={() => setImgError(true)}
      />
    ) : (
      <div className="w-40 h-40 rounded-full bg-gray-700 flex items-center justify-center">
        <span className="text-4xl text-gray-300">
          {person?.Name?.[0] ?? ""}
        </span>
      </div>
    );
  };

  const personDetails = (person: MediaItem | null) => {
    return person ? (
      <>
        <h1 className="text-3xl font-bold">{person.Name}</h1>
        <div className="flex flex-wrap gap-4 items-center text-gray-400 text-sm mb-2">
          {person.Overview && (
            <ShowMoreText text={person.Overview} maxLength={300} />
          )}
          {person.ProductionYear && (
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar size={16} />
              <span>{person.ProductionYear}</span>
            </div>
          )}
          {person.Profession && (
            <div className="text-gray-400">{person.Profession}</div>
          )}
          <div className="flex flex-col gap-1">
            {person.PremiereDate && (
              <div>
                <span className="font-semibold text-white">Born:</span>{" "}
                {new Date(person.PremiereDate).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                })}
                {(() => {
                  const age = getAge(person.PremiereDate);
                  return age ? ` (${age} years old)` : "";
                })()}
              </div>
            )}
            {person.ProductionLocations &&
              person.ProductionLocations.length > 0 && (
                <div>
                  <span className="font-semibold text-white">Birth place:</span>{" "}
                  {person.ProductionLocations.join(", ")}
                </div>
              )}
            {person.ProviderIds?.Imdb && (
              <a
                href={`https://www.imdb.com/name/${person.ProviderIds.Imdb}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-400 hover:underline font-semibold"
              >
                IMDB
              </a>
            )}
          </div>
        </div>
      </>
    ) : (
      <div className="h-8 bg-gray-800 rounded w-1/2 mb-2"></div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8">
          <div>
            {personLoading ? (
              <div className="w-40 h-40 rounded-full bg-gray-800 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
              </div>
            ) : (
              personImage(person)
            )}
          </div>
          <div className="flex-1 space-y-2">
            {personLoading ? (
              <div className="h-8 bg-gray-800 rounded w-1/2 mb-2 animate-pulse"></div>
            ) : (
              personDetails(person)
            )}
          </div>
        </div>

        {/* Appears In section loads independently */}
        <Suspense
          fallback={
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600"></div>
            </div>
          }
        >
          {personId && <AppearsInSection personId={personId} />}
        </Suspense>
      </div>
    </div>
  );
};

export default PersonDetailsPage;
