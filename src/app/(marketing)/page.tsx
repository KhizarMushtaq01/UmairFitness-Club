import {
  getPublicClasses,
  getPublicGallery,
  getPublicPlans,
  getPublicPosts,
  getPublicTrainers,
  getSiteStats,
} from "@/features/marketing/queries";
import { Hero } from "@/components/marketing/sections/Hero";
import { StatsBar } from "@/components/marketing/sections/StatsBar";
import { Disciplines } from "@/components/marketing/sections/Disciplines";
import { NextSessions } from "@/components/marketing/sections/NextSessions";
import { HowItWorks } from "@/components/marketing/sections/HowItWorks";
import { CoachesPreview } from "@/components/marketing/sections/CoachesPreview";
import { GalleryStrip } from "@/components/marketing/sections/GalleryStrip";
import { Membership } from "@/components/marketing/sections/Membership";
import { Testimonials } from "@/components/marketing/sections/Testimonials";
import { LatestPosts } from "@/components/marketing/sections/LatestPosts";
import { Faq } from "@/components/marketing/sections/Faq";
import { FinalCta } from "@/components/marketing/sections/FinalCta";

// Reads live data, so it must not be statically prerendered — an admin's
// change has to reach the public site without a redeploy.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [classes, plans, trainers, stats, images, posts] = await Promise.all([
    getPublicClasses(),
    getPublicPlans(),
    getPublicTrainers(),
    getSiteStats(),
    getPublicGallery(),
    getPublicPosts(),
  ]);

  return (
    <>
      <Hero />
      <StatsBar stats={stats} />
      <Disciplines />
      <NextSessions classes={classes} />
      <HowItWorks />
      <CoachesPreview trainers={trainers} />
      <GalleryStrip images={images} />
      <Membership plans={plans} />
      <Testimonials />
      <LatestPosts posts={posts} />
      <Faq />
      <FinalCta />
    </>
  );
}
