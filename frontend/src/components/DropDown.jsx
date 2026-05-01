import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dropdown({ label, items = [] }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 text-sm font-medium text-[#0F172A] hover:text-blue-600 transition-colors"
      >
        {label}
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={3}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            {items.map((item, index) => {
              if (item.type === "divider") {
                return (
                  <div key={index} className="border-t border-slate-100 my-1" />
                );
              }

              if (item.type === "button" || item.onClick) {
                return (
                  <button
                    key={index}
                    onClick={() => {
                      item.onClick?.();
                      setOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                      item.danger ? "text-red-600 font-medium" : "text-gray-700"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              }

              return (
                <Link
                  key={index}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-50 transition-colors"
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}