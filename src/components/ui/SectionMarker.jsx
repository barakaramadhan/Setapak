import { twMerge } from "tailwind-merge";

export default function SectionMarker({ title, className }) {
  return (
    <div
      className={twMerge(
        "border-2 border-grey-light rounded-full w-28 h-10 flex items-center justify-center",
        className
      )}
    >
      <p className="font-jakarta font-semibold text-grey-light text-sm text-center">
        {title}
      </p>
    </div>
  );
}