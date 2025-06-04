import React, { useState } from "react";
import { Link } from "react-router-dom";
import { People } from "../../types/jellyfin";
import { useAuth } from "../../context/AuthContext";
import isDrawerOpen from "../../states/atoms/DrawerOpen";
import { useSetRecoilState } from "recoil";

interface CastListProps {
    people: People[];
}

const CastList: React.FC<CastListProps> = ({ people }) => {
  const { api } = useAuth();
  const [imgErrorMap, setImgErrorMap] = useState<{ [id: string]: boolean }>({});
  const setDrawerOpen = useSetRecoilState(isDrawerOpen);

    if (!people || people.length === 0) return null;

  return (
    <div className="mt-1">
      <h2 className="text-lg font-semibold mb-2">Cast</h2>
      <div className="flex flex-wrap gap-4">
        {people.slice(0, 8).map((person, idx) => {
          const personImg =
            person.PrimaryImageTag && api
                ? api.getImageUrlProps({itemId: person.Id, imageType: "Primary", maxWidth: 80, quality: 50})
                : null;
          const imgError = imgErrorMap[person.Id];
          return (
            <Link
              to={`/person/${person.Id}`}
              key={person.Id || idx}
              className="flex flex-col items-center w-20 group focus:outline-none"
              tabIndex={0}
              title={person.Name}
              onClick={() => setDrawerOpen(false)}
            >
              {personImg && !imgError ? (
                <img
                  src={personImg}
                  alt={person.Name}
                  className="w-16 h-16 rounded-full object-cover mb-1 border border-gray-700 group-hover:ring-2 group-hover:ring-red-600 transition"
                  onError={() =>
                    setImgErrorMap((prev) => ({
                      ...prev,
                      [person.Id]: true,
                    }))
                  }
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-1">
                  <span className="text-xs text-gray-300">
                    {person.Name[0]}
                  </span>
                                </div>
                            )}
                            <span className="text-xs text-gray-200 text-center truncate w-full group-hover:underline">
                {person.Name}
              </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default CastList;
