import React, { useState, useEffect } from "react";
import HomeNavbar from "../../components/Navbar/homeNavbar";
import Landing from "../../components/Landing/landing";
import Footer from "../../components/Footer/footer";
import LightTheme from "../../layouts/Light";
import CubeLoader from "../../components/Loaders/cubeLoader";

const LandingPage = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  }, []);

  return (
    <>
      <LightTheme>
        {loading ? (
          <CubeLoader />
        ) : (
          <>
            <HomeNavbar />
            <Landing />
            <Footer />
          </>
        )}
      </LightTheme>
    </>
  );
};

export default LandingPage;
