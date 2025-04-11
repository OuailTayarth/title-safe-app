/* eslint-disable @next/next/no-css-tags */
import React from "react";
import Head from "next/head";
import { LightThemeProps } from "../models/themes";

const LightTheme: React.FC<LightThemeProps> = ({
  children,
  mobileappstyle = false,
}) => {
  React.useEffect(() => {
    window.theme = "light";
  }, []);
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/css/light.css" />
        {mobileappstyle ? (
          <link href="/css/mobile-app-light.css" rel="stylesheet" />
        ) : (
          ""
        )}
      </Head>
      {children}
    </>
  );
};

export default LightTheme;
