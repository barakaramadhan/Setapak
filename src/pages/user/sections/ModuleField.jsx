import InputAll from "../../../components/ui/InputAll";

const inputClass =
  "w-full rounded-xl border-grey-label/60 bg-grey-label/15 py-2 text-sm";
const labelClass = "block text-xs font-semibold text-grey-light/70";

// Satu field generik untuk seluruh 15 modul. Input memakai InputAll supaya
// tampilannya konsisten dengan form lain di aplikasi.
export default function ModuleField({ field, value, onChange, id }) {
  const teks = {
    id,
    value: value ?? "",
    onChange: (event) => onChange(event.target.value),
    placeholder: field.placeholder || "",
    "aria-label": field.label,
  };

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-xs font-semibold text-grey-light/70">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-grey-label/60 accent-[#83ADD0]"
        />
        {field.label}
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className={labelClass}>
        {field.label}
        <select
          id={id}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          aria-label={field.label}
          className={`${inputClass} mt-1 px-3 font-jakarta text-grey-light`}
        >
          <option value="">Pilih...</option>
          {(field.options || []).map((opsi) => (
            <option key={opsi} value={opsi}>
              {opsi}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className={labelClass}>
        {field.label}
        <textarea
          id={id}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder || ""}
          rows={3}
          aria-label={field.label}
          className={`${inputClass} mt-1 resize-y px-3 font-jakarta text-grey-light placeholder:text-grey-light/40`}
        />
      </label>
    );
  }

  return (
    <label className={labelClass}>
      {field.label}
      <InputAll
        {...teks}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        min={field.min}
        className={inputClass}
      />
    </label>
  );
}
