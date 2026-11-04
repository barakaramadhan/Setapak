# SETAPAK

Website perencanaan perjalanan untuk **IDN IT FEST**. SETAPAK membantu pengguna menemukan destinasi dan merencanakan perjalanan ke beberapa tempat dalam satu rute.

## Fitur

Sudah tersedia:
- Landing page (hero dengan animasi garis perjalanan, section Destinations)
- Smooth scroll dan animasi berbasis scroll

Dalam pengembangan:
- AI Planning
- Sign in dan sign up
- Halaman user

## Teknologi

React 19, Vite, Tailwind CSS v4, React Router, GSAP (ScrollTrigger), Lenis, Flaticon UIcons.

## Cara menjalankan

Pastikan Node.js sudah terpasang, lalu:

```bash
npm install
npm run dev
```

Perintah lain:

```bash
npm run build     # build untuk production
npm run preview   # lihat hasil build
npm run lint      # cek kode dengan ESLint
```

## Struktur folder

```
src/
├── animations/     # animasi GSAP (mis. HomeAnimation.js)
├── api/            # pemanggilan API
├── assets/
│   ├── fonts/      # Clash Display
│   └── images/     # gambar (format .webp)
├── components/
│   ├── layouts/    # GuestLayout, AuthLayout, UserLayout, SmoothScroll
│   ├── shared/     # komponen bersama (Navbar)
│   └── ui/         # komponen kecil (FillButton)
├── hooks/          # custom hooks
├── pages/
│   ├── guest/      # Home, Destinations, LandingPage
│   ├── auth/       # sign in / sign up
│   └── user/       # halaman user
├── store/          # state global
├── utils/          # fungsi bantu
├── App.jsx         # router
├── main.jsx
└── index.css
```

Alur halaman landing: `App.jsx` -> `GuestLayout` (Navbar) -> `LandingPage` -> section `Home` dan `Destinations`.
