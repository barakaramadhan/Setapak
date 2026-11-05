import { useEffect, useRef } from "react";
import gsap from "gsap";
import { twMerge } from "tailwind-merge";

function FillButton({
  children,
  className = "",
  baseClassName = "ring-1 ring-inset ring-dark-brown-new text-dark-brown-new",
  fillClassName = "bg-dark-brown-new text-light-brown-new",
  ...props
}) {
  const btnRef = useRef(null);
  const fillRef = useRef(null);
  const circle = useRef({ r: 0, x: 0, y: 0 });

  const renderFill = () => {
    if (!fillRef.current) return;
    const { r, x, y } = circle.current;
    fillRef.current.style.clipPath = `circle(${r}px at ${x}px ${y}px)`;
  };

  const getPos = (e) => {
    const rect = btnRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      w: rect.width,
      h: rect.height,
    };
  };

  const maxRadius = (x, y, w, h) =>
    Math.hypot(Math.max(x, w - x), Math.max(y, h - y));

  const handleEnter = (e) => {
    const { x, y, w, h } = getPos(e);
    circle.current.x = x;
    circle.current.y = y;

    gsap.to(circle.current, {
      r: maxRadius(x, y, w, h),
      duration: 0.6,
      ease: "power3.out",
      overwrite: true,
      onUpdate: renderFill,
    });
  };

  const handleLeave = (e) => {
    const { x, y } = getPos(e);
    circle.current.x = x;
    circle.current.y = y;

    gsap.to(circle.current, {
      r: 0,
      duration: 0.5,
      ease: "power3.inOut",
      overwrite: true,
      onUpdate: renderFill,
    });
  };

  useEffect(() => {
    const target = circle.current;
    return () => gsap.killTweensOf(target);
  }, []);

  return (
    <button
      ref={btnRef}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      className={twMerge(
        "relative cursor-pointer overflow-hidden rounded-full px-8 py-3 font-jakarta font-extrabold",
        baseClassName,
        className
      )}
      {...props}
    >
      <span className="relative z-0 block whitespace-nowrap">{children}</span>

      <span
        ref={fillRef}
        aria-hidden="true"
        style={{ clipPath: "circle(0px at 0px 0px)" }}
        className={twMerge(
          "pointer-events-none absolute inset-0 z-10 flex items-center justify-center whitespace-nowrap rounded-full font-jakarta font-extrabold",
          fillClassName
        )}
      >
        {children}
      </span>
    </button>
  );
}

export default FillButton;