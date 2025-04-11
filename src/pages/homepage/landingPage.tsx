import React from "react";
import HomeNavbar from "../../components/Navbar/homeNavbar";
import Landing from "../../components/Landing/landing";
import Footer from "../../components/Footer/footer";
import LightTheme from "../../layouts/Light";
import LoadingWrapper from "../../components/LoadingWrapper";

const LandingPage = (): JSX.Element => {
  return (
    <LightTheme>
      <LoadingWrapper>
        <HomeNavbar theme="themeL" />
        <Landing />
        <Footer />
      </LoadingWrapper>
    </LightTheme>
  );
};

export default LandingPage;
