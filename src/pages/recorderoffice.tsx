import React from "react";
import NavbarDapp from "../components/Navbar/navbarDapp";
import Footer from "../components/Footer/footer";
import DarkTheme from "../layouts/Dark";
import RecorderOfficeTitles from "../components/PropertyTitles/RecorderOfficeTitles";
import LoadingWrapper from "../components/LoadingWrapper";

const RecorderOffice = (): JSX.Element => {
  return (
    <DarkTheme>
      <LoadingWrapper>
        <NavbarDapp theme="themeL" />
        <RecorderOfficeTitles />
        <Footer />
      </LoadingWrapper>
    </DarkTheme>
  );
};

export default RecorderOffice;
