const coffeeAndSnacks = [
  {
    id: 1,
    name: "Coffe & Breads",
    rating: 4.5,
    address: "Jl. Pajajaran No. 12, Bogor",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600",
  },
  {
    id: 2,
    name: "Kopi Kenangan Hills",
    rating: 4.7,
    address: "Jl. Suryakencana No. 5, Bogor",
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600",
  },
  {
    id: 3,
    name: "Roti Unyil Venus",
    rating: 4.4,
    address: "Jl. Pangrango No. 3, Bogor",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
  },
  {
    id: 4,
    name: "Warung Kopi Bogor",
    rating: 4.6,
    address: "Jl. Ahmad Yani No. 20, Bogor",
    image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600",
  },
];

const outdoorParks = [
  {
    id: 5,
    name: "Kebun Raya Bogor",
    rating: 4.8,
    address: "Jl. Ir. H. Juanda No. 13, Bogor",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600",
  },
  {
    id: 6,
    name: "Taman Safari",
    rating: 4.6,
    address: "Jl. Raya Puncak, Cisarua",
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600",
  },
  {
    id: 7,
    name: "Curug Cilember",
    rating: 4.5,
    address: "Cisarua, Bogor",
    image: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=600",
  },
  {
    id: 8,
    name: "Gunung Pancar",
    rating: 4.4,
    address: "Babakan Madang, Bogor",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600",
  },
];

export const dummyPlaces = {
  near: {
    "Coffe And Snacks": coffeeAndSnacks,
    "Outdoor parks & Trials": outdoorParks,
  },
  in: {
    "Coffe And Snacks": [...coffeeAndSnacks].reverse(),
    "Outdoor parks & Trials": [...outdoorParks].reverse(),
  },
};