import { twMerge } from "tailwind-merge";

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  className,
  thumbClassName,
  ...props
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={twMerge(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        checked ? "bg-arctic-blue" : "bg-grey-label/50",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      <span
        className={twMerge(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0.5",
          thumbClassName
        )}
      />
    </button>
  );
}

export default ToggleSwitch;