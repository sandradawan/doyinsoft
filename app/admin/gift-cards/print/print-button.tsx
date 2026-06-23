"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary inline-flex items-center gap-2 px-4 py-2">
      <Printer size={15} /> Print
    </button>
  );
}
