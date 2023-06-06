import React, { useEffect, useState } from "react";
import NavbarDapp from "../components/Navbar/navbarDapp";
import Footer from "../components/Footer/footer";
import DarkTheme from "../layouts/Dark";
import CubeLoader from "../components/Loaders/cubeLoader";
import RecorderOfficeTitles from "../components/PropertyTitles/RecorderOfficeTitles";

const RecorderOffice = () => {
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
            <NavbarDapp />
            <RecorderOfficeTitles />
            <Footer />
          </>
        )}
      </DarkTheme>
    </>
  );
};

export default RecorderOffice;
