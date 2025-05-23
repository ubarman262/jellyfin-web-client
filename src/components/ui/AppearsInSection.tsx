import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Items, MediaItem } from "../../types/jellyfin";
import MediaRow from "./MediaRow";

const AppearsInSection: React.FC<{ personId: string }> = ({ personId }) => {
  const { api } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api || !personId) return;
    setLoading(true);

    api
      .getPersonMedia(personId)
      .then((res: Items) => {
        setMedia(res.Items ?? []);
      })
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }, [api, personId]);

  const movies = media.filter((item) => item.Type === "Movie");
  const shows = media.filter((item) => item.Type === "Series");

  return (
    <div>
      <MediaRow title="Movies" items={movies} isLoading={loading} />
      <MediaRow title="Shows" items={shows} isLoading={loading} />
    </div>
  );
};

export default AppearsInSection;
