import React from "react";
import NavbarDapp from "../components/Navbar/navbarDapp";
import RecordTitles from "../components/RecordProperty/RecordTitles";
import Footer from "../components/Footer/footer";
import DarkTheme from "../layouts/Dark";
import LoadingWrapper from "../components/LoadingWrapper";

const Record = (): JSX.Element => {
  return (
    <DarkTheme>
      <LoadingWrapper>
        <NavbarDapp theme="themeL" />
        <RecordTitles />
        <Footer />
      </LoadingWrapper>
    </DarkTheme>
  );
};

export default Record;
