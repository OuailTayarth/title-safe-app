import React from "react";
import NavbarDapp from "../components/Navbar/navbarDapp";
import Footer from "../components/Footer/footer";
import DarkTheme from "../layouts/Dark";
import MyPropertiesTitles from "../components/PropertyTitles/MyPropertiesTitles";
import LoadingWrapper from "../components/LoadingWrapper";

const MyTitles = (): JSX.Element => {
  return (
    <DarkTheme>
      <LoadingWrapper>
        <NavbarDapp theme="themeL" />
        <MyPropertiesTitles />
        <Footer />
      </LoadingWrapper>
    </DarkTheme>
  );
};

export default MyTitles;
