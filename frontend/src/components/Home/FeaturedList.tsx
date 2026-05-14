import Image from "next/image";
import Link from "next/link";
import { etarBellotaFont } from "@/app/etarBellotaFont";
import {useLanguage} from "../../lib/language";

export default function FeaturedList() {
  const { t } = useLanguage();
  const items = [
    {
      title: t("Farm-Fresh Ingredients"),
      icon: "/assets-main/featuredlist-svg/cutlary-1.svg",
      description: t("Sourced daily to ensure every dish bursts with natural flavor and quality"),
      link: "/",
    },
    {
      title: t("Expert Culinary Team"),
      icon: "/assets-main/featuredlist-svg/chef-1.svg",
      description: t("Crafting each recipe with passion, precision, and years of culinary mastery"),
      link: "/",
    },
    {
      title: t("Signature Drinks Lounge"),
      icon: "/assets-main/featuredlist-svg/drinks-1.svg",
      description: t("Offering a curated selection of unique cocktails, wines, and refreshing blends"),
      link: "/",
    },
    {
      title: t("Healthy Choices"),
      icon: "/assets-main/featuredlist-svg/coffee-1.svg",
      description: t("Nutritious, balanced meals designed to nourish body and mind"),
      link: "/",
    },
  ];

  return (
    <section className="w-full bg-[#18171d] py-16">
      <div className="max-w-8xl mx-auto px-8 sm:px-24 lg:px-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, idx) => (
            <div
              key={item.title}
              className="relative px-6 py-10 text-center lg:text-left group"
            >
              {/* vertical divider except for last */}
              {idx < items.length - 1 && (
                <span className="hidden lg:block absolute right-0 top-8 bottom-8 w-px bg-[#2a2a31]" />
              )}

              <div className="flex justify-center lg:justify-start mb-6">
              <Image
  src={item.icon}
  alt={item.title}
  width={42}
  height={42}
  unoptimized
/>
  
              </div>

              <h3
                className="font-lato text-white text-xl font-bold mb-3 group-hover:text-[#f36b24] transition-colors"
                style={{ fontFamily: "var(--font-lato)" }}
              >
                {item.title}
              </h3>

              <p
                className="text-[#bdbdbd] text-md leading-relaxed mb-4 group-hover:text-white transition-colors"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                {item.description}
              </p>

              <Link
                href={item.link}
                className="italic text-[#bdbdbd] hover:text-[#f36b24] transition-colors"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                {t("Discover More")}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
