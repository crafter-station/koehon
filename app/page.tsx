import { Header } from "@/components/layout/header";
import { Banner } from "@/components/layout/banner";
import { HeroSection } from "@/components/sections/hero-section";
import { FeaturesSection } from "@/components/sections/features-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
      <Header />
      <Banner />
      <main className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <HeroSection />
          <FeaturesSection />
        </div>
      </main>
    </div>
  );
}
