import React, { useState, useEffect } from "react";
import NavbarDapp from "../components/Navbar/navbarDapp";
import RecordTitles from "../components/RecordProperty/RecordTitles";
import Footer from "../components/Footer/footer";
import DarkTheme from "../layouts/Dark";
import CubeLoader from "../components/Loaders/cubeLoader";

const Record = () => {
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
            <RecordTitles />
            <Footer />
          </>
        )}
      </DarkTheme>
    </>
  );
};

export default Record;
