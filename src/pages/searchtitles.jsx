import React, { useEffect, useState } from "react";
import NavbarDapp from "../components/Navbar/navbarDapp";
import Footer from "../components/Footer/footer";
import DarkTheme from "../layouts/Dark";

import SearchTitles from "../components/PropertyTitles/SearchTitles";
import CubeLoader from "../components/Loaders/cubeLoader";

const Search = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const time = setTimeout(() => {
      setLoading(false);
    }, 3000);
    return () => clearTimeout(time);
  }, []);

  return (
    <>
      <DarkTheme>
        {loading ? (
          <CubeLoader />
        ) : (
          <>
            <NavbarDapp theme="themeL" />
            <SearchTitles />
            <Footer />
          </>
        )}
      </DarkTheme>
    </>
  );
};

export default Search;
