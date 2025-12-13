import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export default function useModalBackground() {
  const location = useLocation();
  const [background, setBackground] = useState(null);

  useEffect(() => {
    // If this navigation carries a background, store it (opening a modal)
    if (location.state?.background) {
      setBackground(location.state.background);
      return;
    }

    // Otherwise clear any stored background so consumers re-render and use the
    // real current location instead of a stale background.
    if (background !== null) setBackground(null);
  }, [location]);

  return { location, background, };
}
