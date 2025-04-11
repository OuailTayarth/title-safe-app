/* eslint-disable @next/next/no-css-tags */
import React from "react";
import Head from "next/head";
import { DarkThemeProps } from "../models/themes";

const DarkTheme: React.FC<DarkThemeProps> = ({
  children,
  mobileappstyle = false,
}) => {
  React.useEffect(() => {
    window.theme = "dark";
  }, []);
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/css/dark.css" />
        {mobileappstyle ? (
          <link href="/css/mobile-app-dark.css" rel="stylesheet" />
        ) : (
          ""
        )}
      </Head>
      {children}
    </>
  );
};

export default DarkTheme;
