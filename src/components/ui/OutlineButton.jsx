
import { twMerge } from "tailwind-merge";

export default function OutlineButton({ title, className, onClick }) {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        "border border-dark-brown-new rounded-full px-8 py-3 font-jakarta text-dark-brown-new text-base flex items-center justify-center",
        className
      )}
    >
      {title}
    </button>
  );
}
