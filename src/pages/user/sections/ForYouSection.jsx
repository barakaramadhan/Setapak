import PlaceCard from "./PlaceCard";

export default function ForYouSection({ data }) {
  return (
    <>
      {Object.entries(data).map(([category, places]) => (
        <section key={category} className="mb-8 bg-bright-white">
          <h2 className="text-lg font-bold mb-3">{category}</h2>

          <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2 max-sm:grid-cols-1">
            {places.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}