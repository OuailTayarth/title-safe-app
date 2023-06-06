import React, { useState, useEffect } from "react";
import NavbarDapp from "../components/Navbar/navbarDapp";
import Footer from "../components/Footer/footer";
import DarkTheme from "../layouts/Dark";
import MyPropertiesTitles from "../components/PropertyTitles/MyPropertiesTitles";
import CubeLoader from "../components/Loaders/cubeLoader";

const MyTitles = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  }, []);

  return (
    <>
      <DarkTheme>
        {loading ? (
          <CubeLoader />
        ) : (
          <>
            <NavbarDapp theme="themeL" />
            <MyPropertiesTitles />
            <Footer />
          </>
        )}
      </DarkTheme>
    </>
  );
};

export default MyTitles;
