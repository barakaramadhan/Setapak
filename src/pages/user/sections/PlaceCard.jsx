export default function PlaceCard({ place }) {
  return (
    <div className="flex flex-col">
      <img
        src={place.image}
        alt={place.name}
        className="w-full aspect-[4/3] object-cover rounded-2xl bg-gray-200"
      />

      <div className="flex items-center justify-between gap-2 mt-2">
        <h3 className="font-semibold truncate">{place.name}</h3>
        <span className="text-sm shrink-0">★ {place.rating}</span>
      </div>

      <p className="text-sm text-gray-600 line-clamp-2">{place.address}</p>
    </div>
  );
}