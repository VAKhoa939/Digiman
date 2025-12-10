import { useLocation } from "react-router-dom";
import { useRef } from "react";

export default function useModalBackground() {
  const location = useLocation();
  const backgroundRef = useRef(null);

  // Save background when opening modal
  if (location.state?.background) {
    backgroundRef.current = location.state.background;
  }

  return {
    location,
    background: backgroundRef.current,
  };
}
