import "./FooterBar.css";

export default function FooterBar() {
    return (
        <footer className="footerbar">
            <div className="footerbar__inner">
                <div className="footerbar__brand">
                    <span className="footerbar__mark">F</span>
                    <div className="footerbar__brandText">
                        <strong>Flower Shop</strong>
                        <span>Hoa dep cho sinh nhat, ky niem va nhung ngay can mot chut diu dang.</span>
                    </div>
                </div>

                <div className="footerbar__actions">
                    <a
                        className="footerbar__item footerbar__item--facebook"
                        href="https://www.facebook.com/nguyen.minh.thanh.369685"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <span className="footerbar__icon">f</span>
                        <span className="footerbar__text">Chat Facebook</span>
                    </a>

                    <a className="footerbar__item footerbar__item--phone" href="tel:0918567395">
                        <span className="footerbar__icon">☎</span>
                        <span className="footerbar__text">0918567395</span>
                    </a>
                </div>
            </div>
        </footer>
    );
}
