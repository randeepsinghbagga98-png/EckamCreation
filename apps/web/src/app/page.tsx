import { BestSellers } from '@/components/best-sellers/best-sellers';
import { CustomerStories } from '@/components/customer-stories/customer-stories';
import { Footer } from '@/components/footer/footer';
import { Header } from '@/components/header/header';
import { Hero } from '@/components/hero/hero';
import { NewArrivals } from '@/components/new-arrivals/new-arrivals';
import { Newsletter } from '@/components/newsletter/newsletter';
import { ShopByCategory } from '@/components/shop-by-category/shop-by-category';
import { SignatureCollection } from '@/components/signature-collection/signature-collection';
import { WhyEckam } from '@/components/why-eckam/why-eckam';
import { WorldwideShopping } from '@/components/worldwide-shopping/worldwide-shopping';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-[#D6A84F]/30 selection:text-[#F0C66A]">
      <Header />

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Hero />
        <ShopByCategory />
        <NewArrivals />
        <SignatureCollection />
        <BestSellers />
        <WorldwideShopping />
        <WhyEckam />
        <CustomerStories />
        <Newsletter />
      </main>

      <Footer />
    </div>
  );
}