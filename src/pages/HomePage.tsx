import React, { Suspense } from "react";
import PageTemplate from "../components/layout/PageTemplate";

const HeroSection = React.lazy(
  () => import("../components/ui/Home/HeroSection"),
);
const ContinueWatchingSection = React.lazy(
  () => import("../components/ui/Home/ContinueWatchingSection"),
);
const NextUpSection = React.lazy(
  () => import("../components/ui/Home/NextUpSection"),
);
const LatestMoviesSection = React.lazy(
  () => import("../components/ui/Home/LatestMoviesSection"),
);
const LatestShowsSection = React.lazy(
  () => import("../components/ui/Home/LatestShowsSection"),
);

const HomePage: React.FC = () => {
  return (
    <PageTemplate>
      {/* Hero Section */}
      <Suspense
        fallback={
          <div className="w-full h-[85vh] bg-neutral-800 animate-pulse"></div>
        }
      >
        <HeroSection />
      </Suspense>

      {/* Content Rows */}
      <div className="px-14 mt-[20px] relative z-10 sm:mt-[-4rem] mb-16">
        <Suspense
          fallback={
            <div className="w-full h-48 mt-6 bg-neutral-800 animate-pulse rounded-md"></div>
          }
        >
          <ContinueWatchingSection />
        </Suspense>

        <Suspense
          fallback={
            <div className="w-full h-48 mt-6 bg-neutral-800 animate-pulse rounded-md"></div>
          }
        >
          <NextUpSection />
        </Suspense>

        <Suspense
          fallback={
            <div className="w-full h-48 mt-6 bg-neutral-800 animate-pulse rounded-md"></div>
          }
        >
          <LatestMoviesSection />
        </Suspense>

        <Suspense
          fallback={
            <div className="w-full h-48 mt-6 bg-neutral-800 animate-pulse rounded-md"></div>
          }
        >
          <LatestShowsSection />
        </Suspense>

        {/* Studios Section */}
        {/* <StudiosSection /> */}
      </div>
    </PageTemplate>
  );
};

export default HomePage;
