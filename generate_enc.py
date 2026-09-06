import os, base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# 鍵は最初に一度だけ生成し、以降はPython・JS両方で使い回す
# print(base64.b64encode(os.urandom(32)).decode())  # ← 生成用（一度実行して控える）

KEY_B64 = "vprfFpIV6x3Q2XFxZhURgpq0ADgil4WnZ16APa5RPTc="
KEY = base64.b64decode(KEY_B64)

def encrypt_file(src_path: str, dst_path: str):
    with open(src_path, "r", encoding="utf-8") as f:
        plaintext = f.read().encode("utf-8")

    nonce = os.urandom(12)
    ciphertext = AESGCM(KEY).encrypt(nonce, plaintext, None)

    # nonce(12byte) + ciphertext を連結して1本のbase64テキストにする
    payload = base64.b64encode(nonce + ciphertext).decode("ascii")

    with open(dst_path, "w", encoding="utf-8") as f:
        f.write(payload)

if __name__ == "__main__":
    encrypt_file("quiz01-data.txt", "quiz01-data.enc")
    encrypt_file("quiz03-data.txt", "quiz03-data.enc")