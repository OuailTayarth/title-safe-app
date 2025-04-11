import React from "react";
import NavbarDapp from "../components/Navbar/navbarDapp";
import Footer from "../components/Footer/footer";
import DarkTheme from "../layouts/Dark";
import LoadingWrapper from "../components/LoadingWrapper";
import SearchTitles from "../components/PropertyTitles/SearchTitles";

const Search = (): JSX.Element => {
  return (
    <DarkTheme>
      <LoadingWrapper>
        <NavbarDapp theme="themeL" />
        <SearchTitles />
        <Footer />
      </LoadingWrapper>
    </DarkTheme>
  );
};

export default Search;
