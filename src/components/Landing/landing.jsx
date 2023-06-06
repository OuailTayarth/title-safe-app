import Link from "next/link";

const Landing = () => {
  return (
    <header className="slider-stwo valign position-re">
      <div className="container">
        <div className="row">
          <div className="col-lg-6 valign">
            <div className="caption">
              <h1 className="mb-10" id="titleh1">
                Record Your Home Title SMARTER
              </h1>
              <p>
                Experience the transformative power of blockchain technology in
                the realm of county property titles. Our innovative solution
                revolutionizes the way counties record and manage property
                titles, bringing unparalleled transparency, security, and
                efficiency to the process.
              </p>
              <div className="butons ">
                <Link href={`/recordtitles`} className="butn bord mt-30">
                  <span className="buttonText">Launch App</span>
                </Link>

                <Link
                  href={`/`}
                  className="butn bord mt-30"
                  id="connect-button">
                  <span className="buttonText">Documentation</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="col-lg-5 offset-lg-1 mt-25">
            <div className="img">
              <img src="/img/blockbg.jpg" id="borderRaduis" alt="" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Landing;
