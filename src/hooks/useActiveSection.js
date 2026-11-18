import { useEffect, useState } from "react";
import { getSectionTop } from "../utils/scroll";

// Mengembalikan id section yang sedang aktif berdasarkan posisi scroll.
// Section aktif = section terakhir yang bagian atasnya sudah melewati
// garis acuan (default 40% tinggi layar). Di dasar halaman, id terakhir aktif.
function useActiveSection(ids, lineRatio = 0.4) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;

      const line = window.scrollY + window.innerHeight * lineRatio;
      const atBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;

      let current = ids[0];
      let best = -Infinity;

      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        const top = getSectionTop(el);
        if (top <= line && top > best) {
          best = top;
          current = id;
        }
      });

      if (atBottom) current = ids[ids.length - 1];

      setActive(current);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ids, lineRatio]);

  return active;
}

export default useActiveSection;
