# タノキオ

似たような韓国語を絞り込んで覚えられるようにする学習ゲームです。

## 使い方

- Quiz01: ハングルを見て漢字を選ぶクイズ
  - [https://usop4.github.io/daneogieok/quiz01.html](https://usop4.github.io/daneogieok/quiz01.html)

- Quiz02: 漢字を見てハングルを選ぶ逆引きクイズ
  - [https://usop4.github.io/daneogieok/quiz02.html](https://usop4.github.io/daneogieok/quiz02.html)

- Quiz03: 韓国語の動詞（３文字以上）を見て意味を選ぶクイズ
  - [https://usop4.github.io/daneogieok/quiz03.html](https://usop4.github.io/daneogieok/quiz03.html)

- Quiz04: 日本語から韓国語の動詞（３文字以上）を選ぶクイズ
  - [https://usop4.github.io/daneogieok/quiz04.html](https://usop4.github.io/daneogieok/quiz04.html)

## テスト実行（最小構成）

VSCode のターミナルで実行します。

1. 依存関係をインストール

```bash
npm install
```

2. Playwright のブラウザ（Chromium）をインストール

```bash
npx playwright install chromium
```

3. スモークテストを実行

```bash
npm run test:e2e
```

4. データ整合性テストのみ実行する場合

```bash
npm run test:data
```

補足:
- ローカルでは `python3 -m http.server` を Playwright が自動起動します。
- 画面を見ながら実行したい場合は `npm run test:e2e:headed` を使います。
