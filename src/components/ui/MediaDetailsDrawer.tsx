import { Calendar, Clock, Heart, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  BrowserView,
  isBrowser,
  isMobile,
  MobileView,
} from "react-device-detect";
import { Sheet } from "react-modal-sheet";
import { useLocation, useNavigate } from "react-router-dom";
import { useRecoilState } from "recoil";
import Rotten from "../../assets/png/rotten.png";
import { useAuth } from "../../context/AuthContext";
import { useMediaItem } from "../../hooks/useMediaData";
import activeItem from "../../states/atoms/ActiveItem";
import isDrawerOpen from "../../states/atoms/DrawerOpen";
import { formatRuntime } from "../../utils/formatters";
import {
  getDirectors,
  getStudios,
  getWriters,
  typeEpisode,
  typeSeries,
} from "../../utils/items";
import CastList from "./CastList";
import EpisodesList from "./EpisodesList";
import MarkWatchedButton from "./MarkWatchedButton";
import MoreLikeThisSection from "./MoreLikeThisSection";
import PlayButton from "./playButton";
import YouTubeWithProgressiveFallback from "./YouTubeWithProgressiveFallback";
import { DRAWER_PATHS } from "../../types/jellyfin";

const MediaDetailsDrawer = () => {
  const { api } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeItemId, setActiveItemId] = useRecoilState(activeItem);
  const [open, isOpen] = useRecoilState(isDrawerOpen);
  const { item } = useMediaItem(activeItemId);

  // --- Fix: Sync activeItem atom with URL on mount ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const itemId = params.get("item");
    if (itemId && itemId !== "string" && activeItemId !== itemId) {
      setActiveItemId(itemId);
    }
    // Only run on mount or when location.search changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
  // ---------------------------------------------------

  const [isWatched, setIsWatched] = useState<boolean>(false);
  const [isFavourite, setIsFavourite] = useState<boolean>(false);

  const isEpisode = typeEpisode(item);
  const isSeries = typeSeries(item);

  const jellyserr = import.meta.env.VITE_JELLYSEERR;

  useEffect(() => {
    // Sync local watched state with item.UserData?.Played when item changes
    setIsWatched(!!item?.UserData?.Played);
    setIsFavourite(!!item?.UserData?.IsFavorite);
  }, [activeItemId, item]);

  // Open modal if URL has ?item={itemId}
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const itemId = params.get("item");
    if (itemId) {
      isOpen(true);
    }
  }, [location.search, isOpen]);

  // When modal opens, update URL to /home?item={itemId}
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const currentItem = params.get("item");
    // Determine base path for navigation
    // Use drawerPaths to determine base path, fallback to "/home"
    const basePath = DRAWER_PATHS.find((p) => location.pathname.startsWith(p)) ?? "/home";
    if (open && activeItemId && currentItem !== activeItemId) {
      params.set("item", activeItemId);
      navigate(
      { pathname: basePath, search: params.toString() },
      { replace: false }
      );
    }
    // When modal closes, remove ?item from URL if present
    if (!open && currentItem) {
      params.delete("item");
      const basePath = DRAWER_PATHS.find((p) => location.pathname.startsWith(p)) ?? "/home";
      navigate(
        { pathname: basePath, search: params.toString() },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeItemId, location.search]);

  if (!activeItemId) return null;
  // Only render content when the loaded item's ID matches the activeItemId
  const isCorrectItem = !!item && !!activeItemId && item.Id === activeItemId;

  if (!item || !api || !isCorrectItem) {
    // Show a skeleton structure while waiting for the correct item
    return open ? (
      <Sheet
        key={activeItemId}
        className="w-full max-w-4xl mx-auto"
        isOpen={open}
        onClose={() => isOpen(false)}
        snapPoints={[1, 0]}
        initialSnap={0}
        disableDrag={false}
        tweenConfig={{ ease: "easeOut", duration: 0.3 }}
      >
        <Sheet.Container className="!bg-neutral-900 !rounded-t-xl">
          <Sheet.Content className="!rounded-t-xl">
            <Sheet.Scroller className="rounded-t-xl scrollbar-hide">
              <div>
                {/* Skeleton for backdrop */}
                <div className="relative w-full aspect-[16/8] bg-gray-800 rounded-t-xl overflow-hidden animate-pulse">
                  <div className="absolute bottom-6 left-8 flex items-center gap-4">
                    {/* Skeleton play button */}
                    <div className="w-16 h-16 bg-gray-700 rounded-full" />
                    {/* Skeleton for watched/fav buttons */}
                    <div className="w-10 h-10 bg-gray-700 rounded-full" />
                    <div className="w-10 h-10 bg-gray-700 rounded-full" />
                  </div>
                </div>
                {/* Skeleton for details */}
                <div className="p-8 pt-6">
                  <div className="h-8 w-2/3 bg-gray-700 rounded mb-4 animate-pulse" />
                  <div className="h-4 w-1/3 bg-gray-700 rounded mb-2 animate-pulse" />
                  <div className="h-4 w-1/2 bg-gray-700 rounded mb-2 animate-pulse" />
                  <div className="h-4 w-1/4 bg-gray-700 rounded mb-6 animate-pulse" />
                  <div className="flex gap-2 mb-4">
                    <div className="h-6 w-16 bg-gray-800 rounded" />
                    <div className="h-6 w-16 bg-gray-800 rounded" />
                    <div className="h-6 w-16 bg-gray-800 rounded" />
                  </div>
                  <div className="h-4 w-full bg-gray-800 rounded mb-2 animate-pulse" />
                  <div className="h-4 w-5/6 bg-gray-800 rounded mb-2 animate-pulse" />
                  <div className="h-4 w-2/3 bg-gray-800 rounded mb-2 animate-pulse" />
                  <div className="h-4 w-1/2 bg-gray-800 rounded mb-2 animate-pulse" />
                </div>
              </div>
            </Sheet.Scroller>
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop
          onTap={() => isOpen(false)}
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.55)",
          }}
        />
      </Sheet>
    ) : null;
  }

  // Get director(s)
  const directors = getDirectors(item);

  // Get writers
  const writers = getWriters(item);

  // Get studios
  const studios = getStudios(item);

  const onClose = () => {
    isOpen(false);
    // URL will be handled by useEffect above
  };

  return (
    <Sheet
      key={activeItemId}
      className="w-full max-w-4xl mx-auto"
      isOpen={open}
      onClose={onClose}
      snapPoints={[1, 0]}
      initialSnap={0}
      disableDrag={false}
      tweenConfig={{ ease: "easeOut", duration: 0.3 }}
    >
      <Sheet.Container
        className="!bg-neutral-900 !rounded-t-xl"
        style={{
          transform: "translateZ(0)", // triggers GPU acceleration
          backfaceVisibility: "hidden",
        }}
      >
        <Sheet.Content
          className="!rounded-t-xl"
          style={{ WebkitOverflowScrolling: "touch", willChange: "transform" }}
        >
          <Sheet.Scroller
            draggableAt="top"
            className="rounded-t-xl scrollbar-hide"
          >
            <div>
              {/* Close button */}
              <button
                className={`absolute top-4 right-4 z-30 bg-black/30 border-2 rounded-full p-2 hover:bg-black/50 transition-colors flex items-center justify-center ${
                  isMobile ? "p-1" : "p-2"
                }`}
                style={{
                  borderColor: "rgb(255 255 255 / 32%)",
                  display: "inline-flex",
                }}
                onClick={onClose}
                aria-label="Close"
              >
                <X
                  size={isMobile ? 16 : 18}
                  strokeWidth={2}
                  color="rgb(255 255 255 / 60%)"
                />
              </button>

              {/* Trailer/Backdrop area */}
              <div className="relative w-full aspect-[16/8] bg-black rounded-t-xl overflow-hidden">
                {/* Trailer video, only show if not ended */}

                <YouTubeWithProgressiveFallback
                  key={activeItemId}
                  item={item}
                />

                {/* Play button over video, bottom left */}
                {isBrowser && (
                  <div className="absolute bottom-2 left-4 z-30 flex items-center gap-2 ml-4">
                    <PlayButton
                      itemId={item.Id}
                      type={item.Type}
                      width={200}
                      height={50}
                    />
                    {/* Watched checkmark with transition */}
                    <MarkWatchedButton
                      item={item}
                      isWatched={isWatched}
                      setIsWatched={setIsWatched}
                    />
                    {/* Favourite button with transition */}
                    <button
                      type="button"
                      className="relative bg-white/10 rounded-full p-2 ml-2 border-2 border-white flex items-center justify-center cursor-pointer"
                      title={
                        isFavourite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      aria-pressed={isFavourite}
                      aria-label={
                        isFavourite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      style={{
                        lineHeight: 0,
                        width: 37.2,
                        height: 37.2,
                        transition: "background 0.2s",
                      }}
                      onClick={async () => {
                        try {
                          await api.markAsFavourite(item.Id, !isFavourite);
                          setIsFavourite((prev) => !prev);
                        } catch (err) {
                          console.error("Error toggling favorite:", err);
                        }
                      }}
                      tabIndex={0}
                    >
                      {/* Outlined Heart icon */}
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: isFavourite ? 0 : 1,
                          transform: isFavourite ? "scale(0.7)" : "scale(1)",
                          transition: "opacity 0.25s, transform 0.25s",
                          pointerEvents: isFavourite ? "none" : "auto",
                        }}
                      >
                        <Heart size={18} />
                      </span>
                      {/* Filled Heart icon */}
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: isFavourite ? 1 : 0,
                          transform: isFavourite ? "scale(1)" : "scale(0.7)",
                          transition: "opacity 0.25s, transform 0.25s",
                          pointerEvents: isFavourite ? "auto" : "none",
                        }}
                      >
                        <Heart size={18} fill="#fff" />
                      </span>
                    </button>
                  </div>
                )}

                {/* Fade overlay between video and details */}
                <BrowserView>
                  <div
                    className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(to bottom, rgba(23,23,23,0) 0%, #171717 90%)",
                      zIndex: 10,
                    }}
                  />
                </BrowserView>
              </div>

              {/* Details */}
              <div className="relative p-8 pt-6 bg-neutral-900 rounded-b-lg">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left column: text details */}
                  <div className="flex-1 min-w-0">
                    {/* Title and episode info */}
                    {isEpisode ? (
                      <>
                        <div className="text-3xl md:text-4xl font-bold mb-0">
                          <span className="text-white">{item.SeriesName}</span>
                        </div>
                        <div className="text-base font-semibold text-white mt-1 mb-2">
                          {item.ParentIndexNumber !== undefined &&
                          item.IndexNumber !== undefined ? (
                            <>
                              Season {item.ParentIndexNumber} -{" "}
                              {item.IndexNumber}. {item.Name}
                            </>
                          ) : (
                            item.Name
                          )}
                        </div>
                      </>
                    ) : (
                      <h2 className="text-2xl md:text-4xl font-bold mb-2">
                        {item.Name}
                      </h2>
                    )}
                    <MobileView>
                      <div className="mt-5 mb-5 text-lg">
                        {/* Added text-lg for larger font on mobile */}
                        <PlayButton
                          itemId={item.Id}
                          type={item.Type}
                          width="100%"
                          height={50}
                        />
                      </div>
                    </MobileView>
                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 mb-2">
                      {isEpisode && item.PremiereDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={16} />
                          {new Date(item.PremiereDate).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "numeric",
                              day: "numeric",
                            }
                          )}
                        </span>
                      )}
                      {item.ProductionYear && !isEpisode && (
                        <span className="flex items-center gap-1">
                          <Calendar size={16} />
                          {item.ProductionYear}
                        </span>
                      )}
                      {item.RunTimeTicks && (
                        <span className="flex items-center gap-1">
                          <Clock size={16} />
                          {isEpisode
                            ? `${Math.round(item.RunTimeTicks / 600000000)}m`
                            : formatRuntime(item.RunTimeTicks)}
                        </span>
                      )}
                      {item.OfficialRating && (
                        <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">
                          {item.OfficialRating}
                        </span>
                      )}
                      {item.CommunityRating && (
                        <span className="flex items-center gap-1">
                          <Star
                            size={16}
                            className="text-yellow-500 fill-yellow-500"
                          />
                          {item.CommunityRating.toFixed(1)}
                        </span>
                      )}
                      {item.CriticRating && (
                        <span className="flex items-center gap-1">
                          <img src={Rotten} alt="Rotten Tomato" width={16} />
                          {item.CriticRating}%
                        </span>
                      )}
                    </div>
                    {item.Genres && item.Genres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {item.Genres.slice(0, 4).map((genre) => (
                          <span
                            key={genre}
                            className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-gray-200 mb-4">{item.Overview}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-2">
                      {directors && directors.length > 0 && (
                        <div>
                          <span className="font-semibold text-white">
                            Director:
                          </span>{" "}
                          {directors.join(", ")}
                        </div>
                      )}
                      {writers && writers.length > 0 && (
                        <div>
                          <span className="font-semibold text-white">
                            Writers:
                          </span>{" "}
                          {writers.join(", ")}
                        </div>
                      )}
                      {studios && studios.length > 0 && (
                        <div>
                          <span className="font-semibold text-white">
                            Studios:
                          </span>{" "}
                          {studios.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <MobileView>
                    <div className="flex gap-6 ml-[-8px] text-base">
                      {/* Added text-base for larger font on mobile */}
                      {/* Watched checkmark with transition */}
                      <div className="flex flex-col gap-2 items-center">
                        <MarkWatchedButton
                          item={item}
                          isWatched={isWatched}
                          setIsWatched={setIsWatched}
                        />
                        <span className="text-sm md:text-base">Watched</span>
                      </div>
                      {/* Favourite button with transition */}
                      <div className="flex flex-col gap-2 items-center">
                        <button
                          type="button"
                          className="relative bg-white/10 rounded-full p-2 border-2 border-white flex items-center justify-center cursor-pointer"
                          title={
                            isFavourite
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                          aria-pressed={isFavourite}
                          aria-label={
                            isFavourite
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                          style={{
                            lineHeight: 0,
                            width: 37.2,
                            height: 37.2,
                            transition: "background 0.2s",
                          }}
                          onClick={async () => {
                            try {
                              await api.markAsFavourite(item.Id, !isFavourite);
                              setIsFavourite((prev) => !prev);
                            } catch (err) {
                              console.error("Error toggling favorite:", err);
                            }
                          }}
                          tabIndex={0}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              try {
                                await api.markAsFavourite(
                                  item.Id,
                                  !isFavourite
                                );
                                setIsFavourite((prev) => !prev);
                              } catch (err) {
                                console.error("Error toggling favorite:", err);
                              }
                            }
                          }}
                        >
                          {/* Outlined Heart icon */}
                          <span
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: isFavourite ? 0 : 1,
                              transform: isFavourite
                                ? "scale(0.7)"
                                : "scale(1)",
                              transition: "opacity 0.25s, transform 0.25s",
                              pointerEvents: isFavourite ? "none" : "auto",
                            }}
                          >
                            <Heart size={18} />
                          </span>
                          {/* Filled Heart icon */}
                          <span
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: isFavourite ? 1 : 0,
                              transform: isFavourite
                                ? "scale(1)"
                                : "scale(0.7)",
                              transition: "opacity 0.25s, transform 0.25s",
                              pointerEvents: isFavourite ? "auto" : "none",
                            }}
                          >
                            <Heart size={18} fill="#fff" />
                          </span>
                        </button>
                        <span className="text-sm md:text-base">Favourite</span>
                      </div>
                    </div>
                  </MobileView>
                  {/* Right column: CastList */}
                  {item.People && item.People.length > 0 && isBrowser && (
                    <div className="md:w-1/3 w-full mb-4 md:mb-0">
                      <CastList key={activeItemId} people={item.People} />
                    </div>
                  )}
                </div>

                {/* Episodes list below both columns */}
                {isSeries && (
                  <div className="mt-8">
                    <EpisodesList seriesId={item.Id} />
                    {jellyserr && (
                            <span className="text-gray-400">Missing episodes or season? Request more <a className="text-white" href={jellyserr}>here</a>!</span>
                        )
                    }
                  </div>
                )}
                {isEpisode && item.SeasonId && (
                  <div className="mt-8">
                    <EpisodesList seriesId={item.SeriesId ?? item.SeasonId} />
                    {jellyserr && (
                        <span className="text-gray-400">Missing episodes or season? Request more <a className="text-white" href={jellyserr}>here</a>!</span>
                    )
                    }
                    </div>
                )}
                {item.People && item.People.length > 0 && isMobile && (
                  <div className="md:w-1/3 w-full mt-8 mb-4 md:mb-0">
                    <CastList people={item.People} />
                  </div>
                )}


                {/* More like this for movies */}
                <div className="mt-10">
                  <MoreLikeThisSection item={item} />
                </div>
              </div>
            </div>
          </Sheet.Scroller>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop
        onTap={onClose}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.55)",
        }}
      />
    </Sheet>
  );
};

export default MediaDetailsDrawer;
