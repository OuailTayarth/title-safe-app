/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import appData from "../../data/app.json";
import { handleMobileDropdown } from "../../common/navbar";
import { NavbarProps } from "../../models/themes";

const HomeNavbar: React.FC<NavbarProps> = ({ theme }) => {
  return (
    <nav
      className={`navbar navbar-expand-lg change ${
        theme === "themeL" ? "light" : ""
      }`}>
      <div className="container">
        <Link href={`/`} className="logo">
          <span></span>
          {theme ? (
            theme === "themeL" ? (
              <img src={appData.darkLogo} alt="logo" />
            ) : (
              <img src={appData.lightLogo} alt="logo" />
            )
          ) : (
            <img src={appData.lightLogo} alt="logo" />
          )}
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          onClick={handleMobileDropdown}
          data-toggle="collapse"
          data-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation">
          <span className="icon-bar">
            <i className="fas fa-bars"></i>
          </span>
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav ml-auto">
            <li className="nav-item"></li>

            <li className="nav-item"></li>

            <li className="nav-item"></li>
          </ul>

          <Link href={`/recordtitles`} className="butn bord">
            <span className="buttonText">Launch App</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default HomeNavbar;
