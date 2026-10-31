"use client";

import { useEffect, useState } from "react";
import UkHeader from "../../../components/uk/UkHeader";
import UkFooter from "../../../components/uk/UkFooter";
import WishlistPageClient from "../../../components/WishlistPageClient";
import { DEFAULT_STORE_SETTINGS } from "../../../data/storeSettings";
import { REGIONS } from "../../../lib/regions";

export default function UkWishlistPage() {
  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETTINGS);

  useEffect(() => {
    fetch("/api/store-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === "object") setStoreSettings(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="siteLayout">
      <UkHeader storeSettings={storeSettings} />
      <main className="bs-st cartPageLayout wishlistPageMain">
        <WishlistPageClient region="uk" />
      </main>
      <UkFooter />
    </div>
  );
}

