import React from "react";
import { twMerge } from "tailwind-merge";

function InputField({ className, ...props }) {
  return (
    <input
      {...props} // Otomatis menerima type="text", placeholder, dll
      className={twMerge(
        // Default style: tanpa border, tapi muncul saat di-klik (focus)
        "px-4 py-3 text-base text-grey-light bg-transparent outline-none rounded-lg transition-all font-jakarta font-normal ",
        "border border-transparent",
        "focus:border-gray-400 focus:ring-1 focus:ring-gray-400",
        // className tambahan dari luar akan menggabungkan/menimpa style default dengan aman
        className
      )}
    />
  );
}

export default InputField;