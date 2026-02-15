"use client";

import { useEffect } from "react";

export function ClearLocalStorage() {
  useEffect(() => {
    localStorage.removeItem("bfd_selected_profiles");
    localStorage.removeItem("bfd_icp_criteria");
    localStorage.removeItem("bfd_product_description");
    localStorage.removeItem("bfd_product_url");
  }, []);

  return null;
}
