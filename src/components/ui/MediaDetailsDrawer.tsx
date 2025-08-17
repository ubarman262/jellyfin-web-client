import { Calendar, Clock, Heart, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isBrowser, isMobile, MobileView } from "react-device-detect";
import { Sheet } from "react-modal-sheet";
import { useLocation, useNavigate } from "react-router-dom";
import { useRecoilState } from "recoil";
import Rotten from "../../assets/png/rotten.png";
import { useAuth } from "../../context/AuthContext";
import { useMediaItem } from "../../hooks/useMediaData";
import activeItem from "../../states/atoms/ActiveItem";
import isDrawerOpen from "../../states/atoms/DrawerOpen";
import { DRAWER_PATHS, ItemsResponse, MediaItem } from "../../types/jellyfin";
import { formatRuntime } from "../../utils/formatters";
import {
  getDirectors,
  getStudios,
  getWriters,
  typeEpisode,
  typeSeries,
} from "../../utils/items";
import CastList from "./CastList";
import CollectionSection from "./CollectionSection";
import EpisodesList from "./EpisodesList";
import MarkWatchedButton from "./MarkWatchedButton";
import MoreLikeThisSection from "./MoreLikeThisSection";
import PlayButton from "./playButton";
import YouTubeWithProgressiveFallback from "./YouTubeWithProgressiveFallback";

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
  const [trailerStarted, setTrailerStarted] = useState(false);
  const [trailerEnded, setTrailerEnded] = useState(false);
  const [isWatched, setIsWatched] = useState<boolean>(false);
  const [isFavourite, setIsFavourite] = useState<boolean>(false);
  const [seriesDetails, setSeriesDetails] = useState<MediaItem | null>(null);

  const isEpisode = typeEpisode(item);
  const isSeries = typeSeries(item);

  // --- Item logo logic ---
  let itemLogo: string | undefined = undefined;
  if (api && item) {
    if (isEpisode && item.SeriesId && item?.ParentLogoImageTag) {
      itemLogo = api.getImageUrl(item.SeriesId, "Logo", 400);
    } else if (!isEpisode && item.ImageTags?.Logo) {
      itemLogo = api.getImageUrl(item.Id, "Logo", 400);
    }
  }
  // -----------------------

  useEffect(() => {
    // Sync local watched state with item.UserData?.Played when item changes
    setIsWatched(!!item?.UserData?.Played);
    setIsFavourite(!!item?.UserData?.IsFavorite);
  }, [activeItemId, item]);

  // Fetch series details if this is an episode or series
  useEffect(() => {
    let ignore = false;
    const fetchSeries = async () => {
      if ((isEpisode || isSeries) && item?.SeriesId && api) {
        try {
          const details = await api.getMediaItem(item.SeriesId);
          if (!ignore) setSeriesDetails(details);
        } catch {
          if (!ignore) setSeriesDetails(null);
        }
      } else if (isSeries && item?.Id) {
        // For series itself, use its own details
        setSeriesDetails(item);
      } else {
        setSeriesDetails(null);
      }
    };
    fetchSeries();
    return () => {
      ignore = true;
    };
  }, [item, isEpisode, isSeries, api]);

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
    const basePath =
      DRAWER_PATHS.find((p) => location.pathname.startsWith(p)) ?? "/home";
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
      const basePath =
        DRAWER_PATHS.find((p) => location.pathname.startsWith(p)) ?? "/home";
      navigate(
        { pathname: basePath, search: params.toString() },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeItemId, location.search]);

  // Move these hooks to the top level, before any return/conditional
  const [movieTab, setMovieTab] = useState<"collection" | "more" | "trailers">(
    "more"
  );
  const isMovie = useMemo(() => item?.Type === "Movie", [item]);

  // Track if the movie has a BoxSet
  const [hasBoxSet, setHasBoxSet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkBoxSet = async () => {
      if (api && isMovie && item?.Id) {
        try {
          const boxSet = await api.findBoxSetForItem(item);
          if (!cancelled) setHasBoxSet(!!boxSet);
          // Set tab to "more" if no boxset, otherwise "collection"
          if (!cancelled) {
            setMovieTab(boxSet ? "collection" : "more");
          }
        } catch {
          if (!cancelled) {
            setHasBoxSet(false);
            setMovieTab("more");
          }
        }
      } else {
        setHasBoxSet(false);
        setMovieTab("more");
      }
    };
    // checkBoxSet();
    return () => {
      cancelled = true;
    };
  }, [api, isMovie, item]);

  // --- Collection (BoxSet) and MoreLikeThis (Similar) state and cache ---
  const [collectionItems, setCollectionItems] = useState<MediaItem[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const collectionCache = useRef<Record<string, MediaItem[]>>({});

  const [similarItems, setSimilarItems] = useState<MediaItem[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const similarCache = useRef<Record<string, MediaItem[]>>({});

  // Add BoxSet tab state
  const isBoxSet = useMemo(() => item?.Type === "BoxSet", [item]);
  const [boxSetMovies, setBoxSetMovies] = useState<MediaItem[]>([]);
  const [boxSetLoading, setBoxSetLoading] = useState(false);
  const boxSetCache = useRef<Record<string, MediaItem[]>>({});

  // Fetch BoxSet movies when item changes and is a movie
  useEffect(() => {
    let cancelled = false;
    const fetchCollection = async () => {
      if (!api || !item?.Id || !isMovie) {
        setCollectionItems([]);
        setCollectionLoading(false);
        return;
      }
      // Check cache
      if (collectionCache.current[item.Id]) {
        setCollectionItems(collectionCache.current[item.Id]);
        setCollectionLoading(false);
        return;
      }
      setCollectionLoading(true);
      try {
        const foundBoxSet = await api.findBoxSetForItem(item);
        if (!foundBoxSet) {
          setCollectionItems([]);
          setCollectionLoading(false);
          return;
        }
        let movies = await api.getBoxSetMovies(foundBoxSet.Id);
        movies = movies.slice().sort((a, b) => {
          const aYear =
            a.ProductionYear ??
            (a.PremiereDate ? new Date(a.PremiereDate).getFullYear() : 0);
          const bYear =
            b.ProductionYear ??
            (b.PremiereDate ? new Date(b.PremiereDate).getFullYear() : 0);
          if (aYear !== bYear) return aYear - bYear;
          if (a.PremiereDate && b.PremiereDate) {
            return (
              new Date(a.PremiereDate).getTime() -
              new Date(b.PremiereDate).getTime()
            );
          }
          return 0;
        });
        if (!cancelled) {
          collectionCache.current[item.Id] = movies;
          setCollectionItems(movies);
        }
      } catch {
        if (!cancelled) setCollectionItems([]);
      } finally {
        if (!cancelled) setCollectionLoading(false);
      }
    };
    fetchCollection();
    return () => {
      cancelled = true;
    };
  }, [api, item, isMovie]);

  // Fetch Similar items when item changes
  useEffect(() => {
    let cancelled = false;
    const fetchSimilar = async () => {
      if (!api || !item) {
        setSimilarItems([]);
        setSimilarLoading(false);
        return;
      }
      const id = item.Type === "Episode" ? item.SeriesId : item.Id;
      if (!id) {
        setSimilarItems([]);
        setSimilarLoading(false);
        return;
      }
      // Check cache
      if (similarCache.current[id]) {
        setSimilarItems(similarCache.current[id]);
        setSimilarLoading(false);
        return;
      }
      setSimilarLoading(true);
      try {
        const res: ItemsResponse = await api.getSimilarItems(id, 12);
        const filtered = res.Items.filter((m) => m.Id !== id);
        if (!cancelled) {
          similarCache.current[id] = filtered;
          setSimilarItems(filtered);
        }
      } catch {
        if (!cancelled) setSimilarItems([]);
      } finally {
        if (!cancelled) setSimilarLoading(false);
      }
    };
    fetchSimilar();
    return () => {
      cancelled = true;
    };
  }, [api, item]);

  // Fetch BoxSet movies when item is a BoxSet
  useEffect(() => {
    let cancelled = false;
    const fetchBoxSetMovies = async () => {
      if (!api || !item?.Id || !isBoxSet) {
        setBoxSetMovies([]);
        setBoxSetLoading(false);
        return;
      }
      // Check cache
      if (boxSetCache.current[item.Id]) {
        setBoxSetMovies(boxSetCache.current[item.Id]);
        setBoxSetLoading(false);
        return;
      }
      setBoxSetLoading(true);
      try {
        let movies = await api.getBoxSetMovies(item.Id);
        movies = movies.slice().sort((a, b) => {
          const aYear =
            a.ProductionYear ??
            (a.PremiereDate ? new Date(a.PremiereDate).getFullYear() : 0);
          const bYear =
            b.ProductionYear ??
            (b.PremiereDate ? new Date(b.PremiereDate).getFullYear() : 0);
          if (aYear !== bYear) return aYear - bYear;
          if (a.PremiereDate && b.PremiereDate) {
            return (
              new Date(a.PremiereDate).getTime() -
              new Date(b.PremiereDate).getTime()
            );
          }
          return 0;
        });
        if (!cancelled) {
          boxSetCache.current[item.Id] = movies;
          setBoxSetMovies(movies);
        }
      } catch {
        if (!cancelled) setBoxSetMovies([]);
      } finally {
        if (!cancelled) setBoxSetLoading(false);
      }
    };
    fetchBoxSetMovies();
    return () => {
      cancelled = true;
    };
  }, [api, item, isBoxSet]);

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
        // tweenConfig={{ ease: "easeOut", duration: 0.3 }}
        // modalEffectRootId="root"
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
    setHasBoxSet(false);
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
                className={`absolute top-4 right-4 z-30 bg-black/30 border-2 rounded-full p-1 hover:bg-black/50 transition-colors flex items-center justify-center`}
                style={{
                  borderColor: "rgb(255 255 255 / 32%)",
                  display: "inline-flex",
                }}
                onClick={onClose}
                aria-label="Close"
              >
                <X
                  size={14}
                  strokeWidth={2}
                  color="rgb(255 255 255 / 60%)"
                />
              </button>

              {/* Trailer/Backdrop area */}
              <div className="relative w-full aspect-[16/9] bg-black rounded-t-xl overflow-hidden">
                {/* Trailer video, only show if not ended */}

                <YouTubeWithProgressiveFallback
                  key={activeItemId}
                  item={item}
                  trailerStarted={trailerStarted}
                  trailerEnded={trailerEnded}
                  setTrailerStarted={setTrailerStarted}
                  setTrailerEnded={setTrailerEnded}
                />

                {/* Item Logo or Name above play button */}
                {itemLogo ? (
                    <div
                      className="absolute left-8 bottom-[15px] z-20 flex items-end"
                      style={{
                        width: isMobile ? "50vw" : "32%",
                        minWidth: 100,
                        maxWidth: 400,
                        height: "auto",
                        aspectRatio: "4/1",
                        justifyContent: "flex-start",
                      }}
                    >
                      <img
                        src={itemLogo}
                        alt={`${item.Name} logo`}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "90px",
                          minHeight: "40px",
                          width: "auto",
                          height: "auto",
                          objectFit: "contain",
                          background: "rgba(0,0,0,0.0)",
                          pointerEvents: "none",
                          display: "block",
                          margin: 0,
                        }}
                      />
                    </div>
                ) : (
                  <div
                    className="absolute left-8 bottom-8 z-20 text-white font-bold md:text-4xl drop-shadow-lg"
                    style={{
                      pointerEvents: "none",
                      maxWidth: "60%",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      fontSize: isMobile ? "1.2rem" : "1.8rem",
                    }}
                  >
                    {isEpisode ? item.SeriesName : item.Name}
                  </div>
                )}

                {/* Fade overlay between video and details */}
                {/* <div
                  className="absolute bottom-12 left-0 right-0 h-[80px] pointer-events-none"
                  style={{
                    // background:
                    //   "linear-gradient(to bottom, rgba(23,23,23,0) 0%, #171717 90%)",
                    zIndex: 10,
                    // opacity: trailerStarted || trailerEnded ? 0 : 1,
                    // height: trailerStarted || trailerEnded ? "50px" : "80px",
                    // transition: "height 0.3s ease",
                  }}
                /> */}
              </div>

              {/* Details */}
              <div className="relative bottom-[0px] p-8 pt-6 bg-neutral-900 rounded-b-lg z-[2]">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left column: text details */}
                  <div className="flex-1 min-w-0">
                    {/* Title and episode info */}
                    <h2 className="text-2xl md:text-4xl mb-2">
                      {/* Play button over video, bottom left */}
                      {/* {isBrowser && ( */}
                        <div className="z-30 flex items-center mb-5">
                          <PlayButton
                            itemId={
                              isBoxSet && boxSetMovies.length > 0
                                ? boxSetMovies[0].Id
                                : item.Id
                            }
                            type={item.Type}
                            width={400}
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
                            className="relative bg-white/10 rounded-full p-2 ml-4 border-2 border-white flex items-center justify-center cursor-pointer"
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
                                await api.markAsFavourite(
                                  item.Id,
                                  !isFavourite
                                );
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
                        </div>
                      {/* )} */}
                    </h2>
                    {isEpisode && (
                      <div className="text-base font-semibold text-white mt-1 mb-4">
                        {item.ParentIndexNumber !== undefined &&
                        item.IndexNumber !== undefined ? (
                          <>
                            S{item.ParentIndexNumber} - E{item.IndexNumber}.{" "}
                            {item.Name}
                          </>
                        ) : (
                          item.Name
                        )}
                      </div>
                    )}

                    {/* <MobileView>
                      <div className="mt-5 mb-5 text-lg">
                        <PlayButton
                          itemId={
                            isBoxSet && boxSetMovies.length > 0
                              ? boxSetMovies[0].Id
                              : item.Id
                          }
                          type={item.Type}
                          width="100%"
                          height={50}
                        />
                      </div>
                    </MobileView> */}
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
                      {!isSeries && item.RunTimeTicks && (
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

                  {/* Right column: CastList */}
                  {item.People && item.People.length > 0 && (
                    <div className="md:w-1/3 w-full mb-4 md:mb-0">
                      <CastList key={activeItemId} people={item.People} />
                    </div>
                  )}
                </div>

                {/* Episodes list below both columns */}
                {!isMovie && (
                  <>
                    {isSeries && (
                      <div className="mt-8">
                        <EpisodesList seriesId={item.Id} />
                      </div>
                    )}
                    {isEpisode && item.SeasonId && (
                      <div className="mt-8">
                        <EpisodesList
                          seriesId={item.SeriesId ?? item.SeasonId}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* {!isMovie &&
                  item.People &&
                  item.People.length > 0 &&
                  isMobile && (
                    <div className="md:w-full w-full mt-8 mb-4 md:mb-0">
                      <CastList people={item.People} />
                    </div>
                  )} */}

                {/* Movie Tabs Section */}
                {(isMovie || isSeries) && (
                  <div className="mt-10">
                    {/* Tabs */}
                    {collectionLoading || similarLoading ? (
                      // Skeleton for the whole tabs section (tabs + content)
                      <div>
                        <div className="flex gap-4">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="w-[200px] h-[250px] bg-gray-800 rounded-lg animate-pulse"
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex border-b border-neutral-700 mb-4">
                          {hasBoxSet && (
                            <button
                              className={`px-4 py-2 font-semibold ${
                                movieTab === "collection"
                                  ? "border-b-2 border-red-600 text-white"
                                  : "text-gray-400"
                              }`}
                              onClick={() => setMovieTab("collection")}
                            >
                              Collection
                            </button>
                          )}
                          <button
                            className={`px-4 py-2 font-semibold ${
                              movieTab === "more"
                                ? "border-b-2 border-red-600 text-white"
                                : "text-gray-400"
                            }`}
                            onClick={() => setMovieTab("more")}
                          >
                            More Like This
                          </button>
                        </div>
                        {/* Tab Content */}
                        <div>
                          {movieTab === "collection" && hasBoxSet && (
                            <CollectionSection
                              items={collectionItems}
                              isLoading={collectionLoading}
                            />
                          )}
                          {movieTab === "more" && (
                            <MoreLikeThisSection
                              item={item}
                              items={similarItems}
                              isLoading={similarLoading}
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* --- Series Details Section --- */}
                {(isSeries || isEpisode) &&
                  (item.SeriesId || item.SeriesName) && (
                    <div>
                      <h3 className="mt-10 text-xl font-semibold text-white mb-4">
                        About
                      </h3>
                      <div className=" flex flex-col md:flex-row gap-6 items-start bg-[#262729] rounded-lg">
                        {/* Series Primary Image */}
                        {seriesDetails?.Id &&
                          seriesDetails?.ImageTags?.Primary && (
                            <img
                              src={
                                api.getImageUrl
                                  ? api.getImageUrl(
                                      seriesDetails.Id,
                                      "Primary",
                                      180
                                    )
                                  : ""
                              }
                              alt={seriesDetails.Name ?? "Series"}
                              className="rounded-l-lg w-[80px] md:w-[140px] object-cover bg-neutral-800"
                              style={{ flexShrink: 0 }}
                            />
                          )}
                        <div className="flex-1 p-6 flex flex-col justify-between h-[200px]">
                          <div className="font-semibold text-lg text-white mb-1">
                            {seriesDetails?.Name ??
                              item.SeriesName ??
                              item.Name}
                          </div>
                          <div className="text-gray-300 text-sm max-w-xl mb-2">
                            {seriesDetails?.Overview}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                {/* --- End Series Details Section --- */}

                {/* --- BoxSet Section --- */}
                {isBoxSet && (
                  <div className="mt-10">
                    {/* Tabs for BoxSet */}
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Movies{" "}
                      {boxSetMovies.length > 0 && `(${boxSetMovies.length})`}
                    </h3>
                    {/* Tab Content */}
                    <div>
                      <CollectionSection
                        items={boxSetMovies}
                        isLoading={boxSetLoading}
                      />
                    </div>
                  </div>
                )}
                {/* --- End BoxSet Section --- */}
              </div>
            </div>
          </Sheet.Scroller>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop
        onTap={onClose}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />
    </Sheet>
  );
};

export default MediaDetailsDrawer;
