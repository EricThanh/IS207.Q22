import "./FooterBar.css";

export default function FooterBar() {
    return (
        <div className="footerbar">
            <div className="footerbar__inner">
                <a
                    className="footerbar__item"
                    href="https://www.facebook.com/nguyen.minh.thanh.369685"
                    target="_blank"
                    rel="noreferrer"
                >
                    <span className="footerbar__icon">💬</span>
                    <span className="footerbar__text">Chat Facebook</span>
                </a>



                <a className="footerbar__item footerbar__hotline" href="tel:1900633045">
                    <span className="footerbar__icon">📞</span>
                    <span className="footerbar__text">0918567395</span>
                </a>
            </div>
        </div>
    );
}