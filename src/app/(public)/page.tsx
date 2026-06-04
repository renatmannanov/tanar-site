import Hero from '@/components/home/Hero';
import CategoriesGrid from '@/components/home/CategoriesGrid';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import StoryBlock from '@/components/home/StoryBlock';
import LatestPosts from '@/components/home/LatestPosts';

// FeaturedProducts reads the DB at request time → keep the build out of Postgres.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoriesGrid />
      <FeaturedProducts />
      <StoryBlock />
      <LatestPosts />
    </>
  );
}
