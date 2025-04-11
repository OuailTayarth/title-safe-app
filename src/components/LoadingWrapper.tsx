import React, { useEffect, useState } from "react";
import { LoadingWrapperProps } from "../models/loading";
import CubeLoader from "./Loaders/cubeLoader";

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  children,
  delay = 3000,
}) => {
  // Define use state
  const [loading, setLoading] = useState<boolean>(true);

  // useEffect
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return loading ? <CubeLoader /> : <>{children}</>;
};

export default LoadingWrapper;
