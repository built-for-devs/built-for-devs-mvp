"use client";

import { useEffect } from "react";

export function ClearLocalStorage() {
  useEffect(() => {
    localStorage.removeItem("bfd_selected_profiles");
  }, []);

  return null;
}
