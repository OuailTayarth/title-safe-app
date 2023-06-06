/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import appData from "../../data/app.json";
import { handleMobileDropdown } from "../../common/navbar";
import { useDispatch, useSelector } from "react-redux";
import { connect } from "../../redux/blockchain/blockchainActions";
import { fetchData } from "../../redux/data/dataActions";

const Navbar = ({ lr, nr, theme }) => {
  const dispatch = useDispatch();
  const blockchain = useSelector((state) => state.blockchain);

  // Fetch the accounts Redux/blockchain
  const getData = () => {
    if (blockchain.account !== "" && blockchain.smartContract !== null) {
      dispatch(fetchData(blockchain.account));
    }
  };

  return (
    <nav
      ref={nr} // to be remove and tested
      className={`navbar navbar-expand-lg change ${
        theme === "themeL" ? "light" : ""
      }`}>
      <div className="container">
        <Link href="/" className="logo">
          <span></span>
          {theme ? (
            theme === "themeL" ? (
              <img ref={lr} src={appData.darkLogo} alt="logo" />
            ) : (
              <img ref={lr} src={appData.lightLogo} alt="logo" />
            )
          ) : (
            <img ref={lr} src={appData.lightLogo} alt="logo" />
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
            <li className="nav-item">
              <Link href={`/`} className="nav-link">
                Home
              </Link>
            </li>

            <li className="nav-item">
              <Link href={`/recordtitles`} className="nav-link">
                Record Titles
              </Link>
            </li>

            <li className="nav-item">
              <Link href={`/searchtitles`} className="nav-link">
                Search Titles
              </Link>
            </li>

            <li className="nav-item">
              <Link href={`/mytitles`} className="nav-link">
                My Recorded Titles
              </Link>
            </li>

            <li className="nav-item">
              <Link href={`/recorderoffice`} className="nav-link">
                Recorder's Office
              </Link>
            </li>
          </ul>

          <button
            className="butn bord "
            id="connect-button"
            onClick={(e) => {
              e.preventDefault();
              dispatch(connect());
              getData();
            }}>
            {blockchain.walletConnected === false ? (
              "Connect Wallet"
            ) : (
              <div id="address">{blockchain.account.substring(0, 12)}...</div>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
