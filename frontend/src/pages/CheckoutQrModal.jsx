import { Modal, Typography } from "antd";

const { Text } = Typography;

export default function CheckoutQrModal({ open, onClose, qrUrl, amount, addInfo }) {
    return (
        <Modal
            open={open}          // antd v5
            visible={open}       // antd v4
            onCancel={onClose}
            footer={null}
            title="Quét QR để thanh toán"
        >
            <div style={{ textAlign: "center" }}>
                {qrUrl ? (
                    <img src={qrUrl} alt="VietQR" style={{ width: 280, maxWidth: "100%" }} />
                ) : (
                    <Text type="secondary">Đang tạo QR...</Text>
                )}

                <div style={{ marginTop: 12, textAlign: "left" }}>
                    <div><Text strong>Số tiền:</Text> {Number(amount).toLocaleString("vi-VN")} đ</div>
                    <div><Text strong>Nội dung:</Text> {addInfo}</div>
                </div>
            </div>
        </Modal>
    );
}