import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";

export interface CarouselDestination {
  slug: string;
  name: string;
  country: string;
  summary: string;
  image: string;
  imageAlt: string;
}

// React island: rendered to HTML at build (so every card is in the page for
// readers and crawlers without JavaScript), then hydrated for swiping.
export default function DestinationCarousel({ destinations }: { destinations: CarouselDestination[] }) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [canScroll, setCanScroll] = useState({ prev: false, next: true });

  useEffect(() => {
    if (!api) return;
    const update = () => setCanScroll({ prev: api.canScrollPrev(), next: api.canScrollNext() });
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  return (
    <div>
      <div className="mb-6 flex justify-end gap-2">
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => api?.scrollPrev()} disabled={!canScroll.prev} aria-label="Previous destinations">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => api?.scrollNext()} disabled={!canScroll.next} aria-label="More destinations">
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <Carousel setApi={setApi} opts={{ align: "start" }}>
        <CarouselContent className="-ml-4">
          {destinations.map((d) => (
            <CarouselItem key={d.slug} className="pl-4 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
              <a href={`/destinations/${d.slug}`} className="group block overflow-hidden rounded-xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-lg">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={d.image} alt={d.imageAlt} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wide text-udan-gray">{d.country}</p>
                  <h3 className="text-lg font-semibold text-udan-charcoal">{d.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-udan-gray">{d.summary}</p>
                </div>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
